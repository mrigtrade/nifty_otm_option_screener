import os
import json
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import config

def get_report_data(window: str = "today") -> Dict[str, Any]:
    """
    Generates an executive Market Intelligence & Trade Opportunity report
    for option sellers across user-selected time horizons ('today', 'yesterday', 'week', 'all').
    """
    latest_matches_file = config.DATA_DIR / 'latest_matches.json'
    live_data = {}
    if latest_matches_file.exists():
        try:
            with open(latest_matches_file, 'r') as f:
                live_data = json.load(f)
        except Exception:
            live_data = {}

    spot_price = live_data.get("spot_price", 0.0)
    vix_price = live_data.get("vix_price", 0.0)
    live_matches = live_data.get("matches", [])

    # Load archive
    archive_file = config.ARCHIVE_FILE
    df = pd.DataFrame()
    if archive_file.exists():
        try:
            df = pd.read_csv(archive_file)
            df['dt'] = pd.to_datetime(df['timestamp'], errors='coerce')
        except Exception as e:
            print(f"[ReportEngine] Error loading archive: {e}")
            df = pd.DataFrame()

    # Ensure live matches are included so today's live session patterns are immediately analyzed
    if live_matches:
        live_rows = []
        for m in live_matches:
            trigger_lvl = m.get("l1") or m.get("disc1") or m.get("disc_level") or m.get("tenkan") or m.get("band_level") or 0.0
            ts_val = m.get("date") or m.get("trigger_date") or m.get("c3_date") or ""
            live_rows.append({
                "timestamp": ts_val,
                "symbol": m.get("symbol", ""),
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
        if live_rows:
            live_df = pd.DataFrame(live_rows)
            live_df['dt'] = pd.to_datetime(live_df['timestamp'], errors='coerce')
            if not df.empty:
                df = pd.concat([df, live_df], ignore_index=True)
                df.drop_duplicates(subset=["timestamp", "symbol", "timeframe", "pattern", "direction"], keep="last", inplace=True)
            else:
                df = live_df

    # Determine reference date:
    # When market is live or has been live during the day (Mon-Fri >= 09:15),
    # today strictly refers to today's session (now.date()).
    now = datetime.datetime.now()
    curr_time_str = now.strftime("%H:%M")
    is_market_live_or_has_been_live = (now.weekday() < 5) and (curr_time_str >= config.MARKET_START_TIME)

    all_dates = sorted([d for d in df['dt'].dt.date.dropna().unique() if pd.notna(d)], reverse=True) if not df.empty else []

    if is_market_live_or_has_been_live:
        today_date = now.date()
        past_dates = [d for d in all_dates if d < today_date]
        yesterday_date = past_dates[0] if past_dates else (today_date - datetime.timedelta(days=3 if now.weekday() == 0 else 1))
    else:
        valid_dates = [d for d in all_dates if d <= now.date()]
        today_date = valid_dates[0] if valid_dates else now.date()
        past_dates = [d for d in all_dates if d < today_date]
        yesterday_date = past_dates[0] if past_dates else (today_date - datetime.timedelta(days=1))

    # Filter df by selected window
    if df.empty:
        window_df = pd.DataFrame()
    elif window == "today":
        window_df = df[df['dt'].dt.date == today_date]
    elif window == "yesterday":
        window_df = df[df['dt'].dt.date == yesterday_date]
    elif window == "week":
        week_ago = today_date - datetime.timedelta(days=7)
        window_df = df[df['dt'].dt.date >= week_ago]
    else: # all
        window_df = df

    total_triggers = len(window_df)

    # Breakdown by option type
    ce_count = int((window_df['option_type'] == 'CE').sum()) if not window_df.empty else 0
    pe_count = int((window_df['option_type'] == 'PE').sum()) if not window_df.empty else 0
    vix_count = int((window_df['option_type'] == 'VIX').sum()) if not window_df.empty else 0

    # Macro Tone & Sentiment
    if total_triggers == 0:
        sentiment_bias = "Neutral / Quiet"
        sentiment_tone = "No triggers recorded in this timeframe window."
        bias_score = 50
    elif pe_count > ce_count * 1.3:
        sentiment_bias = "Bullish Floor / Strong Put Support"
        sentiment_tone = (
            f"Put Reversals ({pe_count}) significantly outnumber Call Reversals ({ce_count}), "
            "indicating institutional base-building and floor formation. Highly favorable for OTM Put Selling."
        )
        bias_score = min(90, int(50 + (pe_count - ce_count) / max(1, total_triggers) * 60))
    elif ce_count > pe_count * 1.3:
        sentiment_bias = "Defensive / Overhead Resistance"
        sentiment_tone = (
            f"Call Reversals ({ce_count}) outnumber Put Reversals ({pe_count}), "
            "reflecting resistance capping rallies. Favorable for OTM Call Writing and Bear Call Spreads."
        )
        bias_score = max(15, int(50 - (ce_count - pe_count) / max(1, total_triggers) * 60))
    else:
        sentiment_bias = "Balanced / Rangebound Theta Zone"
        sentiment_tone = (
            f"Balanced distribution between Call ({ce_count}) and Put ({pe_count}) reversals. "
            "Ideal for non-directional Iron Condors, Strangles, and theta capture across round strikes."
        )
        bias_score = 50

    # Volatility Regime
    if vix_price <= 0:
        vix_price = 12.80 # Fallback benchmark if not loaded

    if vix_price < 13.0:
        vix_regime = "Low Volatility Regime"
        vix_guidance = (
            f"India VIX at {vix_price:.2f} indicates low implied volatility and tight expected ranges. "
            "Option sellers should be selective with strike selection, focusing on 1 to 2 strike OTM credit spreads "
            "with disciplined stops, avoiding deep OTM selling with razor-thin risk-reward."
        )
        vix_badge_color = "emerald"
    elif vix_price <= 17.5:
        vix_regime = "Optimal Theta Regime"
        vix_guidance = (
            f"India VIX at {vix_price:.2f} provides a sweet spot for option selling with healthy premiums "
            "and manageable swing risk. Favorable for 3-5% OTM monthly Put and Call writing."
        )
        vix_badge_color = "blue"
    else:
        vix_regime = "High Volatility Regime"
        vix_guidance = (
            f"India VIX at {vix_price:.2f} signals elevated risk pricing. Option premiums are rich, "
            "favoring wide OTM delta (10-15 delta) strangle selling with defined risk parameters."
        )
        vix_badge_color = "amber"

    # Breakdown metrics
    by_pattern = {}
    by_timeframe = {}
    by_expiry = {}
    if not window_df.empty:
        for p, count in window_df['pattern'].value_counts().items():
            by_pattern[str(p)] = int(count)
        for tf, count in window_df['timeframe'].value_counts().items():
            by_timeframe[str(tf)] = int(count)
        for exp, count in window_df['expiry'].value_counts().items():
            if str(exp) != "INDEX":
                by_expiry[str(exp)] = int(count)

    # Token lookup map from live matches for chart launching
    token_map = {}
    for m in live_matches:
        token_map[m["symbol"]] = {
            "token": m.get("token", ""),
            "exch_seg": m.get("exch_seg", "NFO"),
            "ltp": m.get("ltp", 0.0),
            "l1": m.get("l1"),
            "disc1": m.get("disc1"),
            "proximity": m.get("proximity")
        }

    # 1. Multi-Timeframe & Pattern Confluences
    confluences = []
    if not window_df.empty:
        grouped = window_df.groupby("symbol")
        for symbol, group in grouped:
            timeframes = sorted(list(group['timeframe'].unique()))
            patterns = sorted(list(group['pattern'].unique()))
            # If triggered across multiple timeframes or patterns
            if len(timeframes) > 1 or len(patterns) > 1 or len(group) >= 2:
                sample = group.iloc[0]
                token_info = token_map.get(symbol, {})
                confluences.append({
                    "symbol": symbol,
                    "token": token_info.get("token", ""),
                    "strike": int(sample['strike']) if sample['strike'] != "" else 0,
                    "expiry": str(sample['expiry']),
                    "option_type": str(sample['option_type']),
                    "timeframes": timeframes,
                    "patterns": patterns,
                    "signal_count": len(group),
                    "latest_ltp": token_info.get("ltp") or float(sample['ltp']),
                    "trigger_level": float(sample['trigger_level']) if pd.notna(sample['trigger_level']) else 0.0,
                    "confluence_type": "Multi-Timeframe" if len(timeframes) > 1 else "Multi-Pattern"
                })
        confluences.sort(key=lambda x: (len(x["timeframes"]) + len(x["patterns"]), x["signal_count"]), reverse=True)
        confluences = confluences[:12]

    # 2. Proximity Watchlist (Live strikes within 3% of L1 / Disc1)
    proximity_watchlist = []
    for m in live_matches:
        if m.get("proximity") in ["Near L1", "Near Disc1"]:
            proximity_watchlist.append({
                "symbol": m["symbol"],
                "token": m.get("token", ""),
                "strike": m.get("strike", 0),
                "expiry": m.get("expiry", ""),
                "option_type": m.get("option_type", ""),
                "timeframe": m.get("timeframe", ""),
                "pattern": m.get("pattern", ""),
                "ltp": m.get("ltp", 0.0),
                "l1": m.get("l1"),
                "disc1": m.get("disc1"),
                "proximity": m.get("proximity"),
                "dist_pct": m.get("dist_l1_pct") if m.get("proximity") == "Near L1" else m.get("dist_disc1_pct", 0.0)
            })
    proximity_watchlist.sort(key=lambda x: abs(x.get("dist_pct") or 999.0))
    proximity_watchlist = proximity_watchlist[:10]

    # 3. Categorized Actionable Trade Opportunities
    put_selling_ideas = []
    call_selling_ideas = []
    vix_ideas = []

    # Pull candidate strikes from window_df and live_matches
    seen_symbols = set()
    source_items = []
    if not window_df.empty:
        for _, row in window_df.iterrows():
            source_items.append(row.to_dict())
    
    # Also incorporate live pattern matches
    for m in live_matches:
        source_items.append({
            "symbol": m["symbol"],
            "strike": m.get("strike", 0),
            "expiry": m.get("expiry", ""),
            "option_type": m.get("option_type", ""),
            "timeframe": m.get("timeframe", ""),
            "pattern": m.get("pattern", ""),
            "direction": m.get("direction", ""),
            "ltp": m.get("ltp", 0.0),
            "trigger_level": m.get("l1") or m.get("disc1") or 0.0,
            "details": m.get("proximity") or ""
        })

    for item in source_items:
        sym = item.get("symbol", "")
        if not sym or sym in seen_symbols:
            continue

        token_info = token_map.get(sym, {})
        opt_type = item.get("option_type", "")
        
        trade_card = {
            "symbol": sym,
            "token": token_info.get("token", ""),
            "strike": int(item.get("strike", 0)) if item.get("strike") else 0,
            "expiry": str(item.get("expiry", "")),
            "option_type": opt_type,
            "timeframe": str(item.get("timeframe", "")),
            "pattern": str(item.get("pattern", "")),
            "ltp": token_info.get("ltp") or float(item.get("ltp", 0.0)),
            "trigger_level": float(item.get("trigger_level", 0.0)) if pd.notna(item.get("trigger_level")) else 0.0,
            "details": str(item.get("details", "")),
            "proximity": token_info.get("proximity") or item.get("details", "")
        }

        if opt_type == "PE" and len(put_selling_ideas) < 8:
            seen_symbols.add(sym)
            put_selling_ideas.append(trade_card)
        elif opt_type == "CE" and len(call_selling_ideas) < 8:
            seen_symbols.add(sym)
            call_selling_ideas.append(trade_card)
        elif opt_type == "VIX" and len(vix_ideas) < 4:
            seen_symbols.add(sym)
            vix_ideas.append(trade_card)

    report_output = {
        "window": window,
        "selected_date": str(today_date if window == "today" else (yesterday_date if window == "yesterday" else "Past 7 Days" if window == "week" else "All Time")),
        "today_date": str(today_date),
        "yesterday_date": str(yesterday_date),
        "total_triggers": total_triggers,
        "spot_price": spot_price,
        "vix_price": vix_price,
        "sentiment": {
            "bias": sentiment_bias,
            "tone": sentiment_tone,
            "bias_score": bias_score,
            "ce_count": ce_count,
            "pe_count": pe_count,
            "vix_count": vix_count
        },
        "volatility": {
            "vix_price": vix_price,
            "regime": vix_regime,
            "guidance": vix_guidance,
            "badge_color": vix_badge_color
        },
        "confluences": confluences,
        "proximity_watchlist": proximity_watchlist,
        "trade_ideas": {
            "put_selling": put_selling_ideas,
            "call_selling": call_selling_ideas,
            "vix_alerts": vix_ideas
        },
        "metrics": {
            "by_pattern": by_pattern,
            "by_timeframe": by_timeframe,
            "by_expiry": by_expiry
        }
    }

    import math
    def sanitize_for_json(val):
        if isinstance(val, float):
            if math.isnan(val) or math.isinf(val):
                return 0.0
            return round(val, 2)
        elif isinstance(val, dict):
            return {k: sanitize_for_json(v) for k, v in val.items()}
        elif isinstance(val, list):
            return [sanitize_for_json(v) for v in val]
        return val

    return sanitize_for_json(report_output)
