import os
import datetime
import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path
import config

ARCHIVE_COLS = [
    "timestamp", "symbol", "token", "expiry", "strike", "option_type",
    "timeframe", "pattern", "direction", "ltp", "trigger_level",
    "details"
]

_cached_df: Optional[pd.DataFrame] = None
_cached_mtime: float = 0.0

def _get_archive_df() -> pd.DataFrame:
    global _cached_df, _cached_mtime
    if not config.ARCHIVE_FILE.exists():
        return pd.DataFrame()
    
    try:
        current_mtime = config.ARCHIVE_FILE.stat().st_mtime
        if _cached_df is not None and current_mtime == _cached_mtime:
            return _cached_df

        df = pd.read_csv(config.ARCHIVE_FILE)
        df = df.fillna("")
        _cached_df = df
        _cached_mtime = current_mtime
        return _cached_df
    except Exception as e:
        print(f"[ArchiveManager] Error reading archive: {e}")
        return pd.DataFrame()

def append_to_archive(matches: List[Dict[str, Any]]):
    """Appends newly triggered patterns to the permanent CSV archive without duplicating."""
    global _cached_df, _cached_mtime
    if not matches:
        return

    from data_engine.scrip_master import scrip_master

    records = []
    for m in matches:
        trigger_lvl = m.get("l1") or m.get("disc1") or m.get("disc_level") or m.get("tenkan") or m.get("band_level") or 0.0
        sym = m.get("symbol", "")
        tok = m.get("token") or scrip_master.get_token_by_symbol(sym) or ""
        records.append({
            "timestamp": m.get("date") or m.get("trigger_date") or m.get("c3_date"),
            "symbol": sym,
            "token": str(tok),
            "expiry": m.get("expiry", ""),
            "strike": m.get("strike", 0),
            "option_type": m.get("option_type", ""),
            "timeframe": m.get("timeframe", ""),
            "pattern": m.get("pattern", ""),
            "direction": m.get("direction", ""),
            "ltp": m.get("ltp", 0.0),
            "trigger_level": trigger_lvl,
            "details": str(m.get("proximity") or m.get("pattern_type") or "")
        })

    new_df = pd.DataFrame(records)
    
    if config.ARCHIVE_FILE.exists():
        try:
            existing_df = pd.read_csv(config.ARCHIVE_FILE)
            combined = pd.concat([existing_df, new_df], ignore_index=True)
            combined.drop_duplicates(subset=["timestamp", "symbol", "timeframe", "pattern", "direction"], keep="last", inplace=True)
        except Exception:
            combined = new_df
    else:
        combined = new_df

    combined.sort_values(by="timestamp", ascending=False, inplace=True)
    combined.to_csv(config.ARCHIVE_FILE, index=False)
    
    # Update memory cache
    _cached_df = combined.fillna("")
    _cached_mtime = config.ARCHIVE_FILE.stat().st_mtime

def get_archive_data(scope: str = "active", limit: int = 0) -> Dict[str, Any]:
    """
    Returns archive records and metadata with high-performance tiered loading.
    scope:
      - 'active': current & future monthly expiries + India VIX (fast, default)
      - 'expired': past expiries only
      - 'all': entire historical archive
    """
    df = _get_archive_df()
    if df.empty:
        return {
            "records": [],
            "expiries_meta": [],
            "total_signals": 0,
            "active_signals": 0,
            "expired_signals": 0,
            "scope": scope
        }

    today_str = datetime.date.today().isoformat()
    active_mask = (df['expiry'] >= today_str) | (df['expiry'] == 'INDEX')
    expired_mask = (df['expiry'] < today_str) & (df['expiry'] != 'INDEX')

    total_count = len(df)
    active_count = int(active_mask.sum())
    expired_count = int(expired_mask.sum())

    # Build expiries metadata (available across all scopes so UI knows all expiries)
    expiries_meta = []
    exp_counts = df['expiry'].value_counts()
    for exp, cnt in exp_counts.items():
        if not exp:
            continue
        st = "active" if (exp >= today_str or exp == "INDEX") else "expired"
        expiries_meta.append({
            "expiry": exp,
            "status": st,
            "count": int(cnt)
        })

    # Sort expiries: Active first (by date ascending), then INDEX, then Expired (by date descending)
    active_meta = sorted([e for e in expiries_meta if e['status'] == 'active' and e['expiry'] != 'INDEX'], key=lambda x: x['expiry'])
    vix_meta = [e for e in expiries_meta if e['expiry'] == 'INDEX']
    expired_meta = sorted([e for e in expiries_meta if e['status'] == 'expired'], key=lambda x: x['expiry'], reverse=True)
    sorted_meta = active_meta + vix_meta + expired_meta

    if scope == "active":
        target_df = df[active_mask]
    elif scope == "expired":
        target_df = df[expired_mask]
    else:
        target_df = df

    if limit and limit > 0:
        target_df = target_df.head(limit)

    return {
        "records": target_df.to_dict(orient="records"),
        "expiries_meta": sorted_meta,
        "total_signals": total_count,
        "active_signals": active_count,
        "expired_signals": expired_count,
        "scope": scope
    }

def get_archive_records(limit: int = 0, scope: str = "all") -> List[Dict[str, Any]]:
    """Backward-compatible helper."""
    data = get_archive_data(scope=scope, limit=limit)
    return data.get("records", [])
