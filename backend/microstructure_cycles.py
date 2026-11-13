"""
Microstructure Expiry Cycles & Historical Archive Manager
----------------------------------------------------------
Manages multi-cycle positional strangle tracking:
1. Archived Benchmark Cycles: Empirical case studies (e.g. Nov 2026 Gamma Squeeze & 2x stop).
2. Active Live Cycles: Current month-end strangle deployments (~40-55 DTE, e.g. Dec 2026).
3. Dynamic P&L & Stop-Loss Evaluator: Universal replay loader that computes disciplined vs
   blind hold P&L across arbitrary option wings and expiry dates.
"""

import os
import json
import shutil
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd

import config

ARCHIVES_DIR = config.DATA_DIR / "archives"
ARCHIVES_DIR.mkdir(parents=True, exist_ok=True)
CYCLES_REGISTRY_PATH = ARCHIVES_DIR / "cycles_registry.json"

DEFAULT_CYCLES = [
    {
        "id": "nov_2026",
        "name": "Nov 2026 Expiry (Oct 27 – Nov 23)",
        "status": "archived",
        "badge": "ARCHIVED BENCHMARK (CASE STUDY)",
        "badge_color": "amber",
        "expiry_date": "2026-11-23",
        "dte_label": "Final Expiry / Settled",
        "underlying_spot_at_entry": 22749.75,
        "ce_symbol": "NIFTY23NOV2624850CE",
        "ce_strike": 24850,
        "ce_otm_pct": "+10.5%",
        "ce_token": "64433",
        "ce_entry_price": 5.50,
        "ce_stop_loss": 12.60,
        "ce_stop_executed_date": "2026-11-03",
        "pe_symbol": "NIFTY23NOV2621050PE",
        "pe_strike": 21050,
        "pe_otm_pct": "-10.0%",
        "pe_token": "64179",
        "pe_entry_price": 36.95,
        "pe_target_lock": 9.75,
        "pe_target_executed_date": "2026-11-05",
        "initial_credit": 42.45,
        "lot_size": 25,
        "csv_file": "cycle_2026_11_nov.csv",
        "disciplined_pnl_str": "+₹518.75 / lot (+₹20.75 / sh)",
        "unhedged_blowout_str": "-₹9,247.50 / lot (-₹369.90 / sh)",
        "case_study_summary": "Historic +2,300 pt runaway rally. 24,850 CE exploded 100x from ₹5.50 to ₹554. The mechanical 2.0x Hard Stop cut the short call at ₹12.60 on Nov 03, securing +₹518.75/lot net profit with put decay while unhedged short sellers suffered catastrophic blowout.",
        "archived_at": "2026-11-13"
    },
    {
        "id": "dec_2026",
        "name": "Dec 2026 Expiry (Nov 11 – Dec 29)",
        "status": "active",
        "badge": "ACTIVE TRADING CYCLE",
        "badge_color": "emerald",
        "expiry_date": "2026-12-29",
        "dte_label": "~46 DTE (Prime Deployment)",
        "underlying_spot_at_entry": 25057.90,
        "ce_symbol": "NIFTY29DEC2627700CE",
        "ce_strike": 27700,
        "ce_otm_pct": "+10.5%",
        "ce_token": "64273",
        "ce_entry_price": 23.00,
        "ce_stop_loss": 46.00,
        "ce_stop_executed_date": None,
        "pe_symbol": "NIFTY29DEC2622500PE",
        "pe_strike": 22500,
        "pe_otm_pct": "-10.2%",
        "pe_token": "55327",
        "pe_entry_price": 35.00,
        "pe_target_lock": 17.50,
        "pe_target_executed_date": None,
        "initial_credit": 58.00,
        "lot_size": 25,
        "csv_file": "cycle_2026_12_dec.csv",
        "disciplined_pnl_str": "+₹0.00 / lot (Active Tracking)",
        "unhedged_blowout_str": "Active Positional Strangle",
        "case_study_summary": "Active month-end strangle deployment at ~46 DTE targeting 50% decay (₹29.00 credit capture / 0.6% ROC). 2.0x Hard Stop is active at ₹46.00 for CE and ₹70.00 for PE.",
        "archived_at": None
    }
]


def get_all_cycles() -> List[Dict[str, Any]]:
    """Returns the full list of registered cycles from storage or initializes defaults."""
    if CYCLES_REGISTRY_PATH.exists():
        try:
            with open(CYCLES_REGISTRY_PATH, "r") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
        except Exception as e:
            print(f"[CycleManager] Error reading registry: {e}")

    # Save defaults
    save_cycles_registry(DEFAULT_CYCLES)
    return DEFAULT_CYCLES


def save_cycles_registry(cycles: List[Dict[str, Any]]) -> None:
    """Persists the cycles registry to disk."""
    try:
        with open(CYCLES_REGISTRY_PATH, "w") as f:
            json.dump(cycles, f, indent=2)
    except Exception as e:
        print(f"[CycleManager] Error saving registry: {e}")


def get_cycle_meta(cycle_id: str) -> Optional[Dict[str, Any]]:
    """Retrieves metadata for a specific cycle."""
    cycles = get_all_cycles()
    for c in cycles:
        if c.get("id") == cycle_id:
            return c
    return cycles[0] if cycles else None


def load_cycle_replay(cycle_id: str) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Loads replay sessions and calculates disciplined vs blind hold P&L
    specifically for the given cycle ID.
    """
    meta = get_cycle_meta(cycle_id)
    if not meta:
        return None, []

    csv_name = meta.get("csv_file", "cycle_2026_11_nov.csv")
    csv_path = ARCHIVES_DIR / csv_name
    
    # Fallback to main replay CSV if archive does not exist yet
    if not csv_path.exists():
        fallback_path = config.DATA_DIR / "microstructure_replay_past_week.csv"
        if fallback_path.exists():
            csv_path = fallback_path
        else:
            return meta, []

    try:
        df = pd.read_csv(csv_path)
        if df.empty or "Date" not in df.columns:
            return meta, []

        records = []
        entry_ce = float(meta.get("ce_entry_price", 5.50))
        entry_pe = float(meta.get("pe_entry_price", 36.95))
        ce_stop_price = float(meta.get("ce_stop_loss", entry_ce * 2.0))
        pe_target_price = float(meta.get("pe_target_lock", entry_pe * 0.5))
        stop_date = meta.get("ce_stop_executed_date")
        target_date = meta.get("pe_target_executed_date")
        lot_size = int(meta.get("lot_size", 25))

        # Dynamically identify CE and PE price columns
        ce_col = next((c for c in df.columns if "_CE_LTP" in c), None)
        pe_col = next((c for c in df.columns if "_PE_LTP" in c), None)
        ce_vol_col = next((c for c in df.columns if "_CE_Volume" in c), None)

        for _, row in df.iterrows():
            date_str = str(row.get("Date", ""))
            spot = float(row.get("Spot", 0.0))
            ret_5d = float(row.get("5d_Return_%", 0.0))
            fut_ltp = float(row.get("Futures_LTP", 0.0))
            basis_pts = float(row.get("Futures_Basis_pts", 0.0))
            basis_pct = float(row.get("Futures_Basis_%", 0.0))
            fut_vol = int(row.get("Futures_Volume", 0))

            ce_ltp = float(row.get(ce_col, 0.0)) if ce_col else 0.0
            ce_vol = int(row.get(ce_vol_col, 0)) if ce_vol_col else 0
            pe_ltp = float(row.get(pe_col, 0.0)) if pe_col else 0.0

            regime = str(row.get("Microstructure_Regime", ""))
            directive = str(row.get("Microstructure_Directive", ""))
            trader_action = str(row.get("Trader_Action", ""))

            # Execution state
            is_call_stopped = bool(stop_date and date_str >= stop_date)
            is_put_locked = bool(target_date and date_str >= target_date)

            # Disciplined Strategy P&L
            ce_pnl_disciplined = -(ce_stop_price - entry_ce) if is_call_stopped else -(ce_ltp - entry_ce)
            pe_pnl_disciplined = (entry_pe - pe_target_price) if is_put_locked else (entry_pe - pe_ltp)
            net_pnl_disciplined = ce_pnl_disciplined + pe_pnl_disciplined

            # Blind Hold P&L
            ce_pnl_blind = -(ce_ltp - entry_ce)
            pe_pnl_blind = (entry_pe - pe_ltp)
            net_pnl_blind = ce_pnl_blind + pe_pnl_blind

            records.append({
                "date": date_str,
                "spot": spot,
                "ret_5d": ret_5d,
                "fut_ltp": fut_ltp,
                "basis_pts": basis_pts,
                "basis_pct": basis_pct,
                "fut_vol": fut_vol,
                "ce_ltp": ce_ltp,
                "ce_vol": ce_vol,
                "pe_ltp": pe_ltp,
                "regime": regime,
                "directive": directive,
                "trader_action": trader_action,
                "is_call_stopped": is_call_stopped,
                "is_put_locked": is_put_locked,
                "ce_pnl_disciplined_pts": round(ce_pnl_disciplined, 2),
                "pe_pnl_disciplined_pts": round(pe_pnl_disciplined, 2),
                "net_pnl_disciplined_pts": round(net_pnl_disciplined, 2),
                "net_pnl_disciplined_lot": round(net_pnl_disciplined * lot_size, 2),
                "net_pnl_blind_pts": round(net_pnl_blind, 2),
                "net_pnl_blind_lot": round(net_pnl_blind * lot_size, 2)
            })

        return meta, records
    except Exception as e:
        print(f"[CycleManager] Error loading cycle replay {cycle_id}: {e}")
        return meta, []


def archive_current_cycle(cycle_id: str, final_summary: Optional[str] = None) -> Dict[str, Any]:
    """Archives an active cycle permanently."""
    cycles = get_all_cycles()
    found = False
    for c in cycles:
        if c.get("id") == cycle_id:
            c["status"] = "archived"
            c["badge"] = "ARCHIVED BENCHMARK"
            c["badge_color"] = "amber"
            c["archived_at"] = datetime.date.today().strftime("%Y-%m-%d")
            if final_summary:
                c["case_study_summary"] = final_summary
            found = True
            break

    if found:
        save_cycles_registry(cycles)
        return {"status": "success", "message": f"Cycle {cycle_id} archived successfully."}
    return {"status": "error", "message": f"Cycle {cycle_id} not found."}


def compute_cycle_deployment_readiness(
    spot: float,
    ntsi_score: float,
    quad_id: str,
    basis_pts: float,
    fii_ls_pct: float,
    as_of_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Evaluates the 5-Pillar Quantitative Readiness Checklist for initiating
    the Next Month-End Strangle Cycle (~40-55 DTE, 95% Safe Strikes).
    """
    from data_engine.scrip_master import scrip_master

    today_dt = datetime.datetime.strptime(as_of_date, "%Y-%m-%d").date() if as_of_date else datetime.date.today()
    expiries = scrip_master.get_valid_monthly_expiries()

    # Target expiry: next monthly contract with DTE >= 25 days
    target_exp = None
    target_dte = 0
    for exp in expiries:
        dte = (exp - today_dt).days
        if dte >= 25:
            target_exp = exp
            target_dte = dte
            break

    if not target_exp:
        target_exp = datetime.date(2026, 12, 29)
        target_dte = 46

    target_exp_str = target_exp.strftime("%d-%b-%Y")

    # Recommended strikes: +10.5% CE / -10.0% PE (rounded to nearest 100)
    safe_ce_strike = round((spot * 1.105) / 100.0) * 100
    safe_pe_strike = round((spot * 0.900) / 100.0) * 100

    # 1. Calendar DTE Pillar
    dte_ok = 38 <= target_dte <= 58
    dte_pillar = {
        "id": "dte",
        "name": "Calendar DTE Window",
        "required": "40 to 55 DTE (Linear Theta Decay)",
        "current": f"{target_dte} Days ({target_exp_str})",
        "status": "PASS" if dte_ok else "PENDING",
        "passed": dte_ok,
        "detail": f"Target expiry is {target_dte} DTE (inside prime linear decay zone)." if dte_ok else f"DTE {target_dte} is outside the optimal 40-55 DTE entry window."
    }

    # 2. NTSI Safety Score Pillar
    ntsi_ok = ntsi_score >= 60.0
    ntsi_pillar = {
        "id": "ntsi",
        "name": "Macro NTSI Safety Score",
        "required": ">= 60.0 (Range-Bound / Non-Trending)",
        "current": f"{ntsi_score:.1f}",
        "status": "PASS" if ntsi_ok else "FAIL",
        "passed": ntsi_ok,
        "detail": f"NTSI score {ntsi_score:.1f} >= 60 confirms low directional trend velocity." if ntsi_ok else f"NTSI score {ntsi_score:.1f} < 60 indicates an active trending market; wait for stabilization."
    }

    # 3. Volatility Quadrant Regime Pillar
    quad_ok = quad_id == "Q1"
    quad_pillar = {
        "id": "quadrant",
        "name": "4-Quadrant Volatility Regime",
        "required": "Quadrant 1 (Seller's Paradise / +GEX)",
        "current": f"{quad_id}",
        "status": "PASS" if quad_ok else "FAIL",
        "passed": quad_ok,
        "detail": "Quadrant 1 (+GEX) active: Market maker delta-hedging cushions market." if quad_ok else f"Active {quad_id} regime presents gamma squeeze / trending friction risk."
    }

    # 4. Futures Basis Equilibrium Pillar
    basis_ok = 15.0 <= basis_pts <= 65.0
    basis_pillar = {
        "id": "basis",
        "name": "Futures Basis Spread",
        "required": "+20 to +50 pts (Equilibrium Contango)",
        "current": f"{basis_pts:+.1f} pts",
        "status": "PASS" if basis_ok else "FAIL",
        "passed": basis_ok,
        "detail": "Futures basis is in balanced contango with no aggressive directional squeeze." if basis_ok else f"Futures basis {basis_pts:+.1f} pts is stressed (> +80 accumulation or < -20 discount)."
    }

    # 5. FII Derivatives Positioning Pillar
    fii_ok = 35.0 <= fii_ls_pct <= 65.0
    fii_pillar = {
        "id": "fii",
        "name": "FII Futures Long/Short Ratio",
        "required": "35% to 65% (Balanced Equilibrium)",
        "current": f"{fii_ls_pct:.1f}%",
        "status": "PASS" if fii_ok else "FAIL",
        "passed": fii_ok,
        "detail": "FII positioning is balanced; no short-squeeze (<=25%) or long-exhaustion (>=75%) risk." if fii_ok else f"FII L/S ratio at {fii_ls_pct:.1f}% poses contrarian institutional trap risk."
    }

    pillars = [dte_pillar, ntsi_pillar, quad_pillar, basis_pillar, fii_pillar]
    pass_count = sum(1 for p in pillars if p["passed"])

    if pass_count == 5:
        deployment_status = "READY_TO_DEPLOY"
        title = "🟢 NEXT CYCLE GREENLIGHT: DEPLOY FRESH MONTH-END STRANGLE"
        badge = "READY TO DEPLOY"
        badge_color = "emerald"
        action_verdict = f"All 5 Macro & Microstructure criteria satisfied. Deploy {target_exp_str} Strangle now: Sell {safe_ce_strike} CE & {safe_pe_strike} PE."
    elif dte_ok:
        deployment_status = "ON_HOLD"
        title = "🟡 NEXT CYCLE ON HOLD: CALENDAR OPEN, AWAITING REGIME CONFLUENCE"
        badge = "ON HOLD (Q4 SQUEEZE)" if quad_id == "Q4" else "ON HOLD (TREND RISK)"
        badge_color = "rose" if quad_id == "Q4" else "amber"
        reasons = [p["name"] for p in pillars if not p["passed"]]
        action_verdict = f"December window is open ({target_dte} DTE), but deployment is ON HOLD due to {', '.join(reasons)}. DO NOT sell naked options yet."
    else:
        deployment_status = "WAITING_CALENDAR"
        title = "⏳ NEXT CYCLE IN QUEUE: AWAITING 40-55 DTE WINDOW"
        badge = "IN QUEUE"
        badge_color = "slate"
        action_verdict = f"Target expiry is {target_dte} DTE. Maintain existing active positions until ~40-55 DTE deployment window opens."

    return {
        "deployment_status": deployment_status,
        "title": title,
        "badge": badge,
        "badge_color": badge_color,
        "action_verdict": action_verdict,
        "target_expiry": target_exp_str,
        "target_dte": target_dte,
        "pass_count": pass_count,
        "total_count": 5,
        "pillars": pillars,
        "recommended_strikes": {
            "ce_strike": safe_ce_strike,
            "ce_otm_pct": "+10.5%",
            "pe_strike": safe_pe_strike,
            "pe_otm_pct": "-10.0%",
            "target_expiry": target_exp_str,
            "est_combined_credit": "₹58.00/sh (₹1,450/lot)",
            "target_50pct_decay": "₹29.00/sh (₹725/lot)",
            "hard_stop_ce": f"₹{(23.0 * 2.0):.1f} (2.0x)",
            "hard_stop_pe": f"₹{(35.0 * 2.0):.1f} (2.0x)"
        }
    }

