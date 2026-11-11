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

def scan_bollinger_band_reversals(df: pd.DataFrame, ltp: float, timeframe: str = "75m", period: int = 20, num_std: float = 2.0) -> List[Dict[str, Any]]:
    """
    Identifies Upper and Lower Bollinger Band reversals.
    - Bullish: Candle n-1 Close <= Lower_BB, Candle n Close > High_{n-1}
      Discount Entry Level: High_n - 1/3 * (High_n - Low_n)
    - Bearish: Candle n-1 Close >= Upper_BB, Candle n Close < Low_{n-1}
      Discount Entry Level: Low_n + 1/3 * (High_n - Low_n)
    """
    patterns = []
    df = filter_finalized_candles(df, timeframe)
    if len(df) < period + 2:
        return patterns

    df = df.copy()
    sma = df['close'].rolling(window=period).mean()
    std = df['close'].rolling(window=period).std()
    upper_bb = sma + (std * num_std)
    lower_bb = sma - (std * num_std)

    close_p = df['close'].values
    high_p = df['high'].values
    low_p = df['low'].values
    dates = df.index
    u_bb = upper_bb.values
    l_bb = lower_bb.values

    # Check last 5 candles for fresh signals
    lookback = min(len(df) - 1, 5)
    for i in range(len(df) - lookback, len(df)):
        if np.isnan(u_bb[i-1]) or np.isnan(l_bb[i-1]):
            continue

        c_prev_close = close_p[i-1]
        c_prev_high = high_p[i-1]
        c_prev_low = low_p[i-1]
        
        c_curr_close = close_p[i]
        c_curr_high = high_p[i]
        c_curr_low = low_p[i]

        # Bullish Reversal
        if c_prev_close <= l_bb[i-1] and c_curr_close > c_prev_high:
            disc_level = c_curr_high - ((1.0 / 3.0) * (c_curr_high - c_curr_low))
            patterns.append({
                "pattern": "Bollinger Band Reversal",
                "direction": "BULLISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "band_level": round(float(l_bb[i-1]), 2),
                "disc_level": round(float(disc_level), 2),
                "ltp": round(float(ltp), 2),
                "distance_to_disc_pct": round(float(((ltp - disc_level) / disc_level) * 100), 2) if disc_level > 0 else 0.0
            })

        # Bearish Reversal
        elif c_prev_close >= u_bb[i-1] and c_curr_close < c_prev_low:
            disc_level = c_curr_low + ((1.0 / 3.0) * (c_curr_high - c_curr_low))
            patterns.append({
                "pattern": "Bollinger Band Reversal",
                "direction": "BEARISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "band_level": round(float(u_bb[i-1]), 2),
                "disc_level": round(float(disc_level), 2),
                "ltp": round(float(ltp), 2),
                "distance_to_disc_pct": round(float(((ltp - disc_level) / disc_level) * 100), 2) if disc_level > 0 else 0.0
            })

    return sorted(patterns, key=lambda x: x['date'], reverse=True)
