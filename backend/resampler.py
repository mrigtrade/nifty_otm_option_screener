import pandas as pd
import numpy as np
import datetime
import calendar

def resample_to_75m(df: pd.DataFrame) -> pd.DataFrame:
    """
    Resamples intraday data (1m, 5m, 15m) into exact 75-minute candles
    aligned with Indian market hours (09:15 to 15:30).
    Produces exactly 5 candles per day:
      1. 09:15 - 10:30
      2. 10:30 - 11:45
      3. 11:45 - 13:00
      4. 13:00 - 14:15
      5. 14:15 - 15:30
    """
    if df.empty:
        return pd.DataFrame()
    
    df = df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
        
    df.columns = [c.lower() for c in df.columns]
    df = df.sort_index()
    
    if df.index.tz is None:
        df = df.tz_localize("Asia/Kolkata")
    else:
        df = df.tz_convert("Asia/Kolkata")
        
    df['date_str'] = df.index.strftime('%Y-%m-%d')
    df['minutes_since_start'] = (df.index.hour * 60 + df.index.minute) - (9 * 60 + 15)
    
    df_filtered = df[(df['minutes_since_start'] >= 0) & (df['minutes_since_start'] < 375)].copy()
    if df_filtered.empty:
        return pd.DataFrame()
        
    df_filtered['bin_idx'] = df_filtered['minutes_since_start'] // 75
    
    bin_starts = {
        0: "09:15",
        1: "10:30",
        2: "11:45",
        3: "13:00",
        4: "14:15"
    }
    
    agg_rules = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last'
    }
    if 'volume' in df_filtered.columns:
        agg_rules['volume'] = 'sum'
        
    grouped = df_filtered.groupby(['date_str', 'bin_idx']).agg(agg_rules)
    
    new_index = []
    for (date_str, bin_idx), _ in grouped.iterrows():
        time_str = bin_starts[int(bin_idx)]
        dt_str = f"{date_str} {time_str}"
        new_index.append(pd.to_datetime(dt_str).tz_localize("Asia/Kolkata"))
        
    grouped.index = pd.DatetimeIndex(new_index)
    grouped = grouped.sort_index()
    return grouped

def resample_to_1d(df: pd.DataFrame) -> pd.DataFrame:
    """Resamples intraday or daily data to 1-day timeframe."""
    if df.empty:
        return pd.DataFrame()
        
    df = df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)
        
    df.columns = [c.lower() for c in df.columns]
    df = df.sort_index()
    
    if df.index.tz is None:
        df = df.tz_localize("Asia/Kolkata")
    else:
        df = df.tz_convert("Asia/Kolkata")
        
    df['date_only'] = df.index.date
    agg_rules = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last'
    }
    if 'volume' in df.columns:
        agg_rules['volume'] = 'sum'
        
    grouped = df.groupby('date_only').agg(agg_rules)
    new_index = [pd.to_datetime(str(d)).tz_localize("Asia/Kolkata") for d in grouped.index]
    grouped.index = pd.DatetimeIndex(new_index)
    return grouped.sort_index()

def resample_to_weekly(df: pd.DataFrame) -> pd.DataFrame:
    """Resamples to weekly bars (ending Friday). Accepts either 1D daily or intraday data."""
    if df.empty:
        return pd.DataFrame()
        
    is_already_daily = (len(df) > 0 and len(df.index.normalize().unique()) == len(df))
    daily_df = df if is_already_daily else resample_to_1d(df)
    if daily_df.empty:
        return pd.DataFrame()
        
    agg_rules = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last'
    }
    if 'volume' in daily_df.columns:
        agg_rules['volume'] = 'sum'
        
    weekly = daily_df.resample('W-FRI').agg(agg_rules).dropna(subset=['close'])
    return weekly

def resample_to_monthly(df: pd.DataFrame) -> pd.DataFrame:
    """Resamples to monthly bars (month end). Accepts either 1D daily or intraday data."""
    if df.empty:
        return pd.DataFrame()
        
    is_already_daily = (len(df) > 0 and len(df.index.normalize().unique()) == len(df))
    daily_df = df if is_already_daily else resample_to_1d(df)
    if daily_df.empty:
        return pd.DataFrame()
        
    agg_rules = {
        'open': 'first',
        'high': 'max',
        'low': 'min',
        'close': 'last'
    }
    if 'volume' in daily_df.columns:
        agg_rules['volume'] = 'sum'
        
    monthly = daily_df.resample('ME').agg(agg_rules).dropna(subset=['close'])
    return monthly

def filter_finalized_candles(df: pd.DataFrame, timeframe: str) -> pd.DataFrame:
    """
    Filters candle series so that ONLY finalized/closed candles are retained for pattern confirmation.
    
    Rules across timeframes:
      - 75m: Each 75m candle closes at fixed session times:
             09:15 -> 10:30, 10:30 -> 11:45, 11:45 -> 13:00, 13:00 -> 14:15, 14:15 -> 15:30.
             Any bar whose scheduled close time has not yet passed is forming/unclosed and is excluded.
      - 1d:  Daily candles only finalize post-market close (after 15:30 IST Mon-Fri).
             During active market hours on a weekday, today's candle is forming and is excluded.
      - weekly: Weekly candles (ending Friday) only finalize after Friday 15:30 IST.
             If the week is still ongoing, the current week's bar is excluded.
      - monthly: Monthly candles only finalize after the month is complete (last day of month 15:30 IST).
             If the month is still ongoing, the current month's bar is excluded.
    """
    if df.empty:
        return df

    df = df.copy()
    if not isinstance(df.index, pd.DatetimeIndex):
        df.index = pd.to_datetime(df.index)

    # Ensure timezone is Asia/Kolkata
    if df.index.tz is None:
        df.index = df.index.tz_localize("Asia/Kolkata")
    else:
        df.index = df.index.tz_convert("Asia/Kolkata")

    current_dt = pd.Timestamp.now(tz="Asia/Kolkata")
    current_date = current_dt.date()
    current_time_str = current_dt.strftime('%H:%M')
    is_weekday = current_dt.weekday() < 5
    tf = timeframe.lower().strip()

    if tf in ['75m', '75min', '75']:
        candle_end_map = {
            (9, 15): (10, 30),
            (10, 30): (11, 45),
            (11, 45): (13, 0),
            (13, 0): (14, 15),
            (14, 15): (15, 30),
        }
        valid_indices = []
        for dt in df.index:
            candle_date = dt.date()
            if candle_date < current_date:
                valid_indices.append(True)
            elif candle_date == current_date:
                start_hm = (dt.hour, dt.minute)
                if start_hm in candle_end_map:
                    end_h, end_m = candle_end_map[start_hm]
                    candle_close_dt = dt.replace(hour=end_h, minute=end_m, second=0, microsecond=0)
                    valid_indices.append(candle_close_dt <= current_dt)
                else:
                    valid_indices.append((dt + pd.Timedelta(minutes=75)) <= current_dt)
            else:
                valid_indices.append(False)
        return df[valid_indices]

    elif tf in ['1d', 'd', 'daily']:
        valid_indices = []
        for dt in df.index:
            candle_date = dt.date()
            if candle_date < current_date:
                valid_indices.append(True)
            elif candle_date == current_date:
                # Daily candle only closes after 15:30 IST on a weekday
                if is_weekday and current_time_str >= '15:30':
                    valid_indices.append(True)
                else:
                    valid_indices.append(False)
            else:
                valid_indices.append(False)
        return df[valid_indices]

    elif tf in ['weekly', 'w', '1w']:
        valid_indices = []
        for dt in df.index:
            # dt is aligned to the Friday of that week (trading closes Friday 15:30 IST)
            friday_dt = dt + pd.Timedelta(days=(4 - dt.weekday()))
            fri_close_dt = friday_dt.replace(hour=15, minute=30, second=0, microsecond=0)
            valid_indices.append(fri_close_dt <= current_dt)
        return df[valid_indices]

    elif tf in ['monthly', 'm', '1m', '1mo']:
        valid_indices = []
        for dt in df.index:
            last_day = calendar.monthrange(dt.year, dt.month)[1]
            end_date = datetime.date(dt.year, dt.month, last_day)
            # If last calendar day is Sat/Sun, final trading session closes Friday 15:30 IST
            while end_date.weekday() >= 5:
                end_date -= datetime.timedelta(days=1)
            month_close_dt = dt.replace(day=end_date.day, month=end_date.month, year=end_date.year, hour=15, minute=30, second=0, microsecond=0)
            valid_indices.append(month_close_dt <= current_dt)
        return df[valid_indices]

    return df

