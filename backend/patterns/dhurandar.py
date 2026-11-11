import pandas as pd
import numpy as np
from typing import List, Dict, Any

try:
    from resampler import filter_finalized_candles
except ImportError:
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from resampler import filter_finalized_candles

def scan_dhurandar_patterns(df: pd.DataFrame, ltp: float, timeframe: str = "75m", proximity_threshold: float = 0.03) -> List[Dict[str, Any]]:
    """
    Identifies 3-candle Dhurandar Bullish base patterns.
    C1: Bearish (Close < Open)
    C2: Bullish (Close > Open)
    C3: Bullish (Close > Open) and Close > C1 High and Close > C2 High
    
    L1 = min(C1.low, C2.low, C3.low)
    L2 = C1.close
    Disc1 = (L1 + L2) / 2
    
    Checks for:
    - Pattern violation (subsequent Close < L1)
    - Proximity to L1 and Disc1 (|LTP - level| / level <= proximity_threshold)
    """
    patterns = []
    df = filter_finalized_candles(df, timeframe)
    if len(df) < 3:
        return patterns

    open_p = df['open'].values
    high_p = df['high'].values
    low_p = df['low'].values
    close_p = df['close'].values
    dates = df.index

    for i in range(2, len(df)):
        c1_open, c1_close, c1_high, c1_low = open_p[i-2], close_p[i-2], high_p[i-2], low_p[i-2]
        c2_open, c2_close, c2_high, c2_low = open_p[i-1], close_p[i-1], high_p[i-1], low_p[i-1]
        c3_open, c3_close, c3_high, c3_low = open_p[i], close_p[i], high_p[i], low_p[i]

        is_c1_bearish = c1_close < c1_open
        is_c2_bullish = c2_close > c2_open
        is_c3_bullish = c3_close > c3_open
        is_c3_highest = (c3_close > c1_high) and (c3_close > c2_high)

        if is_c1_bearish and is_c2_bullish and is_c3_bullish and is_c3_highest:
            l1 = min(c1_low, c2_low, c3_low)
            l2 = c1_close
            disc1 = (l1 + l2) / 2
            
            is_violated = False
            pattern_type = "Fresh"
            
            # Check subsequent candles up to latest
            for k in range(i + 1, len(df)):
                if close_p[k] < l1:
                    is_violated = True
                    break
                if low_p[k] < l1:
                    l1 = low_p[k]
                    pattern_type = "Regular"
                    disc1 = (l1 + l2) / 2

            if not is_violated and l1 > 0:
                px_ratio = ltp / l1
                dist_l1_pct = (ltp - l1) / l1
                dist_disc1_pct = (ltp - disc1) / disc1

                is_near_l1 = abs(dist_l1_pct) <= proximity_threshold
                is_near_disc1 = abs(dist_disc1_pct) <= proximity_threshold

                proximity_label = "Normal"
                if is_near_l1:
                    proximity_label = "Near L1"
                elif is_near_disc1:
                    proximity_label = "Near Disc1"

                patterns.append({
                    "pattern": "Dhurandar",
                    "direction": "BULLISH",
                    "timeframe": timeframe,
                    "date": dates[i].isoformat(),
                    "c3_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                    "l1": round(float(l1), 2),
                    "l2": round(float(l2), 2),
                    "disc1": round(float(disc1), 2),
                    "ltp": round(float(ltp), 2),
                    "px_ratio": round(float(px_ratio), 2),
                    "dist_l1_pct": round(float(dist_l1_pct * 100), 2),
                    "dist_disc1_pct": round(float(dist_disc1_pct * 100), 2),
                    "proximity": proximity_label,
                    "pattern_type": pattern_type
                })

    # Return newest first
    return sorted(patterns, key=lambda x: x['date'], reverse=True)[:3]
