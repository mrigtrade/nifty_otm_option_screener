import os
import time
import datetime
import pandas as pd
from typing import Optional
import config
from data_engine.smartapi_client import smart_client
from resampler import resample_to_75m, resample_to_1d, resample_to_weekly, resample_to_monthly

# Memory cache to avoid repeated delta requests for illiquid strikes within 15 minutes
_token_last_checked: dict = {}

def get_store_75m_count(token: str) -> int:
    """Returns the total number of 75M bars currently in the accretive store."""
    file_75m = config.CACHE_DIR / f"{token}_75M.csv"
    if not file_75m.exists():
        return 0
    try:
        with open(file_75m, "r", encoding="utf-8", errors="ignore") as f:
            lines = [l for l in f if l.strip()]
        return max(0, len(lines) - 1)
    except Exception:
        return 0


def _update_accretive_stores(token: str, df_15m: pd.DataFrame) -> int:
    """
    Takes 15-minute intraday bars, resamples them to 75M and 1D,
    and merges them accretively into persistent {token}_75M.csv and {token}_1D.csv.
    These stores are permanent and NEVER truncated.
    Returns the total number of 75M bars in the store.
    """
    total_75m = 0
    if df_15m.empty:
        return get_store_75m_count(token)

    # 1. Accretive 75M Store
    try:
        new_75m = resample_to_75m(df_15m)
        file_75m = config.CACHE_DIR / f"{token}_75M.csv"
        if not new_75m.empty:
            if file_75m.exists():
                old_75m = pd.read_csv(file_75m, index_col=0, parse_dates=[0])
                if old_75m.index.tz is None:
                    old_75m.index = old_75m.index.tz_localize("Asia/Kolkata")
                else:
                    old_75m.index = old_75m.index.tz_convert("Asia/Kolkata")
                merged_75m = pd.concat([old_75m, new_75m])
                merged_75m = merged_75m[~merged_75m.index.duplicated(keep='last')].sort_index()
            else:
                merged_75m = new_75m
            merged_75m.to_csv(file_75m, index_label='timestamp')
            total_75m = len(merged_75m)
        else:
            total_75m = get_store_75m_count(token)
    except Exception as e:
        print(f"[CacheManager] Warning updating 75M accretive store for {token}: {e}")
        total_75m = get_store_75m_count(token)

    # 2. Accretive 1D Store
    try:
        new_1d = resample_to_1d(df_15m)
        if not new_1d.empty:
            file_1d = config.CACHE_DIR / f"{token}_1D.csv"
            if file_1d.exists():
                old_1d = pd.read_csv(file_1d, index_col=0, parse_dates=[0])
                if old_1d.index.tz is None:
                    old_1d.index = old_1d.index.tz_localize("Asia/Kolkata")
                else:
                    old_1d.index = old_1d.index.tz_convert("Asia/Kolkata")
                merged_1d = pd.concat([old_1d, new_1d])
                merged_1d = merged_1d[~merged_1d.index.duplicated(keep='last')].sort_index()
            else:
                merged_1d = new_1d
            merged_1d.to_csv(file_1d, index_label='timestamp')
    except Exception as e:
        print(f"[CacheManager] Warning updating 1D accretive store for {token}: {e}")

    return total_75m


def get_cached_candles(token: str, interval: str = "FIFTEEN_MINUTE", period_days: int = 35, exchange: str = "NFO", force_fetch: bool = False, return_new_count: bool = False):
    """
    Retrieves cached 15-minute candles, fetches missing delta bars if force_fetch=True,
    syncs them into the accretive 75M and 1D stores, and caps the raw 15m file to a rolling buffer.
    If return_new_count=True, returns tuple: (DataFrame, int_new_bars_count, int_total_75m_bars).
    """
    cache_file = config.CACHE_DIR / f"{token}_{interval}.csv"
    now_tz = pd.Timestamp.now(tz="Asia/Kolkata")
    now_dt = datetime.datetime.now()
    cutoff = now_tz - datetime.timedelta(days=period_days)

    existing_df = pd.DataFrame()
    from_date = cutoff
    new_count = 0

    if cache_file.exists():
        try:
            existing_df = pd.read_csv(cache_file, parse_dates=['timestamp'], index_col='timestamp')
            if not existing_df.empty:
                if existing_df.index.tz is None:
                    existing_df.index = existing_df.index.tz_localize("Asia/Kolkata")
                else:
                    existing_df.index = existing_df.index.tz_convert("Asia/Kolkata")

                # If caller did not explicitly request remote fetch, serve existing cache immediately
                if not force_fetch:
                    return (existing_df, 0, get_store_75m_count(token)) if return_new_count else existing_df

                last_ts = existing_df.index.max()
                first_ts = existing_df.index.min()
                from_date = last_ts + datetime.timedelta(minutes=1)

                # Only backfill older history for index benchmarks (like India VIX)
                is_index = (str(token) == str(config.INDIA_VIX_TOKEN) or exchange == "NSE")
                if is_index and first_ts > (cutoff + datetime.timedelta(days=2)):
                    from_date = cutoff

                # If cache is fresh up to current time
                if from_date >= now_tz:
                    return (existing_df, 0, get_store_75m_count(token)) if return_new_count else existing_df

                # Avoid duplicate network checks within 30 seconds if already checked
                if token in _token_last_checked and (now_dt - _token_last_checked[token]).total_seconds() < 30:
                    return (existing_df, 0, get_store_75m_count(token)) if return_new_count else existing_df
            else:
                if not force_fetch:
                    return (pd.DataFrame(), 0, 0) if return_new_count else pd.DataFrame()
        except Exception:
            from_date = cutoff

    # Fetch missing delta only when explicitly requested or required
    if force_fetch and smart_client.is_connected and from_date < now_tz:
        _token_last_checked[token] = now_dt
        new_df = smart_client.fetch_candle_data(token, exchange, interval, from_date, now_tz)
        if not new_df.empty:
            new_count = len(new_df)
            if not existing_df.empty:
                combined = pd.concat([existing_df, new_df])
                combined = combined[~combined.index.duplicated(keep='last')].sort_index()
            else:
                combined = new_df

            # Automatically update permanent accretive 75M and 1D stores
            total_75m = _update_accretive_stores(token, combined)

            # Cap 15m raw storage to rolling buffer (default 35 days) to avoid disk bloat
            buffer_cutoff = now_tz - datetime.timedelta(days=max(period_days, 35))
            pruned_15m = combined[combined.index >= buffer_cutoff]
            pruned_15m.to_csv(cache_file)
            return (pruned_15m, new_count, total_75m) if return_new_count else pruned_15m
        else:
            if cache_file.exists():
                try:
                    os.utime(cache_file, None)
                except Exception:
                    pass
            else:
                try:
                    with open(cache_file, "w") as f:
                        f.write("timestamp,open,high,low,close,volume\n")
                except Exception:
                    pass

    if not existing_df.empty:
        file_1d = config.CACHE_DIR / f"{token}_1D.csv"
        if not file_1d.exists():
            _update_accretive_stores(token, existing_df)
        return (existing_df, new_count, get_store_75m_count(token)) if return_new_count else existing_df

    return (pd.DataFrame(), 0, 0) if return_new_count else pd.DataFrame()


def get_accretive_candles(token: str, timeframe: str = "1d", exchange: str = "NFO", allow_network: bool = False) -> pd.DataFrame:
    """
    Returns complete continuous historical candles from permanent accretive storage.
    - 75m: loaded from {token}_75M.csv
    - 1d: loaded from {token}_1D.csv
    - weekly: derived directly from 1d store
    - monthly: derived directly from 1d store
    Does NOT trigger mass API calls unless allow_network=True and stores are missing.
    """
    timeframe = timeframe.lower()
    file_target = config.CACHE_DIR / (f"{token}_75M.csv" if timeframe == "75m" else f"{token}_1D.csv")

    # 1. Check if accretive store already exists
    if not file_target.exists():
        # Check if 15m raw cache exists locally to construct accretive store instantly without network
        cache_15m = config.CACHE_DIR / f"{token}_FIFTEEN_MINUTE.csv"
        if cache_15m.exists():
            try:
                df_15m = pd.read_csv(cache_15m, parse_dates=['timestamp'], index_col='timestamp')
                if not df_15m.empty:
                    if df_15m.index.tz is None:
                        df_15m.index = df_15m.index.tz_localize("Asia/Kolkata")
                    else:
                        df_15m.index = df_15m.index.tz_convert("Asia/Kolkata")
                    _update_accretive_stores(token, df_15m)
            except Exception:
                pass

        # If still missing and caller permits network access (e.g. for VIX or single strike chart view)
        if not file_target.exists() and allow_network:
            get_cached_candles(token, exchange=exchange, force_fetch=True)

    # 2. Read from persistent accretive store
    if file_target.exists():
        try:
            df = pd.read_csv(file_target, index_col=0, parse_dates=[0])
            if not df.empty:
                if df.index.tz is None:
                    df.index = df.index.tz_localize("Asia/Kolkata")
                else:
                    df.index = df.index.tz_convert("Asia/Kolkata")
                
                if timeframe in ["1d", "75m"]:
                    return df
                elif timeframe == "weekly":
                    return resample_to_weekly(df)
                elif timeframe == "monthly":
                    return resample_to_monthly(df)
        except Exception as e:
            print(f"[CacheManager] Error reading accretive store {file_target}: {e}")

    # Fallback to local 15m file if available without network
    cache_15m = config.CACHE_DIR / f"{token}_FIFTEEN_MINUTE.csv"
    if cache_15m.exists():
        try:
            raw = pd.read_csv(cache_15m, parse_dates=['timestamp'], index_col='timestamp')
            if not raw.empty:
                if raw.index.tz is None:
                    raw.index = raw.index.tz_localize("Asia/Kolkata")
                else:
                    raw.index = raw.index.tz_convert("Asia/Kolkata")
                if timeframe == "75m":
                    return resample_to_75m(raw)
                elif timeframe == "1d":
                    return resample_to_1d(raw)
                elif timeframe == "weekly":
                    return resample_to_weekly(resample_to_1d(raw))
                else:
                    return resample_to_monthly(resample_to_1d(raw))
        except Exception:
            pass

    return pd.DataFrame()


def get_expected_latest_75m_candle(now: pd.Timestamp) -> Optional[datetime.time]:
    """
    Returns the start time of the most recent completed 75m candle today:
      - 09:15-10:30 candle (completes at 10:30) -> start time 09:15
      - 10:30-11:45 candle (completes at 11:45) -> start time 10:30
      - 11:45-13:00 candle (completes at 13:00) -> start time 11:45
      - 13:00-14:15 candle (completes at 14:15) -> start time 13:00
      - 14:15-15:30 candle (completes at 15:30) -> start time 14:15
    """
    t = now.time()
    if t >= datetime.time(15, 30):
        return datetime.time(14, 15)
    elif t >= datetime.time(14, 15):
        return datetime.time(13, 0)
    elif t >= datetime.time(13, 0):
        return datetime.time(11, 45)
    elif t >= datetime.time(11, 45):
        return datetime.time(10, 30)
    elif t >= datetime.time(10, 30):
        return datetime.time(9, 15)
    return None


def sync_active_contracts(contracts: list, force: bool = False, progress_callback: Optional[callable] = None) -> dict:
    """
    Synchronizes delta candles for monitored contracts into permanent accretive stores.
    Called at 75m candle session closes (10:30, 11:45, 13:00, 14:15, 15:30) and EOD.
    Paced at 1.0s with adaptive backoff retries on rate limits.
    Prioritizes liquid near-month contracts (current and next month), prints transparent terminal progress.
    """
    start_time = time.time()
    now_tz = pd.Timestamp.now(tz="Asia/Kolkata")
    expected_candle = get_expected_latest_75m_candle(now_tz)
    target_desc = expected_candle.strftime("%H:%M") if expected_candle else "pre-market/opening"

    # Separate India VIX and option contracts
    vix_contracts = [c for c in contracts if str(c.get("token")) == str(config.INDIA_VIX_TOKEN)]
    option_contracts = [c for c in contracts if str(c.get("token")) != str(config.INDIA_VIX_TOKEN)]

    # Prioritize ordering: Current Month & Next Month liquid contracts first, followed by far-month step-500 strikes
    expiries = sorted(list(set(c["expiry"] for c in option_contracts if isinstance(c.get("expiry"), datetime.date))))
    near_expiries = set(expiries[:2]) if len(expiries) >= 2 else set(expiries)

    near_month_contracts = [c for c in option_contracts if c.get("expiry") in near_expiries]
    far_month_contracts = [c for c in option_contracts if c.get("expiry") not in near_expiries]

    # Sort near-month contracts by expiry date, then strike
    near_month_contracts.sort(key=lambda c: (c.get("expiry"), c.get("strike", 0)))
    far_month_contracts.sort(key=lambda c: (c.get("expiry"), c.get("strike", 0)))

    ordered_contracts = vix_contracts + near_month_contracts + far_month_contracts
    total = len(ordered_contracts)

    if not smart_client.is_connected:
        print(f"[Sync] [NOTICE] Angel One broker session is not active (login required via web UI). Serving {total} contracts directly from local accretive stores.")
        if progress_callback:
            progress_callback(total, total, "Broker session offline: scanning cached stores")
        return {"total": total, "updated": 0, "up_to_date": total, "empty": 0, "errors": 0, "elapsed_seconds": 0.0}

    updated = 0
    up_to_date = 0
    empty = 0
    errors = 0

    print(f"[Sync] Starting delta candle sync for {total} monitored contracts ({len(vix_contracts)} VIX + {len(near_month_contracts)} Near-Month + {len(far_month_contracts)} Far-Month)...")
    print(f"[Sync] Pacing: 1.0s between calls | Target completed 75m candle: {target_desc}")

    for i, contract in enumerate(ordered_contracts, 1):
        token = str(contract.get("token"))
        exchange = contract.get("exch_seg", "NFO")
        symbol = contract.get("symbol", token)

        if progress_callback:
            progress_callback(i, total, f"Syncing {symbol} ({i}/{total})...")

        try:
            # Check if this contract's accretive store already contains the expected candle
            file_75m = config.CACHE_DIR / f"{token}_75M.csv"
            needs_update = True

            if file_75m.exists() and not force:
                try:
                    last_line = ""
                    with open(file_75m, "r", encoding="utf-8", errors="ignore") as f:
                        lines = [l.strip() for l in f if l.strip()]
                    if len(lines) > 1:
                        last_line = lines[-1]

                    if last_line:
                        last_ts_str = last_line.split(",")[0]
                        last_ts = pd.to_datetime(last_ts_str)
                        if last_ts.tz is None:
                            last_ts = last_ts.tz_localize("Asia/Kolkata")
                        else:
                            last_ts = last_ts.tz_convert("Asia/Kolkata")

                        # If weekday:
                        if now_tz.weekday() < 5:
                            if expected_candle is not None:
                                if last_ts.date() == now_tz.date() and last_ts.time() >= expected_candle:
                                    needs_update = False
                            else:
                                # Pre-market / before 10:30: check if last completed session is present
                                if last_ts.date() == now_tz.date():
                                    needs_update = False
                                else:
                                    days_back = 3 if now_tz.weekday() == 0 else 1
                                    prev_day = now_tz.date() - datetime.timedelta(days=days_back)
                                    if last_ts.date() == prev_day and last_ts.time() >= datetime.time(14, 15):
                                        needs_update = False
                        else:
                            # Weekend (Sat=5, Sun=6): check if Friday's 14:15 candle is present
                            fri_delta = 1 if now_tz.weekday() == 5 else 2
                            last_fri = now_tz.date() - datetime.timedelta(days=fri_delta)
                            if last_ts.date() == last_fri and last_ts.time() >= datetime.time(14, 15):
                                needs_update = False
                except Exception:
                    needs_update = True

            if not needs_update:
                up_to_date += 1
                if i % 30 == 0:
                    print(f"[Sync] Progress: {i}/{total} checked ({updated} updated, {up_to_date} up-to-date)...")
                continue

            # Fetch missing delta with transparent retry and return count
            df, new_count, total_75m = get_cached_candles(token, interval="FIFTEEN_MINUTE", exchange=exchange, force_fetch=True, return_new_count=True)
            if new_count > 0:
                updated += 1
                print(f"[Sync] ({i}/{total}) {symbol} -> {new_count} new bars appended (Store now has {total_75m} 75m bars)")
            else:
                empty += 1

            if i % 25 == 0 or i == total:
                print(f"[Sync] Progress: {i}/{total} checked ({updated} updated, {up_to_date} up-to-date, {empty} zero-volume)...")

        except Exception as e:
            errors += 1
            print(f"[Sync] [ERROR] Error syncing token {token} ({symbol}): {e}")

    elapsed = time.time() - start_time
    print(f"[Sync] Completed: {updated} contracts updated, {up_to_date} already up-to-date, {empty} zero-volume, {errors} errors.")
    if progress_callback:
        progress_callback(total, total, f"Sync complete ({updated} updated, {up_to_date} up-to-date)")
    return {"total": total, "updated": updated, "up_to_date": up_to_date, "empty": empty, "errors": errors, "elapsed_seconds": round(elapsed, 1)}



