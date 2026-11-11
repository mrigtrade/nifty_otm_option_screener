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

def calculate_rsi(series: pd.Series, period: int = 9) -> pd.Series:
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0).copy()
    loss = (-delta.where(delta < 0, 0.0)).copy()
    
    avg_gain = gain.rolling(window=period, min_periods=period).mean()
    avg_loss = loss.rolling(window=period, min_periods=period).mean()
    
    gain_vals = gain.values
    loss_vals = loss.values
    ag = avg_gain.values
    al = avg_loss.values
    
    for i in range(period, len(series)):
        ag[i] = (ag[i-1] * (period - 1) + gain_vals[i]) / period
        al[i] = (al[i-1] * (period - 1) + loss_vals[i]) / period
        
    rs = np.divide(ag, al, out=np.zeros_like(ag), where=al != 0)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return pd.Series(rsi, index=series.index)

def calculate_wma(series: pd.Series, period: int = 21) -> pd.Series:
    weights = np.arange(1, period + 1)
    w_sum = weights.sum()
    return series.rolling(window=period).apply(lambda p: np.dot(p, weights) / w_sum, raw=True)

def scan_rsi_ichimoku_reversals(df: pd.DataFrame, ltp: float, timeframe: str = "75m") -> List[Dict[str, Any]]:
    """
    RSI(9) + WMA(21) + Tenkan-sen (9) reversal system.
    Bullish: RSI(9) crosses above WMA(21), Close > Open, Close < Tenkan-sen
    Bearish: RSI(9) crosses below WMA(21), Close < Open, Close > Tenkan-sen
    """
    patterns = []
    df = filter_finalized_candles(df, timeframe)
    if len(df) < 30:
        return patterns

    df = df.copy()
    df['rsi9'] = calculate_rsi(df['close'], period=9)
    df['wma21'] = calculate_wma(df['rsi9'], period=21)
    df['tenkan'] = (df['high'].rolling(9).max() + df['low'].rolling(9).min()) / 2.0

    rsi = df['rsi9'].values
    wma = df['wma21'].values
    tenkan = df['tenkan'].values
    open_p = df['open'].values
    close_p = df['close'].values
    dates = df.index

    lookback = min(len(df) - 1, 5)
    for i in range(len(df) - lookback, len(df)):
        if any(np.isnan(v) for v in [rsi[i], wma[i], rsi[i-1], wma[i-1], tenkan[i]]):
            continue

        # Bullish Reversal
        if rsi[i-1] <= wma[i-1] and rsi[i] > wma[i] and close_p[i] > open_p[i] and close_p[i] < tenkan[i]:
            patterns.append({
                "pattern": "RSI-Ichimoku Reversal",
                "direction": "BULLISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "rsi": round(float(rsi[i]), 2),
                "wma": round(float(wma[i]), 2),
                "tenkan": round(float(tenkan[i]), 2),
                "ltp": round(float(ltp), 2)
            })

        # Bearish Reversal
        elif rsi[i-1] >= wma[i-1] and rsi[i] < wma[i] and close_p[i] < open_p[i] and close_p[i] > tenkan[i]:
            patterns.append({
                "pattern": "RSI-Ichimoku Reversal",
                "direction": "BEARISH",
                "timeframe": timeframe,
                "date": dates[i].isoformat(),
                "trigger_date": dates[i].strftime('%Y-%m-%d %H:%M') if hasattr(dates[i], 'strftime') else str(dates[i]),
                "rsi": round(float(rsi[i]), 2),
                "wma": round(float(wma[i]), 2),
                "tenkan": round(float(tenkan[i]), 2),
                "ltp": round(float(ltp), 2)
            })

    return sorted(patterns, key=lambda x: x['date'], reverse=True)
