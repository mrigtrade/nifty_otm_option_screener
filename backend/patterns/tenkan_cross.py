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

def scan_tenkan_crossover(df: pd.DataFrame, ltp: float, timeframe: str = "75m") -> List[Dict[str, Any]]:
    """
    Tenkan-sen (9) C0-C1-C2 Crossover Pattern.
    Bullish: C0 Close < Tenkan, C1 Close > Tenkan, C2 Close > C1 High
    Bearish: C0 Close > Tenkan, C1 Close < Tenkan, C2 Close < C1 Low
    """
    patterns = []
    df = filter_finalized_candles(df, timeframe)
    if len(df) < 11:
        return patterns

    df = df.copy()
    df['tenkan'] = (df['high'].rolling(9).max() + df['low'].rolling(9).min()) / 2.0

    tenkan = df['tenkan'].values
    close_p = df['close'].values
    high_p = df['high'].values
    low_p = df['low'].values
    dates = df.index

    lookback = min(len(df) - 2, 5)
    for i in range(len(df) - lookback, len(df)):
        if np.isnan(tenkan[i]) or np.isnan(tenkan[i-1]) or np.isnan(tenkan[i-2]):
            continue

        c0_close = close_p[i-2]
        c0_tenkan = tenkan[i-2]

        c1_close = close_p[i-1]
        c1_tenkan = tenkan[i-1]
        c1_high = high_p[i-1]
        c1_low = low_p[i-1]

        c2_close = close_p[i]

        # Bullish Case
        if (c0_close < c0_tenkan) and (c1_close > c1_tenkan) and (c2_close > c1_high):
            patterns.append({
                "pattern": "Tenkan Crossover",
                "direction": "BULLISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "tenkan": round(float(c1_tenkan), 2),
                "ltp": round(float(ltp), 2)
            })

        # Bearish Case
        elif (c0_close > c0_tenkan) and (c1_close < c1_tenkan) and (c2_close < c1_low):
            patterns.append({
                "pattern": "Tenkan Crossover",
                "direction": "BEARISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "tenkan": round(float(c1_tenkan), 2),
                "ltp": round(float(ltp), 2)
            })

    return sorted(patterns, key=lambda x: x['date'], reverse=True)
