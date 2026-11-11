import os
import json
import time
import requests
import datetime
import pandas as pd
from typing import Optional, Dict, Any
from pathlib import Path
import config

try:
    from SmartApi import SmartConnect
    import pyotp
    SMARTAPI_AVAILABLE = True
except ImportError:
    SMARTAPI_AVAILABLE = False

class SmartAPIClient:
    def __init__(self):
        self.api_key = config.API_KEY
        self.client_code = config.CLIENT_CODE
        self.pin = config.PIN
        self.api_secret = config.API_SECRET
        self.totp_secret = config.TOTP_SECRET
        
        self.smart_api = None
        self.is_connected = False
        self._load_saved_session()
        if not self.is_connected and self.totp_secret and self.pin and self.client_code:
            import threading
            threading.Thread(target=self._background_auto_login, daemon=True).start()

    def _background_auto_login(self):
        try:
            res = self.login_with_totp()
            if res.get("success"):
                print(f"[SmartAPI] Background auto-login successful for {self.client_code}")
            else:
                print(f"[SmartAPI] Background auto-login notice: {res.get('message')}")
        except Exception as e:
            print(f"[SmartAPI] Background auto-login attempt failed: {e}")

    def _load_saved_session(self):
        """Loads session tokens from session.json if fresh."""
        if not config.SESSION_FILE.exists():
            return

        try:
            with open(config.SESSION_FILE, 'r') as f:
                sess = json.load(f)
            
            # Check if login date matches today
            login_date = sess.get("login_date")
            today_str = datetime.date.today().strftime("%Y-%m-%d")
            
            if login_date == today_str and sess.get("jwt_token"):
                self.smart_api = SmartConnect(api_key=self.api_key)
                self.smart_api.access_token = sess.get("jwt_token")
                self.smart_api.refresh_token = sess.get("refresh_token")
                self.smart_api.feed_token = sess.get("feed_token")
                self.is_connected = True
                print(f"[SmartAPI] Session successfully restored for {self.client_code} ({today_str})")
        except Exception as e:
            print(f"[SmartAPI] Failed to restore session: {e}")

    def login_with_totp(self, manual_totp: Optional[str] = None) -> Dict[str, Any]:
        """Authenticates with Angel One and persists session tokens to session.json."""
        totp_code = manual_totp.strip() if manual_totp else ""
        if not totp_code and self.totp_secret:
            try:
                import pyotp
                totp_code = pyotp.TOTP(self.totp_secret).now()
            except Exception as e:
                return {"success": False, "message": f"TOTP generation failed: {e}"}

        if not totp_code or len(totp_code) != 6:
            return {"success": False, "message": "Valid 6-digit TOTP code is required"}

        login_url = "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword"
        payload = {
            "clientcode": self.client_code,
            "password": self.pin,
            "totp": totp_code,
            "state": "live"
        }
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-UserType': 'USER',
            'X-SourceID': 'WEB',
            'X-ClientLocalIP': '127.0.0.1',
            'X-ClientPublicIP': '127.0.0.1',
            'X-MACAddress': '00:00:00:00:00:00',
            'X-PrivateKey': self.api_key
        }

        try:
            res = requests.post(login_url, json=payload, headers=headers, timeout=6)
            data = res.json()
            if data.get("status"):
                tokens = {
                    "login_date": datetime.date.today().strftime("%Y-%m-%d"),
                    "jwt_token": data["data"]["jwtToken"],
                    "refresh_token": data["data"]["refreshToken"],
                    "feed_token": data["data"]["feedToken"]
                }
                with open(config.SESSION_FILE, 'w') as f:
                    json.dump(tokens, f, indent=2)

                self.smart_api = SmartConnect(api_key=self.api_key)
                self.smart_api.access_token = tokens["jwt_token"]
                self.smart_api.refresh_token = tokens["refresh_token"]
                self.smart_api.feed_token = tokens["feed_token"]
                self.is_connected = True
                return {"success": True, "message": "Login successful"}
            else:
                return {"success": False, "message": data.get("message", "Login failed")}
        except Exception as e:
            return {"success": False, "message": str(e)}

    def get_spot_price(self) -> float:
        """Fetches live Nifty 50 spot price."""
        if not self.is_connected or not self.smart_api:
            return 0.0
        try:
            res = self.smart_api.ltpData(config.NIFTY_SPOT_EXCHANGE, config.UNDERLYING, config.NIFTY_SPOT_TOKEN)
            if res.get("status"):
                return float(res.get("data", {}).get("ltp", 0.0))
        except Exception as e:
            print(f"[SmartAPI] Error fetching spot price: {e}")
        return 0.0

    def get_vix_price(self) -> float:
        """Fetches live India VIX price."""
        if not self.is_connected or not self.smart_api:
            return 0.0
        try:
            res = self.smart_api.ltpData(config.INDIA_VIX_EXCHANGE, config.INDIA_VIX_SYMBOL, config.INDIA_VIX_TOKEN)
            if res.get("status"):
                return float(res.get("data", {}).get("ltp", 0.0))
        except Exception as e:
            print(f"[SmartAPI] Error fetching India VIX price: {e}")
        return 0.0


    def fetch_candle_data(self, token: str, exchange: str, interval: str, from_date: datetime.datetime, to_date: datetime.datetime, max_retries: int = 3) -> pd.DataFrame:
        """
        Fetches historical candles with safe 1.0s pacing and adaptive backoff retries (5s, 8s)
        on Angel One rate limits (AB1021 / Access denied because of exceeding access rate).
        Logs transparent warnings in the terminal and skips individual failing tokens without
        blocking subsequent contracts.
        """
        if not self.is_connected or not self.smart_api:
            return pd.DataFrame()

        params = {
            "exchange": exchange,
            "symboltoken": str(token),
            "interval": interval,
            "fromdate": from_date.strftime("%Y-%m-%d %H:%M"),
            "todate": to_date.strftime("%Y-%m-%d %H:%M")
        }

        # Safe pacing delay (1.0s between requests)
        time.sleep(1.0)

        backoff_delays = [5.0, 8.0]

        for attempt in range(1, max_retries + 1):
            try:
                res = self.smart_api.getCandleData(params)

                # Check if broker returned rate limit status or error code
                is_rate_limit = False
                if res and isinstance(res, dict):
                    err_code = str(res.get("errorcode", "")).upper()
                    msg = str(res.get("message", "")).lower()
                    if err_code == "AB1021" or "exceeding access rate" in msg or "access denied" in msg or "too many" in msg or "rate limit" in msg:
                        is_rate_limit = True

                if is_rate_limit:
                    if attempt < max_retries:
                        cooldown = backoff_delays[min(attempt - 1, len(backoff_delays) - 1)]
                        print(f"[SmartAPI] Rate limit hit on token {token} (attempt {attempt}/3). Pausing {cooldown:.0f}s before retry...")
                        time.sleep(cooldown)
                        continue
                    else:
                        print(f"[SmartAPI] Token {token} failed after {max_retries} attempts. Skipping to next contract.")
                        return pd.DataFrame()

                if res and res.get("status") and res.get("data"):
                    df = pd.DataFrame(res["data"], columns=["timestamp", "open", "high", "low", "close", "volume"])
                    df["timestamp"] = pd.to_datetime(df["timestamp"])
                    df.set_index("timestamp", inplace=True)
                    if df.index.tz is None:
                        df.index = df.index.tz_localize("Asia/Kolkata")
                    else:
                        df.index = df.index.tz_convert("Asia/Kolkata")
                    return df

                # Empty data returned by broker (e.g. illiquid strike had no trades in the period)
                return pd.DataFrame()

            except Exception as e:
                err_msg = str(e).lower()
                is_rate_limit = ("exceeding access rate" in err_msg or "access denied" in err_msg or "ab1021" in err_msg or "too many" in err_msg or "rate" in err_msg)
                if is_rate_limit:
                    if attempt < max_retries:
                        cooldown = backoff_delays[min(attempt - 1, len(backoff_delays) - 1)]
                        print(f"[SmartAPI] Rate limit hit on token {token} (attempt {attempt}/3). Pausing {cooldown:.0f}s before retry...")
                        time.sleep(cooldown)
                    else:
                        print(f"[SmartAPI] Token {token} failed after {max_retries} attempts. Skipping to next contract.")
                        return pd.DataFrame()
                else:
                    print(f"[SmartAPI] [ERROR] Error fetching candles for token {token} ({exchange}): {e}")
                    return pd.DataFrame()

        return pd.DataFrame()

# Global singleton client
smart_client = SmartAPIClient()
