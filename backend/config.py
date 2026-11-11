import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / 'data'
CACHE_DIR = DATA_DIR / 'cache'
MASTER_SCRIP_PATH = DATA_DIR / 'master_scrip.csv'
SESSION_FILE = DATA_DIR / 'session.json'
ARCHIVE_FILE = DATA_DIR / 'pattern_archive.csv'

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
CACHE_DIR.mkdir(exist_ok=True)

# Try loading from creds.py or env
try:
    import creds
    API_KEY = getattr(creds, 'api_key', os.getenv('SMARTAPI_API_KEY', ''))
    CLIENT_CODE = getattr(creds, 'client_id', os.getenv('SMARTAPI_CLIENT_CODE', ''))
    PIN = getattr(creds, 'pin', os.getenv('SMARTAPI_PASSWORD', ''))
    API_SECRET = getattr(creds, 'api_secret', os.getenv('SMARTAPI_SECRET', ''))
    TOTP_SECRET = getattr(creds, 'totp_secret', os.getenv('SMARTAPI_TOTP_KEY', ''))
except ImportError:
    API_KEY = os.getenv('SMARTAPI_API_KEY', '')
    CLIENT_CODE = os.getenv('SMARTAPI_CLIENT_CODE', '')
    PIN = os.getenv('SMARTAPI_PASSWORD', '')
    API_SECRET = os.getenv('SMARTAPI_SECRET', '')
    TOTP_SECRET = os.getenv('SMARTAPI_TOTP_KEY', '')

# Trading & Timing configuration
UNDERLYING = 'NIFTY'
NIFTY_SPOT_TOKEN = '99926000'
NIFTY_SPOT_EXCHANGE = 'NSE'
FALLBACK_SPOT_PRICE = 25000.0

INDIA_VIX_SYMBOL = 'India VIX'
INDIA_VIX_TOKEN = '99926017'
INDIA_VIX_EXCHANGE = 'NSE'


TIMEZONE = 'Asia/Kolkata'
MARKET_START_TIME = '09:15'
MARKET_END_TIME = '15:30'

# 75-minute session candle close times
SESSION_75M_CLOSES = ['10:30', '11:45', '13:00', '14:15', '15:30']

# Automatic sync during market hours (auto-fetches delta candles at 10:30, 11:45, 13:00, 14:15, 15:30 IST)
AUTO_SYNC_DURING_MARKET = True

# Scan configuration
# Current month through next year end (e.g., Sep 2026 -> Dec 2027)
MAX_EXPIRY_HORIZON_MONTHS = 18

# Proximity alert threshold for Dhurandar (within 3% of L1 or Disc1)
PROXIMITY_THRESHOLD_PCT = 0.03

# Strike ranges for OTM
NEAR_MONTH_OTM_STRIKES_COUNT = 25  # Up to 25 OTM strikes above/below spot
FAR_MONTH_STRIKE_STEP = 500       # Far months focus on multiples of 500

# Strike History Backup from nifty_strikes_screener
STRIKE_HISTORY_EXTERNAL_PATH = Path(r"C:\Users\mrigt\Documents\mrig_new_laptop\python coding\korefinz americas\nifty_strikes_screener\strike_history.json")
STRIKE_HISTORY_LOCAL_PATH = DATA_DIR / 'strike_history.json'

