import os
import datetime
import pandas as pd
from typing import List, Dict, Any, Tuple, Optional
from collections import defaultdict
import config

class ScripMaster:
    def __init__(self):
        self.scrip_master: Dict[str, dict] = {} # Keyed by symbol
        self.token_master: Dict[str, dict] = {} # Keyed by token
        self._load_master()
        
        # Check if master_scrip.csv is missing or older than 24 hours, auto-refresh in background
        if not config.MASTER_SCRIP_PATH.exists() or (datetime.datetime.now() - datetime.datetime.fromtimestamp(config.MASTER_SCRIP_PATH.stat().st_mtime)).total_seconds() > 86400:
            import threading
            threading.Thread(target=self.refresh_scrip_master, daemon=True).start()

    def _load_master(self):
        if not config.MASTER_SCRIP_PATH.exists():
            print("[ScripMaster] master_scrip.csv not found.")
            return

        try:
            df = pd.read_csv(config.MASTER_SCRIP_PATH, dtype=str)
            df.dropna(subset=['symbol', 'token'], inplace=True)
            df['symbol'] = df['symbol'].str.strip()
            df['token'] = df['token'].str.strip()
            
            # Filter for NIFTY options
            nifty_opts = df[(df['name'] == config.UNDERLYING) & (df['instrumenttype'].isin(['OPTIDX', 'OPTSTK']))]
            self.scrip_master = nifty_opts.set_index('symbol').to_dict('index')
            self.token_master = nifty_opts.set_index('token').to_dict('index')
            print(f"[ScripMaster] Loaded {len(self.scrip_master)} NIFTY option instruments into memory.")
        except Exception as e:
            print(f"[ScripMaster] Error loading master_scrip.csv: {e}")

    def get_token_by_symbol(self, symbol: str) -> Optional[str]:
        """Resolves symbol to Angel One token."""
        if symbol == config.INDIA_VIX_SYMBOL or symbol == "INDEX":
            return config.INDIA_VIX_TOKEN
        item = self.scrip_master.get(symbol)
        return item.get("token") if item else None

    def refresh_scrip_master(self, force: bool = False) -> bool:
        """
        Downloads the latest OpenAPIScripMaster.json from Angel One,
        filters for NIFTY options, and saves to master_scrip.csv.
        """
        now = datetime.datetime.now()
        if config.MASTER_SCRIP_PATH.exists() and not force:
            mtime = datetime.datetime.fromtimestamp(config.MASTER_SCRIP_PATH.stat().st_mtime)
            if (now - mtime).total_seconds() < 86400 and len(self.scrip_master) > 0:
                return False

        print("[ScripMaster] Fetching latest Angel One OpenAPIScripMaster to update active expiries...")
        try:
            import urllib.request
            import json
            url = "https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as res:
                data = json.loads(res.read().decode("utf-8"))

            nifty_items = [
                x for x in data
                if x.get("name") == config.UNDERLYING and x.get("instrumenttype") in ["OPTIDX", "OPTSTK"]
            ]
            if nifty_items:
                new_df = pd.DataFrame(nifty_items)
                if config.MASTER_SCRIP_PATH.exists():
                    try:
                        existing_df = pd.read_csv(config.MASTER_SCRIP_PATH, dtype=str)
                        df = pd.concat([existing_df, new_df], ignore_index=True)
                        df.drop_duplicates(subset=['symbol', 'token'], keep='last', inplace=True)
                    except Exception as e:
                        print(f"[ScripMaster] Warning merging existing master scrip: {e}")
                        df = new_df
                else:
                    df = new_df

                df.to_csv(config.MASTER_SCRIP_PATH, index=False)
                self._load_master()
                print(f"[ScripMaster] Successfully updated accretive scrip master with {len(nifty_items)} fresh NIFTY contracts (total preserved: {len(self.scrip_master)}).")
                return True
        except Exception as e:
            print(f"[ScripMaster] Failed to refresh scrip master: {e}")
        return False

    def get_valid_monthly_expiries(self) -> List[datetime.date]:
        """
        Extracts all month-end expiries from current month through the end of next year.
        E.g. in Sep 2026 -> returns Sep 2026, Oct 2026, ... up to Dec 2027.
        """
        today = datetime.date.today()
        # Max horizon: End of next calendar year (December 31st)
        max_horizon = datetime.date(today.year + 1, 12, 31)

        unique_expiries = set()
        for symbol, data in self.scrip_master.items():
            exp_str = data.get('expiry')
            if exp_str:
                try:
                    exp_d = pd.to_datetime(exp_str).date()
                    if today <= exp_d <= max_horizon:
                        unique_expiries.add(exp_d)
                except Exception:
                    pass

        # Group by (year, month) and take the maximum date (month-end expiry)
        month_groups = defaultdict(list)
        for d in sorted(list(unique_expiries)):
            month_groups[(d.year, d.month)].append(d)

        monthly_expiries = []
        for y_m in sorted(month_groups.keys()):
            # Month-end is the maximum expiry date in that month
            monthly_expiries.append(max(month_groups[y_m]))

        return sorted(monthly_expiries)

    def get_otm_contracts(self, spot_price: float, target_expiries: List[datetime.date]) -> List[Dict[str, Any]]:
        """
        Extracts OUT-OF-THE-MONEY (OTM) options contracts only!
        - Calls: Strike > Spot (excludes ATM and ITM)
        - Puts: Strike < Spot (excludes ATM and ITM)
        - Near months: Steps of 50/100 within ~25 strikes
        - Far months: Steps of 500
        """
        if spot_price <= 0:
            return []

        atm_strike = round(spot_price / 50.0) * 50
        otm_contracts = []

        today = datetime.date.today()

        for symbol, data in self.scrip_master.items():
            exp_str = data.get('expiry')
            if not exp_str:
                continue

            try:
                exp_d = pd.to_datetime(exp_str).date()
                if exp_d not in target_expiries:
                    continue

                raw_strike = float(data.get('strike', 0))
                # Angel One strikes in master_scrip are multiplied by 100
                strike = int(raw_strike / 100) if raw_strike >= 10000 else int(raw_strike)
                op_type = "CE" if symbol.endswith("CE") else "PE"

                # STRICT OTM CHECK
                # For Call: Strike must be strictly greater than spot
                # For Put: Strike must be strictly less than spot
                is_otm = False
                if op_type == "CE" and strike > spot_price:
                    is_otm = True
                elif op_type == "PE" and strike < spot_price:
                    is_otm = True

                if not is_otm:
                    continue

                # Is near month (within 60 days)?
                is_near = (exp_d - today).days <= 60
                
                # Strike filters
                if is_near:
                    # Near month: limit to 25 strikes away from ATM
                    if abs(strike - atm_strike) > (config.NEAR_MONTH_OTM_STRIKES_COUNT * 50):
                        continue
                else:
                    # Far month: only round strikes (multiples of 500)
                    if strike % config.FAR_MONTH_STRIKE_STEP != 0:
                        continue

                otm_contracts.append({
                    "symbol": symbol,
                    "token": data.get("token"),
                    "exch_seg": data.get("exch_seg", "NFO"),
                    "expiry": exp_d,
                    "strike": strike,
                    "option_type": op_type,
                    "distance_from_spot": round(abs(strike - spot_price), 1)
                })

            except Exception:
                pass

        # Sort by expiry ascending, then strike distance
        otm_contracts.sort(key=lambda x: (x['expiry'], x['distance_from_spot']))
        return otm_contracts

scrip_master = ScripMaster()
