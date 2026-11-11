import os
import json
import datetime
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

import config
from data_engine.smartapi_client import smart_client

# In-memory caches for fast sub-millisecond responses
_scrip_lookup_cache: Optional[Dict[str, Dict[str, Any]]] = None
_last_loaded_mtime: float = 0.0
_cached_raw_history: Optional[Dict[str, Any]] = None
_history_source_info: Dict[str, Any] = {}

def get_scrip_lookup() -> Dict[str, Dict[str, Any]]:
    """Caches token, symbol, and lotsize lookup for NIFTY options from master_scrip.csv."""
    global _scrip_lookup_cache
    if _scrip_lookup_cache is not None:
        return _scrip_lookup_cache

    lookup = {}
    master_path = config.MASTER_SCRIP_PATH
    if master_path.exists():
        try:
            df = pd.read_csv(master_path)
            nifty_df = df[df['name'] == 'NIFTY']
            for _, row in nifty_df.iterrows():
                sym = str(row['symbol'])
                opt_type = 'CE' if sym.endswith('CE') else ('PE' if sym.endswith('PE') else '')
                if not opt_type:
                    continue
                exp = str(row['expiry'])
                raw_strike = float(row['strike'])
                strike_val = int(raw_strike / 100) if raw_strike > 10000 else int(raw_strike)
                key = f"{exp}_{opt_type}_{strike_val}"
                lookup[key] = {
                    "symbol": sym,
                    "token": str(row['token']),
                    "lot_size": int(row['lotsize']) if pd.notna(row['lotsize']) else 65
                }
        except Exception as e:
            print(f"[NewStrikesManager] Error reading master_scrip.csv: {e}")

    _scrip_lookup_cache = lookup
    return _scrip_lookup_cache


def load_raw_history(force_external_reload: bool = False) -> Dict[str, Any]:
    """
    Loads strike_history.json from the external daily scanner directory.
    Maintains an automatic local backup in backend/data/strike_history.json.
    """
    global _last_loaded_mtime, _cached_raw_history, _history_source_info

    ext_path = getattr(config, 'STRIKE_HISTORY_EXTERNAL_PATH', None)
    local_path = getattr(config, 'STRIKE_HISTORY_LOCAL_PATH', config.DATA_DIR / 'strike_history.json')

    source_path = None
    source_type = "none"

    if ext_path and ext_path.exists():
        source_path = ext_path
        source_type = "external_scanner"
    elif local_path and local_path.exists():
        source_path = local_path
        source_type = "local_backup"

    if not source_path:
        return {"first_seen": {}, "snapshots": {}, "created_date": "", "last_scanned": ""}

    current_mtime = source_path.stat().st_mtime
    if not force_external_reload and _cached_raw_history is not None and current_mtime == _last_loaded_mtime:
        return _cached_raw_history

    try:
        with open(source_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        # If successfully loaded from external, update the local backup
        if source_type == "external_scanner" and local_path:
            try:
                local_path.parent.mkdir(parents=True, exist_ok=True)
                with open(local_path, "w", encoding="utf-8") as f_local:
                    json.dump(data, f_local, indent=2)
            except Exception as e_copy:
                print(f"[NewStrikesManager] Notice: Could not update local backup: {e_copy}")

        _cached_raw_history = data
        _last_loaded_mtime = current_mtime
        _history_source_info = {
            "source": source_type,
            "path": str(source_path),
            "mtime": current_mtime,
            "mtime_formatted": datetime.datetime.fromtimestamp(current_mtime).strftime("%Y-%m-%d %H:%M:%S")
        }
        return data

    except Exception as e:
        print(f"[NewStrikesManager] Error reading strike history from {source_path}: {e}")
        # Fallback to local if external failed
        if source_type == "external_scanner" and local_path and local_path.exists():
            try:
                with open(local_path, "r", encoding="utf-8") as f_loc:
                    data = json.load(f_loc)
                _cached_raw_history = data
                _history_source_info = {
                    "source": "local_backup_fallback",
                    "path": str(local_path),
                    "mtime": local_path.stat().st_mtime,
                    "mtime_formatted": datetime.datetime.fromtimestamp(local_path.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
                }
                return data
            except Exception:
                pass
        return {"first_seen": {}, "snapshots": {}, "created_date": "", "last_scanned": ""}


def scan_and_update_new_strikes(force_master_download: bool = False) -> Dict[str, Any]:
    """
    Natively scans Angel One master_scrip for NIFTY options across monthly expiries.
    Detects newly added strikes, updates first_seen_map, records snapshots,
    and updates both local and external strike_history.json.
    """
    global _scrip_lookup_cache, _cached_raw_history, _last_loaded_mtime, _history_source_info

    today_str = datetime.date.today().isoformat()
    current_date = datetime.date.today()

    # If requested or master_scrip is missing, refresh master from Angel One
    master_path = config.MASTER_SCRIP_PATH
    if force_master_download or not master_path.exists():
        try:
            from data_engine.scrip_master import scrip_master
            scrip_master.refresh_scrip_master(force=True)
        except Exception as e:
            print(f"[NewStrikesManager] Notice: Could not force refresh master: {e}")

    # Load current strike history
    history = load_raw_history(force_external_reload=True)
    first_seen_map = dict(history.get("first_seen", {}))
    snapshots = dict(history.get("snapshots", {}))
    created_date = history.get("created_date", today_str)

    if not master_path.exists():
        return get_new_strikes_data()

    try:
        df = pd.read_csv(master_path, dtype=str)
        nifty_opts = df[(df['name'] == 'NIFTY') & (df['instrumenttype'].isin(['OPTIDX', 'OPTSTK']))]

        # Parse expiry dates to determine true monthly expiries (last expiry of each month)
        all_exp_dates = set()
        for _, row in nifty_opts.iterrows():
            exp_str = str(row['expiry'])
            try:
                d = datetime.datetime.strptime(exp_str, "%d%b%Y").date()
                all_exp_dates.add((d, exp_str))
            except Exception:
                pass

        # Group by (year, month) to find monthly expiry (max date in month)
        from collections import defaultdict
        month_groups = defaultdict(list)
        for d, exp_str in all_exp_dates:
            month_groups[(d.year, d.month)].append((d, exp_str))

        monthly_exp_strings = set()
        for ym, dates in month_groups.items():
            max_d, max_exp_str = max(dates, key=lambda x: x[0])
            monthly_exp_strings.add(max_exp_str)

        # Track strikes
        today_snapshot_expiries = defaultdict(lambda: {"CE": [], "PE": []})
        new_strikes_discovered = 0

        for _, row in nifty_opts.iterrows():
            exp_str = str(row['expiry'])
            if exp_str not in monthly_exp_strings:
                continue
            sym = str(row['symbol'])
            opt_type = 'CE' if sym.endswith('CE') else ('PE' if sym.endswith('PE') else '')
            if not opt_type:
                continue
            raw_strike = float(row['strike'])
            strike_val = int(raw_strike / 100) if raw_strike > 10000 else int(raw_strike)

            key = f"{exp_str}_{opt_type}_{strike_val}"
            today_snapshot_expiries[exp_str][opt_type].append(strike_val)

            if key not in first_seen_map:
                first_seen_map[key] = today_str
                new_strikes_discovered += 1

        # Sort strikes in snapshot
        snapshot_today = {}
        for exp_k, opts in today_snapshot_expiries.items():
            snapshot_today[exp_k] = {
                "CE": sorted(list(set(opts["CE"]))),
                "PE": sorted(list(set(opts["PE"])))
            }
        snapshots[today_str] = snapshot_today

        updated_history = {
            "created_date": created_date,
            "last_scanned": today_str,
            "first_seen": first_seen_map,
            "snapshots": snapshots
        }

        # Save to local_path
        local_path = getattr(config, 'STRIKE_HISTORY_LOCAL_PATH', config.DATA_DIR / 'strike_history.json')
        if local_path:
            local_path.parent.mkdir(parents=True, exist_ok=True)
            with open(local_path, "w", encoding="utf-8") as f:
                json.dump(updated_history, f, indent=2)

        # Save to ext_path if it exists
        ext_path = getattr(config, 'STRIKE_HISTORY_EXTERNAL_PATH', None)
        if ext_path and ext_path.exists():
            try:
                with open(ext_path, "w", encoding="utf-8") as f:
                    json.dump(updated_history, f, indent=2)
            except Exception as e_ext:
                print(f"[NewStrikesManager] Notice: Could not sync to external scanner path: {e_ext}")

        # Invalidate caches
        _scrip_lookup_cache = None
        _cached_raw_history = updated_history
        _last_loaded_mtime = (local_path.stat().st_mtime if local_path and local_path.exists() else 0.0)
        _history_source_info = {
            "source": "native_screener_scanner",
            "path": str(local_path),
            "mtime": _last_loaded_mtime,
            "mtime_formatted": datetime.datetime.fromtimestamp(_last_loaded_mtime).strftime("%Y-%m-%d %H:%M:%S")
        }
        print(f"[NewStrikesManager] Scan complete. Discovered {new_strikes_discovered} new strikes for {today_str}.")

    except Exception as e:
        print(f"[NewStrikesManager] Error during native strike scan: {e}")

    return get_new_strikes_data()


def get_new_strikes_data(
    lookback: str = "today",
    expiry: str = "all",
    option_type: str = "all",
    moneyness: str = "all",
    search: str = "",
    spot_price_override: Optional[float] = None
) -> Dict[str, Any]:
    """
    Extracts and filters newly added option strikes for months other than the current month.
    Current month expiries are strictly dropped as per user specification.
    """
    current_date = datetime.date.today()
    today_str = current_date.isoformat()

    # Determine spot price and ATM strike
    spot_price = spot_price_override if (spot_price_override and spot_price_override > 0) else smart_client.get_spot_price()
    if spot_price <= 0:
        spot_price = getattr(config, 'FALLBACK_SPOT_PRICE', 25000.0)
    true_atm = round(spot_price / 50.0) * 50

    raw_history = load_raw_history()

    # Auto-scan: If today's date has not been scanned yet, trigger scan automatically
    if raw_history.get("last_scanned") != today_str:
        scan_and_update_new_strikes(force_master_download=False)
        raw_history = load_raw_history()

    first_seen_map = raw_history.get("first_seen", {})
    baseline_date = raw_history.get("created_date", "2026-09-04")
    last_scanned = raw_history.get("last_scanned", "")
    scrip_lookup = get_scrip_lookup()

    all_far_new_items: List[Dict[str, Any]] = []
    expiry_groups: Dict[str, Dict[str, Any]] = {}

    for key, seen_date_str in first_seen_map.items():
        parts = key.split('_')
        if len(parts) < 3:
            continue
        exp_code, opt_type, strike_val_str = parts[0], parts[1], parts[2]
        try:
            strike_val = int(strike_val_str)
        except ValueError:
            continue

        try:
            exp_date = datetime.datetime.strptime(exp_code, "%d%b%Y").date()
        except Exception:
            continue

        # CRITICAL USER RULE: DROP CURRENT MONTH
        # Only retain months other than the current month
        if (exp_date.year, exp_date.month) <= (current_date.year, current_date.month):
            continue

        # Filter strictly for incrementally NEW strikes (post initial baseline)
        if seen_date_str == baseline_date:
            continue

        try:
            seen_date_obj = datetime.date.fromisoformat(seen_date_str)
            days_ago = (current_date - seen_date_obj).days
        except Exception:
            days_ago = 0

        diff_from_atm = strike_val - true_atm
        abs_diff = abs(diff_from_atm)
        diff_pct = round(((strike_val - spot_price) / spot_price) * 100, 2)

        # Moneyness calculation
        if opt_type == 'CE':
            strike_moneyness = "OTM" if strike_val > spot_price else ("ATM" if abs_diff <= 100 else "ITM")
        else:
            strike_moneyness = "OTM" if strike_val < spot_price else ("ATM" if abs_diff <= 100 else "ITM")

        days_to_exp = (exp_date - current_date).days
        formatted_exp = exp_date.strftime("%d %b %Y")
        month_year = exp_date.strftime("%B %Y")

        # Symbol & token lookup or fallback synthesis
        lookup_info = scrip_lookup.get(key, {})
        symbol = lookup_info.get("symbol") or f"NIFTY{exp_date.strftime('%d%b%y').upper()}{strike_val}{opt_type}"
        token = lookup_info.get("token") or ""
        lot_size = lookup_info.get("lot_size") or 65

        item = {
            "key": key,
            "expiry": formatted_exp,
            "expiry_code": exp_code,
            "expiry_date": exp_date.isoformat(),
            "month_year": month_year,
            "days_to_exp": days_to_exp,
            "type": opt_type,
            "strike": strike_val,
            "symbol": symbol,
            "token": token,
            "lot_size": lot_size,
            "diff": diff_from_atm,
            "abs_diff": abs_diff,
            "diff_pct": diff_pct,
            "moneyness": strike_moneyness,
            "first_seen": seen_date_str,
            "days_ago": days_ago
        }

        all_far_new_items.append(item)

        # Track expiry groups for dropdown
        if exp_code not in expiry_groups:
            expiry_groups[exp_code] = {
                "code": exp_code,
                "label": f"{formatted_exp} ({month_year})",
                "formatted": formatted_exp,
                "month_year": month_year,
                "days_to_exp": days_to_exp,
                "date": exp_date.isoformat(),
                "total_new_strikes": 0,
                "all_time_strikes": 0
            }
        expiry_groups[exp_code]["all_time_strikes"] += 1

    # Calculate dynamic count per expiry matching the active lookback window
    from collections import defaultdict
    window_counts_by_exp = defaultdict(int)
    for x in all_far_new_items:
        match_lookback = False
        if lookback == "today" and x["days_ago"] == 0:
            match_lookback = True
        elif lookback == "1d" and x["days_ago"] <= 1:
            match_lookback = True
        elif lookback == "3d" and x["days_ago"] <= 3:
            match_lookback = True
        elif lookback == "7d" and x["days_ago"] <= 7:
            match_lookback = True
        elif lookback == "30d" and x["days_ago"] <= 30:
            match_lookback = True
        elif lookback == "all":
            match_lookback = True
        
        if match_lookback:
            window_counts_by_exp[x["expiry_code"]] += 1

    for exp_code, exp_data in expiry_groups.items():
        exp_data["total_new_strikes"] = window_counts_by_exp.get(exp_code, 0)

    # Sort expiries chronologically
    sorted_expiries = sorted(expiry_groups.values(), key=lambda x: x["date"])

    # Global KPI counts across all far-month additions
    today_count = sum(1 for x in all_far_new_items if x["days_ago"] == 0)
    last_1d_count = sum(1 for x in all_far_new_items if x["days_ago"] <= 1)
    last_3d_count = sum(1 for x in all_far_new_items if x["days_ago"] <= 3)
    last_7d_count = sum(1 for x in all_far_new_items if x["days_ago"] <= 7)
    last_30d_count = sum(1 for x in all_far_new_items if x["days_ago"] <= 30)
    total_far_new = len(all_far_new_items)

    summary = {
        "spot_price": spot_price,
        "atm_strike": true_atm,
        "today_count": today_count,
        "last_1d_count": last_1d_count,
        "last_3d_count": last_3d_count,
        "last_7d_count": last_7d_count,
        "last_30d_count": last_30d_count,
        "total_far_new": total_far_new,
        "far_expiries_count": len(sorted_expiries),
        "last_scanned": last_scanned,
        "backup_source": _history_source_info.get("source", "unknown"),
        "backup_last_modified": _history_source_info.get("mtime_formatted", ""),
        "current_month_dropped": current_date.strftime("%B %Y")
    }

    # Apply filters
    filtered = all_far_new_items

    # 1. Lookback window filter
    if lookback == "today":
        filtered = [x for x in filtered if x["days_ago"] == 0]
    elif lookback == "1d":
        filtered = [x for x in filtered if x["days_ago"] <= 1]
    elif lookback == "3d":
        filtered = [x for x in filtered if x["days_ago"] <= 3]
    elif lookback == "7d":
        filtered = [x for x in filtered if x["days_ago"] <= 7]
    elif lookback == "30d":
        filtered = [x for x in filtered if x["days_ago"] <= 30]
    # "all" does not filter by days_ago

    # 2. Expiry filter
    if expiry and expiry.lower() != "all":
        filtered = [x for x in filtered if x["expiry_code"] == expiry]

    # 3. Option type filter
    if option_type and option_type.upper() in ("CE", "PE"):
        filtered = [x for x in filtered if x["type"] == option_type.upper()]

    # 4. Moneyness filter
    if moneyness == "OTM":
        filtered = [x for x in filtered if x["moneyness"] == "OTM"]
    elif moneyness == "FAR_OTM":
        filtered = [x for x in filtered if x["moneyness"] == "OTM" and x["abs_diff"] >= 1000]

    # 5. Search text filter
    if search:
        search_lower = search.strip().lower()
        filtered = [
            x for x in filtered
            if search_lower in str(x["strike"]) or search_lower in x["symbol"].lower() or search_lower in x["expiry"].lower()
        ]

    # Sort results: Newest first (days_ago ascending), then by expiry date, then by strike
    filtered.sort(key=lambda x: (x["days_ago"], x["expiry_date"], x["strike"]))

    return {
        "summary": summary,
        "expiries": sorted_expiries,
        "strikes": filtered,
        "total_filtered": len(filtered)
    }


def sync_from_external_backup() -> Dict[str, Any]:
    """Force reloads the external strike history file and updates local cache."""
    return scan_and_update_new_strikes(force_master_download=True)

