from pathlib import Path
import os
import time
import datetime
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd

import config
from data_engine.smartapi_client import smart_client
from data_engine.scrip_master import scrip_master
from data_engine.cache_manager import get_cached_candles, get_accretive_candles, sync_active_contracts
from data_engine.scheduler import is_market_open, get_next_75m_close
from resampler import resample_to_75m, resample_to_1d, resample_to_weekly, resample_to_monthly, filter_finalized_candles
from patterns.dhurandar import scan_dhurandar_patterns
from patterns.bollinger_bands import scan_bollinger_band_reversals
from patterns.rsi_ichimoku import scan_rsi_ichimoku_reversals, calculate_rsi, calculate_wma
from patterns.tenkan_cross import scan_tenkan_crossover

from archive_manager import append_to_archive, get_archive_records, get_archive_data
import participant_service

app = FastAPI(title="OTM Option Screener & Pattern Analyzer API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import threading
import json

LATEST_MATCHES_FILE = config.DATA_DIR / 'latest_matches.json'

# In-memory scan cache
_scan_cache: Dict[str, Any] = {
    "spot_price": 0.0,
    "vix_price": 0.0,
    "scan_time": "",
    "matches": [],
    "is_scanning": False,
    "last_scan_dt": None,
    "is_syncing": False,
    "last_sync_time": "",
    "sync_progress": {
        "current": 0,
        "total": 0,
        "percent": 0,
        "message": "Idle"
    }
}

# Scan concurrency lock
_scan_lock = threading.Lock()

# Load latest scan cache from disk on startup if present
if LATEST_MATCHES_FILE.exists():
    try:
        with open(LATEST_MATCHES_FILE, 'r') as f:
            _saved_data = json.load(f)
            _scan_cache["spot_price"] = _saved_data.get("spot_price", 0.0)
            _scan_cache["vix_price"] = _saved_data.get("vix_price", 0.0)
            _scan_cache["scan_time"] = _saved_data.get("scan_time", "")
            matches = _saved_data.get("matches", [])
            matches.sort(key=lambda m: m.get("date", ""), reverse=True)
            _scan_cache["matches"] = matches
            _scan_cache["last_scan_dt"] = datetime.datetime.now()
            print(f"[Backend] Restored {len(_scan_cache['matches'])} cached pattern strikes from disk (sorted recent to oldest).")
    except Exception as _e:
        print(f"[Backend] Could not load saved matches: {_e}")

# If scan cache matches are still empty, fall back to permanent archive immediately
if not _scan_cache["matches"]:
    try:
        archived = get_archive_records(limit=500)
        if archived:
            converted = []
            for rec in archived:
                converted.append({
                    "symbol": rec.get("symbol", ""),
                    "token": scrip_master.get_token_by_symbol(rec.get("symbol", "")) or "",
                    "expiry": rec.get("expiry", ""),
                    "strike": rec.get("strike", 0),
                    "option_type": rec.get("option_type", ""),
                    "timeframe": rec.get("timeframe", "75m"),
                    "pattern": rec.get("pattern", ""),
                    "direction": rec.get("direction", "SELL"),
                    "date": rec.get("timestamp", ""),
                    "trigger_date": rec.get("timestamp", ""),
                    "ltp": float(rec.get("ltp") or 0.0),
                    "proximity": rec.get("details", "")
                })
            _scan_cache["matches"] = converted
            print(f"[Backend] Pre-loaded {len(converted)} historical scan matches from archive for immediate landing display.")
    except Exception as _ae:
        print(f"[Backend] Could not load archive fallback: {_ae}")

class LoginRequest(BaseModel):
    totp_code: Optional[str] = None

@app.get("/api/status")
def get_status():
    spot_price = smart_client.get_spot_price()
    if spot_price <= 0:
        spot_price = _scan_cache.get("spot_price", 0.0)
    if spot_price <= 0:
        spot_price = config.FALLBACK_SPOT_PRICE

    vix_price = smart_client.get_vix_price()
    if vix_price <= 0:
        vix_price = _scan_cache.get("vix_price", 0.0)

    return {
        "is_connected": smart_client.is_connected,
        "client_code": smart_client.client_code,
        "is_market_open": is_market_open(),
        "next_75m_close": get_next_75m_close(),
        "spot_price": spot_price,
        "vix_price": vix_price,
        "atm_strike": round(spot_price / 50.0) * 50 if spot_price > 0 else 0,
        "is_scanning": _scan_cache.get("is_scanning", False),
        "is_syncing": _scan_cache.get("is_syncing", False),
        "last_sync_time": _scan_cache.get("last_sync_time", ""),
        "last_scan_time": _scan_cache.get("scan_time", ""),
        "sync_progress": _scan_cache.get("sync_progress", {"current": 0, "total": 0, "percent": 0, "message": "Idle"}),
        "auto_sync_enabled": getattr(config, 'AUTO_SYNC_DURING_MARKET', True)
    }


@app.post("/api/auth/login")
def login_endpoint(req: LoginRequest):
    res = smart_client.login_with_totp(req.totp_code)
    return res

@app.get("/api/expiries")
def get_expiries():
    expiries = scrip_master.get_valid_monthly_expiries()
    return {
        "expiries": [e.strftime("%Y-%m-%d") for e in expiries]
    }

@app.post("/api/master/refresh")
def refresh_master():
    updated = scrip_master.refresh_scrip_master(force=True)
    expiries = [e.strftime("%Y-%m-%d") for e in scrip_master.get_valid_monthly_expiries()]
    return {
        "updated": updated,
        "instruments_count": len(scrip_master.scrip_master),
        "expiries": expiries
    }

def execute_scan():
    """
    Executes a scan over India VIX and all OTM contracts in the background.
    Atomically updates _scan_cache, latest_matches.json, and the archive.
    Existing on-screen matches remain available throughout the scan.
    """
    if not _scan_lock.acquire(blocking=False):
        return False

    _scan_cache["is_scanning"] = True
    try:
        spot_price = smart_client.get_spot_price()
        if spot_price <= 0:
            spot_price = _scan_cache.get("spot_price", 0.0)
            if spot_price <= 0:
                spot_price = config.FALLBACK_SPOT_PRICE

        _scan_cache["sync_progress"] = {
            "current": 0,
            "total": 0,
            "percent": 90,
            "message": "Analyzing patterns across all timeframes (75m, 1D, Weekly, Monthly)..."
        }

        all_expiries = scrip_master.get_valid_monthly_expiries()
        otm_contracts = scrip_master.get_otm_contracts(spot_price, all_expiries)
        matches = []

        # 1. Scan India VIX across all timeframes FIRST (Volatility Gauge & Macro Benchmark)
        vix_df_75m = get_accretive_candles(config.INDIA_VIX_TOKEN, "75m", exchange=config.INDIA_VIX_EXCHANGE, allow_network=True)
        vix_df_1d = get_accretive_candles(config.INDIA_VIX_TOKEN, "1d", exchange=config.INDIA_VIX_EXCHANGE, allow_network=True)
        vix_ltp = smart_client.get_vix_price()
        if vix_ltp <= 0:
            if not vix_df_1d.empty:
                vix_ltp = float(vix_df_1d['close'].iloc[-1])
            elif not vix_df_75m.empty:
                vix_ltp = float(vix_df_75m['close'].iloc[-1])
        _scan_cache["vix_price"] = vix_ltp

        # Filter finalized candles across all timeframes to enforce candle-close integrity
        vix_df_75m_clean = filter_finalized_candles(vix_df_75m, "75m")
        vix_df_1d_clean = filter_finalized_candles(vix_df_1d, "1d")
        vix_weekly = filter_finalized_candles(resample_to_weekly(vix_df_1d_clean), "weekly") if not vix_df_1d_clean.empty else pd.DataFrame()
        vix_monthly = filter_finalized_candles(resample_to_monthly(vix_df_1d_clean), "monthly") if not vix_df_1d_clean.empty else pd.DataFrame()

        vix_tf_map = {
            "75m": vix_df_75m_clean,
            "1d": vix_df_1d_clean,
            "weekly": vix_weekly,
            "monthly": vix_monthly
        }
        for tf_name, df_tf in vix_tf_map.items():
            if df_tf.empty:
                continue
            vix_info = {
                "symbol": config.INDIA_VIX_SYMBOL,
                "token": config.INDIA_VIX_TOKEN,
                "expiry": "INDEX",
                "strike": 0,
                "option_type": "VIX",
                "timeframe": tf_name
            }
            for d in scan_dhurandar_patterns(df_tf, vix_ltp, timeframe=tf_name, proximity_threshold=config.PROXIMITY_THRESHOLD_PCT):
                matches.append({**vix_info, **d})
            for b in scan_bollinger_band_reversals(df_tf, vix_ltp, timeframe=tf_name):
                matches.append({**vix_info, **b})
            for r in scan_rsi_ichimoku_reversals(df_tf, vix_ltp, timeframe=tf_name):
                matches.append({**vix_info, **r})
            for t in scan_tenkan_crossover(df_tf, vix_ltp, timeframe=tf_name):
                matches.append({**vix_info, **t})

        # 2. Scan OTM Option Contracts directly from Accretive Stores (<2 seconds, zero network calls)
        for contract in otm_contracts:
            df_75m = get_accretive_candles(contract["token"], "75m", exchange=contract["exch_seg"])
            df_1d = get_accretive_candles(contract["token"], "1d", exchange=contract["exch_seg"])
            if df_1d.empty and df_75m.empty:
                continue

            ltp = float(df_1d['close'].iloc[-1]) if not df_1d.empty else float(df_75m['close'].iloc[-1])

            # Filter finalized candles hierarchically to enforce candle-close integrity across all timeframes:
            # - 75m: filters out any currently forming 75m bin
            # - 1D: drops forming candle during active market hours / before 15:30 close
            # - Weekly: drops current incomplete week until Friday 15:30 close
            # - Monthly: drops current incomplete month until month-end close
            df_75m_clean = filter_finalized_candles(df_75m, "75m")
            df_1d_clean = filter_finalized_candles(df_1d, "1d")
            df_weekly = filter_finalized_candles(resample_to_weekly(df_1d_clean), "weekly") if not df_1d_clean.empty else pd.DataFrame()
            df_monthly = filter_finalized_candles(resample_to_monthly(df_1d_clean), "monthly") if not df_1d_clean.empty else pd.DataFrame()

            tf_map = {
                "75m": df_75m_clean,
                "1d": df_1d_clean,
                "weekly": df_weekly,
                "monthly": df_monthly
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

                # 1. Dhurandar
                dhurandar_res = scan_dhurandar_patterns(df_tf, ltp, timeframe=tf_name, proximity_threshold=config.PROXIMITY_THRESHOLD_PCT)
                for d in dhurandar_res:
                    m = {**contract_info, **d}
                    matches.append(m)

                # 2. Bollinger Band Reversal
                bb_res = scan_bollinger_band_reversals(df_tf, ltp, timeframe=tf_name)
                for b in bb_res:
                    m = {**contract_info, **b}
                    matches.append(m)

                # 3. RSI-Ichimoku Reversal
                rsi_res = scan_rsi_ichimoku_reversals(df_tf, ltp, timeframe=tf_name)
                for r in rsi_res:
                    m = {**contract_info, **r}
                    matches.append(m)

                # 4. Tenkan Crossover
                tc_res = scan_tenkan_crossover(df_tf, ltp, timeframe=tf_name)
                for t in tc_res:
                    m = {**contract_info, **t}
                    matches.append(m)

        # Default presentation order: Recent date to oldest date
        matches.sort(key=lambda m: m.get("date", ""), reverse=True)

        now = datetime.datetime.now()
        today_prefix = now.strftime("%Y-%m-%d")
        today_matches = [m for m in matches if str(m.get("date", "")).startswith(today_prefix)]
        bullish_today = len([m for m in today_matches if m.get("direction") == "BULLISH"])
        bearish_today = len([m for m in today_matches if m.get("direction") == "BEARISH"])

        _scan_cache["spot_price"] = spot_price
        _scan_cache["scan_time"] = now.strftime("%Y-%m-%d %H:%M:%S")
        _scan_cache["last_scan_dt"] = now
        _scan_cache["matches"] = matches

        # Persist latest matches to disk for instant cold-start
        try:
            with open(LATEST_MATCHES_FILE, 'w') as f:
                json.dump({
                    "spot_price": spot_price,
                    "vix_price": _scan_cache.get("vix_price", 0.0),
                    "scan_time": _scan_cache["scan_time"],
                    "matches": matches
                }, f)
        except Exception:
            pass

        # Append to persistent historical archive
        append_to_archive(matches)
        print(f"[Scanner] Scan complete: {len(matches)} total patterns ({len(today_matches)} triggered today: {bullish_today} Bullish, {bearish_today} Bearish) at {now.strftime('%H:%M:%S')}.")
        return True

    finally:
        _scan_cache["is_scanning"] = False
        _scan_lock.release()

_sync_lock = threading.Lock()

def sync_and_scan(force_sync: bool = False):
    """
    Synchronizes delta candle bars from broker for all active OTM contracts + India VIX,
    updates persistent accretive stores, then executes pattern scan across all timeframes.
    Runs asynchronously in background thread.
    """
    if not _sync_lock.acquire(blocking=False):
        print("[Sync] [WARN] Sync already in progress, skipping duplicate request.")
        return False

    _scan_cache["is_syncing"] = True
    try:
        spot_price = smart_client.get_spot_price()
        if spot_price <= 0:
            spot_price = _scan_cache.get("spot_price", 0.0)
            if spot_price <= 0:
                spot_price = config.FALLBACK_SPOT_PRICE

        all_expiries = scrip_master.get_valid_monthly_expiries()
        otm_contracts = scrip_master.get_otm_contracts(spot_price, all_expiries)

        def _on_sync_progress(curr, tot, msg):
            _scan_cache["sync_progress"] = {
                "current": curr,
                "total": tot,
                "percent": round((curr / tot) * 100) if tot > 0 else 0,
                "message": msg
            }

        sync_list = [{"token": config.INDIA_VIX_TOKEN, "exch_seg": config.INDIA_VIX_EXCHANGE, "symbol": config.INDIA_VIX_SYMBOL}] + otm_contracts
        sync_result = sync_active_contracts(sync_list, force=force_sync, progress_callback=_on_sync_progress)

        _scan_cache["last_sync_time"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[Sync] Accretive stores refreshed. Running pattern radar across all timeframes (75m, 1D, Weekly, Monthly)...")
        execute_scan()
        return True
    except Exception as e:
        print(f"[Sync] [ERROR] Error during sync_and_scan: {e}")
        return False
    finally:
        _scan_cache["is_syncing"] = False
        _scan_cache["sync_progress"] = {"current": 0, "total": 0, "percent": 100, "message": "Idle"}
        _sync_lock.release()

def _scheduler_loop():
    """
    Autonomous background worker for 75-minute candle session closes.
    Checks config.AUTO_SYNC_DURING_MARKET. If False, background automated sync is skipped,
    preventing live market rate limits, leaving the user in control to Scan Now at any time.
    """
    scanned_closes_today = set()
    last_date = None

    while True:
        try:
            time.sleep(15) # Check every 15 seconds
            now = datetime.datetime.now()
            today_str = now.strftime("%Y-%m-%d")

            if last_date != today_str:
                scanned_closes_today.clear()
                last_date = today_str

            if not getattr(config, 'AUTO_SYNC_DURING_MARKET', True):
                continue

            if not is_market_open():
                continue

            curr_hm = now.strftime("%H:%M")
            for close_hm in config.SESSION_75M_CLOSES:
                if close_hm not in scanned_closes_today and curr_hm >= close_hm:
                    print(f"\n[Scheduler] 75-minute candle session close reached ({close_hm} IST). Starting background delta synchronization...")
                    scanned_closes_today.add(close_hm)
                    threading.Thread(target=sync_and_scan, daemon=True, name=f"SyncScan_{close_hm}").start()
                    break
        except Exception as e:
            print(f"[Scheduler] ❌ Error in background scheduler loop: {e}")

@app.on_event("startup")
def startup_event():
    sched_thread = threading.Thread(target=_scheduler_loop, daemon=True, name="Session75mScheduler")
    sched_thread.start()
    auto_status = "ENABLED (Auto 75m syncs at 10:30, 11:45, 13:00, 14:15, 15:30 IST)" if getattr(config, 'AUTO_SYNC_DURING_MARKET', True) else "PAUSED"
    print(f"[Backend] Background scheduler active [Market Auto-Sync: {auto_status}].")

class ScanNowRequest(BaseModel):
    force: bool = False
    sync_candles: bool = True

@app.post("/api/scan-now")
def scan_now_endpoint(req: ScanNowRequest, background_tasks: BackgroundTasks):
    """
    On-demand Scan Now endpoint.
    If sync_candles is True (default), fetches delta candles from broker (ideal for off-market hours)
    then executes multi-timeframe pattern detection.
    If sync_candles is False, executes instant pattern detection directly from local cached candle stores.
    """
    if _scan_cache.get("is_syncing", False) or _scan_cache.get("is_scanning", False):
        return {
            "status": "in_progress",
            "message": "A scan is already in progress.",
            "is_syncing": _scan_cache.get("is_syncing", False),
            "is_scanning": _scan_cache.get("is_scanning", False)
        }

    if req.sync_candles:
        background_tasks.add_task(sync_and_scan, force_sync=req.force)
        return {
            "status": "started",
            "message": "Delta candle sync & multi-timeframe pattern scan initiated in background."
        }
    else:
        background_tasks.add_task(execute_scan)
        return {
            "status": "started",
            "message": "Fast local pattern scan initiated in background."
        }

@app.post("/api/sync")
def trigger_sync(background_tasks: BackgroundTasks, force: bool = False):
    """Triggers an asynchronous delta sync and scan for all monitored contracts."""
    if _scan_cache.get("is_syncing", False):
        return {"status": "in_progress", "message": "Synchronization is already running."}
    background_tasks.add_task(sync_and_scan, force_sync=force)
    return {"status": "started", "message": "Delta candle synchronization and scan started in background."}

@app.get("/api/screener")
def run_screener(
    timeframe: Optional[str] = None,
    expiry: Optional[str] = None,
    pattern: Optional[str] = None,
    option_type: Optional[str] = None,
    proximity_only: bool = False,
    force: bool = False,
    sync: bool = False,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    global _scan_cache

    # 1. If sync is explicitly requested, launch delta sync in background
    if sync:
        if not _scan_cache.get("is_syncing", False):
            background_tasks.add_task(sync_and_scan, force_sync=force)

    # 2. If cached matches exist and force=False, return filtered cache immediately (<1ms)
    if not force and _scan_cache["matches"]:
        return _filter_matches(_scan_cache["matches"], timeframe, expiry, pattern, option_type, proximity_only)

    # 3. If force=True or cold-start with empty cache, trigger scan in background (non-blocking)
    if force or not _scan_cache["matches"]:
        if not _scan_cache.get("is_scanning", False):
            background_tasks.add_task(execute_scan)

    return _filter_matches(_scan_cache["matches"], timeframe, expiry, pattern, option_type, proximity_only)

def _filter_matches(matches, timeframe, expiry, pattern, option_type, proximity_only):
    filtered = matches
    if timeframe and timeframe.lower() != "all":
        filtered = [m for m in filtered if m.get("timeframe") == timeframe]
    if expiry and expiry.lower() != "all":
        exp_list = [e.strip() for e in expiry.split(",") if e.strip()]
        if exp_list:
            filtered = [m for m in filtered if m.get("expiry") in exp_list or m.get("option_type") == "VIX"]
    if pattern and pattern.lower() != "all":
        filtered = [m for m in filtered if pattern.lower() in m.get("pattern", "").lower()]
    if option_type and option_type.upper() in ["CE", "PE", "VIX"]:
        filtered = [m for m in filtered if m.get("option_type") == option_type.upper()]
    if proximity_only:
        filtered = [m for m in filtered if m.get("proximity") in ["Near L1", "Near Disc1"]]

    # Always ensure default presentation is in the order of recent date to oldest date
    filtered = sorted(filtered, key=lambda m: m.get("date", ""), reverse=True)

    return {
        "spot_price": _scan_cache.get("spot_price", 0.0),
        "vix_price": _scan_cache.get("vix_price", 0.0),
        "scan_time": _scan_cache.get("scan_time", ""),
        "total_matches": len(filtered),
        "matches": filtered,
        "is_scanning": _scan_cache.get("is_scanning", False),
        "is_syncing": _scan_cache.get("is_syncing", False),
        "last_sync_time": _scan_cache.get("last_sync_time", ""),
        "last_scan_time": _scan_cache.get("scan_time", ""),
        "sync_progress": _scan_cache.get("sync_progress", {"current": 0, "total": 0, "percent": 0, "message": "Idle"})
    }


@app.get("/api/chart/{token}")
def get_chart_data(token: str, timeframe: str = "75m"):
    """Returns OHLC candlestick series and indicator lines for TradingView Lightweight Charts."""
    if not token.isdigit():
        resolved = scrip_master.get_token_by_symbol(token)
        if resolved:
            token = resolved

    exchange = config.INDIA_VIX_EXCHANGE if str(token) == str(config.INDIA_VIX_TOKEN) else "NFO"
    df = get_accretive_candles(token, timeframe=timeframe, exchange=exchange, allow_network=True)

    if df.empty:
        return {"candles": [], "overlays": {}}

    # Compute overlays: SMA 20/50, Tenkan-sen (9), Bollinger Bands, RSI(9) + WMA(21)
    df['sma20'] = df['close'].rolling(20).mean()
    df['sma50'] = df['close'].rolling(50).mean()
    df['tenkan'] = (df['high'].rolling(9).max() + df['low'].rolling(9).min()) / 2.0
    std = df['close'].rolling(20).std()
    df['upper_bb'] = df['sma20'] + (std * 2.0)
    df['lower_bb'] = df['sma20'] - (std * 2.0)
    df['rsi9'] = calculate_rsi(df['close'], period=9)
    df['rsi_wma21'] = calculate_wma(df['rsi9'], period=21)

    candles = []
    for dt, row in df.iterrows():
        ts_val = int(dt.timestamp()) if hasattr(dt, 'timestamp') else 0
        candles.append({
            "time": ts_val,
            "open": round(float(row['open']), 2),
            "high": round(float(row['high']), 2),
            "low": round(float(row['low']), 2),
            "close": round(float(row['close']), 2),
            "volume": int(row['volume']) if 'volume' in row and pd.notna(row['volume']) else 0
        })

    overlays = {
        "sma20": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['sma20'].items() if pd.notna(val)],
        "sma50": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['sma50'].items() if pd.notna(val)],
        "tenkan": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['tenkan'].items() if pd.notna(val)],
        "upper_bb": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['upper_bb'].items() if pd.notna(val)],
        "lower_bb": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['lower_bb'].items() if pd.notna(val)],
        "rsi": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['rsi9'].items() if pd.notna(val)],
        "rsi_wma21": [{"time": int(dt.timestamp()), "value": round(float(val), 2)} for dt, val in df['rsi_wma21'].items() if pd.notna(val)]
    }

    return {"candles": candles, "overlays": overlays}

from report_engine import get_report_data

@app.get("/api/report")
def get_report(window: str = "today"):
    """Returns an executive intelligence report across time horizons (today, yesterday, week, all)."""
    return get_report_data(window=window)

@app.get("/api/archive")
def get_archive(scope: str = Query("active", description="active, expired, or all"), limit: int = Query(0, description="Max records, 0 for all")):
    return get_archive_data(scope=scope, limit=limit)

from new_strikes_manager import get_new_strikes_data, sync_from_external_backup, scan_and_update_new_strikes

@app.get("/api/new-strikes")
def get_new_strikes(
    lookback: str = Query("today", description="Lookback window: today, 1d, 3d, 7d, 30d, all"),
    expiry: str = Query("all", description="Monthly expiry code or 'all'"),
    option_type: str = Query("all", description="Option type filter: all, CE, PE"),
    moneyness: str = Query("all", description="Moneyness filter: all, OTM, FAR_OTM"),
    search: str = Query("", description="Search term for strike or symbol")
):
    """Returns newly added option strikes for far-month contracts (current month dropped)."""
    spot = _scan_cache.get("spot_price", 0.0)
    return get_new_strikes_data(
        lookback=lookback,
        expiry=expiry,
        option_type=option_type,
        moneyness=moneyness,
        search=search,
        spot_price_override=spot if spot > 0 else None
    )

@app.post("/api/new-strikes/sync")
def sync_new_strikes(force_download: bool = Query(True, description="Force download fresh Angel One instrument master")):
    """Scans and updates newly launched strikes natively from Angel One scrip master."""
    return scan_and_update_new_strikes(force_master_download=force_download)


import microstructure_cycles
from microstructure_service import (
    get_full_microstructure_payload,
    trigger_microstructure_run,
    ensure_current_session_data,
    _runner_state,
    CHART_PNG_PATH
)

@app.get("/api/microstructure/data")
def get_microstructure_data(cycle_id: Optional[str] = Query(None, description="Expiry cycle ID: nov_2026, dec_2026, etc.")):
    """Returns comprehensive microstructure readings, multi-cycle historical replay, and operational cheat codes."""
    return get_full_microstructure_payload(cycle_id=cycle_id)

@app.get("/api/microstructure/cycles")
def get_microstructure_cycles():
    """Returns list of registered expiry cycles (archived benchmarks and active live cycles)."""
    return microstructure_cycles.get_all_cycles()

@app.post("/api/microstructure/archive-cycle")
def archive_cycle_endpoint(cycle_id: str = Query(..., description="Cycle ID to archive"), summary: Optional[str] = Query(None)):
    """Archives an active expiry cycle for future learning and historical reference."""
    return microstructure_cycles.archive_current_cycle(cycle_id=cycle_id, final_summary=summary)

@app.post("/api/microstructure/run")
def run_microstructure(mode: str = Query("radar", description="Execution mode: radar, full, or charts")):
    """Triggers native execution of the Microstructure Radar, macro NTSI pipeline, or 4-panel chart engine."""
    return trigger_microstructure_run(mode=mode)

@app.get("/api/microstructure/status")
def get_microstructure_status():
    """Returns real-time execution status of the microstructure background runner."""
    return _runner_state

@app.get("/api/microstructure/chart-image")
def get_microstructure_chart_image():
    """Serves the publication-quality 4-panel microstructure replay chart image."""
    if CHART_PNG_PATH.exists():
        return FileResponse(
            CHART_PNG_PATH,
            media_type="image/png",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"}
        )
    return {"error": "Chart image not found"}

@app.get("/api/microstructure/participant-oi")
def get_participant_oi():
    """Returns official NSE 7:00 PM Participant-Wise Derivatives Open Interest analysis."""
    return participant_service.get_latest_participant_record()

@app.post("/api/microstructure/sync-participant-oi")
def sync_participant_oi():
    """Manually triggers real-time synchronization with NSE archives for the 7:00 PM report."""
    return participant_service.fetch_and_parse_participant_oi(force=True)

# Auto-sync NSE Participant OI and latest session Microstructure telemetry/charts on startup in background thread
threading.Thread(target=lambda: ensure_current_session_data(force=False), daemon=True).start()



from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

DIST_DIR = Path(__file__).resolve().parent.parent / "frontend" / "dist"
ASSETS_DIR = DIST_DIR / "assets"

if ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=str(ASSETS_DIR)), name="assets")

@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        return {"error": "Endpoint not found"}
    target = DIST_DIR / full_path
    if target.is_file():
        return FileResponse(target)
    index_file = DIST_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file, headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        })
    return {"status": "ok", "app": "OTM Option Screener & Pattern Analyzer API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
