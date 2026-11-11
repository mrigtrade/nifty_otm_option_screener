import datetime
import config

def is_market_open() -> bool:
    """Checks whether Indian market is currently within active hours (09:15 - 15:30 Mon-Fri)."""
    now = datetime.datetime.now()
    if now.weekday() >= 5: # Sat/Sun
        return False
    
    current_time = now.strftime("%H:%M")
    return config.MARKET_START_TIME <= current_time <= config.MARKET_END_TIME

def get_next_75m_close() -> str:
    """Returns the next scheduled 75m candle close time."""
    current_time = datetime.datetime.now().strftime("%H:%M")
    for close_t in config.SESSION_75M_CLOSES:
        if current_time < close_t:
            return close_t
    return "Market Closed"
