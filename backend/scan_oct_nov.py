import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

import json
import datetime
import pandas as pd
import config
from data_engine.smartapi_client import smart_client
from data_engine.scrip_master import scrip_master
from data_engine.cache_manager import get_cached_candles
from resampler import resample_to_75m, resample_to_1d, resample_to_weekly, resample_to_monthly, filter_finalized_candles
from patterns.dhurandar import scan_dhurandar_patterns
from patterns.bollinger_bands import scan_bollinger_band_reversals
from patterns.rsi_ichimoku import scan_rsi_ichimoku_reversals
from patterns.tenkan_cross import scan_tenkan_crossover
from archive_manager import append_to_archive

def scan_oct_nov():
    spot_price = smart_client.get_spot_price()
    if spot_price <= 0:
        spot_price = 25350.0

    target_expiries = [
        datetime.date(2026, 10, 27),
        datetime.date(2026, 11, 23)
    ]

    contracts = scrip_master.get_otm_contracts(spot_price, target_expiries)
    print(f"Scanning {len(contracts)} OTM contracts for Oct and Nov 2026...")

    new_matches = []
    for i, contract in enumerate(contracts):
        # Fetch / check cached candles
        raw_df = get_cached_candles(contract["token"], interval="FIFTEEN_MINUTE", period_days=25, exchange=contract["exch_seg"])
        if raw_df.empty:
            continue

        ltp = float(raw_df['close'].iloc[-1])
        df_75m = filter_finalized_candles(resample_to_75m(raw_df), "75m")
        df_1d = filter_finalized_candles(resample_to_1d(raw_df), "1d")
        df_w = filter_finalized_candles(resample_to_weekly(df_1d), "weekly") if not df_1d.empty else pd.DataFrame()
        df_m = filter_finalized_candles(resample_to_monthly(df_1d), "monthly") if not df_1d.empty else pd.DataFrame()

        tf_map = {
            "75m": df_75m,
            "1d": df_1d,
            "weekly": df_w,
            "monthly": df_m
        }

        for tf_name, df_tf in tf_map.items():
            if df_tf.empty:
                continue

            contract_info = {
                "symbol": contract["symbol"],
                "token": contract["token"],
                "expiry": contract["expiry"].strftime("%Y-%m-%d"),
                "strike": contract["strike"],
                "option_type": contract["option_type"],
                "timeframe": tf_name
            }

            for d in scan_dhurandar_patterns(df_tf, ltp, timeframe=tf_name, proximity_threshold=config.PROXIMITY_THRESHOLD_PCT):
                new_matches.append({**contract_info, **d})

            for b in scan_bollinger_band_reversals(df_tf, ltp, timeframe=tf_name):
                new_matches.append({**contract_info, **b})

            for r in scan_rsi_ichimoku_reversals(df_tf, ltp, timeframe=tf_name):
                new_matches.append({**contract_info, **r})

            for t in scan_tenkan_crossover(df_tf, ltp, timeframe=tf_name):
                new_matches.append({**contract_info, **t})

    print(f"Found {len(new_matches)} matches in Oct and Nov expiries.")

    # Merge into latest_matches.json
    latest_file = config.DATA_DIR / 'latest_matches.json'
    if latest_file.exists():
        with open(latest_file, 'r') as f:
            data = json.load(f)
    else:
        data = {"matches": []}

    existing = data.get("matches", [])
    # Separate VIX and existing
    vix = [m for m in existing if m.get("option_type") == "VIX"]
    non_vix = [m for m in existing if m.get("option_type") != "VIX" and m.get("expiry") not in ["2026-10-27", "2026-11-23"]]

    combined = vix + new_matches + non_vix
    data["matches"] = combined
    data["spot_price"] = spot_price
    with open(latest_file, 'w') as f:
        json.dump(data, f, indent=2)

    append_to_archive(new_matches)
    print("Successfully merged Oct & Nov matches into latest_matches.json and archive!")

if __name__ == "__main__":
    scan_oct_nov()
