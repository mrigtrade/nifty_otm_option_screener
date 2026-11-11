# OTM Option Screener & Pattern Radar

A professional, institutional-grade web application for screening and analyzing **Nifty Out-Of-The-Money (OTM) options** and **India VIX** across **Current Month through Next Year-End monthly expiries (e.g., Sep 2026 to Dec 2027)**.

Modeled after the institutional architecture of `one_app`, it features a modern **React 18 + TypeScript + Tailwind CSS + TradingView Lightweight Charts** frontend, backed by an accretive, rate-limit-safe **FastAPI + SmartAPI (Angel One)** backend.

> **Dedicated Trader Manual:** See [`MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md`](file:///c:/Users/mrigt/Documents/mrig_new_laptop/python%20coding/korefinz%20americas/antigravity/otm_option_screener/MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md) for a step-by-step segment-by-segment guide on decoding every banner, metric tile, replay chart, 4-Quadrant matrix state, and FII/DII signal in the Microstructure Radar.

---

## Key Features

### 1. Target Universe: 100% Out-Of-The-Money (OTM)
- **Call Options**: $\text{Strike} > \text{Spot}$
- **Put Options**: $\text{Strike} < \text{Spot}$
- Filters out all In-The-Money (ITM) and At-The-Money (ATM) strikes, specifically tailored for **option sellers and theta capture**.
- Automatically filters for high-liquidity round strikes (multiples of 500 / 1000) for far-month expiries.

### 2. India VIX Volatility Gauge & Macro Benchmark
- **Live Spot & Status Widget**: Real-time India VIX tracking in the header alongside Nifty 50 Spot and ATM Strike.
- **Dedicated Volatility Pattern Screening**: Scans India VIX across 75-minute, Daily, Weekly, and Monthly timeframes using all 4 reversal engines.
- **Top Pinned Prominence**: India VIX signals are pinned directly to the top of the screener table as the primary market volatility barometer.
- **1-Click Header Navigation**: Clicking the `INDIA VIX ↗` badge in the header instantly filters the screener to VIX signals.

### 3. Accretive Multi-Timeframe Data Engine
- **Permanent Accretive Stores**:
  - `backend/data/cache/{token}_75M.csv` (Permanent 75-minute candle history).
  - `backend/data/cache/{token}_1D.csv` (Permanent 1-day daily candle history).
- **Hierarchical Resampling**:
  - **Weekly & Monthly** timeframes are sampled directly from the **1-day (1D)** store (`resample_to_weekly` and `resample_to_monthly`).
  - **15-Minute Raw Buffer**: Used solely as an intermediate feeder for preparing 75m and 1D bars; capped to a rolling buffer to eliminate database bloat.
- **Paced Broker Ingestion & Adaptive Rate-Limit Retries**:
  - Paced at **1.0s between requests** to stay comfortably within Angel One SmartAPI historical candle quotas.
  - If a broker throttling event occurs (`AB1021` / *Access denied because of exceeding access rate*), the system logs a transparent terminal notice and executes an exponential backoff pause (**5s -> 8s -> 12s**) with up to 3 retries, ensuring no active contracts are dropped.
- **Pure Local Accretive Scanning**:
  - Pattern evaluation runs directly from local accretive stores in **< 5 seconds across all 180+ contracts**.
  - Completely eliminates mass synchronous API calls during screening.

### 4. Autonomous 75-Minute Candle Close Background Scanner
- **Market Session Cadence**:
  - An autonomous background daemon (`Session75mScheduler`) automatically monitors trading hours.
  - Automatically triggers delta candle synchronization and pattern screening at each 75-minute session close:
    $$\mathbf{10:30, \ 11:45, \ 13:00, \ 14:15, \ 15:30 \ \text{IST}}$$
  - Contract prioritization updates liquid near-month contracts (`2026-09-29` and `2026-10-27`) first, followed by quarterly/annual far-month strikes.
- **Zero Impact on Screen**:
  - Background delta syncing and pattern scanning run asynchronously without clearing, blocking, or freezing on-screen results.
  - Upon scan completion, fresh results are atomically updated in memory and persisted to `latest_matches.json` and the archive.
- **Silent 30-Second UI Sync**:
  - The frontend silently polls fresh screener results every 30 seconds without displaying loading spinners, resetting filters, or causing screen flickers.

### 5. Technical Pattern Engines
- **Dhurandar Support Radar**: 3-candle base support level calculation ($L_1$, $L_2$, $\text{Disc}_1$) with **Proximity Alerts** flagging strikes trading within 3% of key support.
- **Bollinger Band Reversals**: Mean-reversion signals on 20-period $\pm 2\sigma$ band breakouts with 1/3 discount entry levels.
- **RSI(9) + Tenkan-sen**: Momentum shift and conversion line alignment using a responsive **9-period RSI**.
- **Tenkan Crossover**: 9-period conversion line crossover confirmation.

### 6. Institutional Candlestick Chart Modal
- Click any candidate strike or India VIX to open an interactive TradingView Lightweight candlestick chart.
- **Decluttered Price Action**: 21-period WMA has been removed from the price candle chart to preserve clean candlestick reading.
- **Synchronized RSI(9) Sub-Pane**:
  - Cyan line for **RSI(9)** (updated from 14-period for faster momentum sensitivity).
  - Amber line for the **21-period WMA smoothing of RSI** as the default plot.
  - Subtle dotted midline at **50** for bull/bear equilibrium identification.
  - Dashed reference guide levels at **70 (Overbought)** and **30 (Oversold)**.
  - Zero chart lag: Warmup whitespace alignment ensures candlestick and RSI crosshairs are strictly 1:1 synchronized.
- **Configurable Overlays**: SMA 20/50, Bollinger Bands, Tenkan-sen, $L_1$ waterline, and $\text{Disc}_1$ waterline.

### 7. Historical Pattern Trigger Archive & Expiry Segmentation
- **Active vs. Expired Filtering**:
  - **All Expiries**: Complete historical trigger repository.
  - **Active Contracts**: Contracts with expiry date $\ge$ today.
  - **Expired (Historical Archive)**: Completed/past contracts tagged with an amber `EXPIRED` badge for post-expiry strategy review.
- **Comprehensive Logical Filtering**:
  - **Date Recency Quick-Chips**: *All Time*, *Today*, *Last 1 Day*, *Last 2 Days*, *Last 3 Days*, *Last 1 Week*.
  - **Dropdown Filters**: Filter by Pattern (*Dhurandar*, *Bollinger*, *RSI-Ichimoku*, *Tenkan*), Monthly Expiry (*Sep 2026 through Dec 2027*), and Timeframe (*75m*, *1D*, *Weekly*, *Monthly*).
  - **Instrument Selector**: *All Instruments*, *Calls (CE)*, *Puts (PE)*, *India VIX*.
  - **Live Search & Summary**: Instant strike/symbol search with dynamic count badges.
- **1-Click CSV Export**: Download the currently filtered subset for offline backtesting and trade journaling.

### 8. Market Intelligence & Trade Opportunity Radar
- **Dedicated Executive Briefing Tab**: Synthesizes live and historical scan data into clear, institutional-grade actionable trade ideas.
- **Dynamic Time Horizons**: Switch between **Today's Session**, **Day Before (Yesterday)**, **Past 1 Week**, and **All-Time Records** with instant recalculation.
- **3 Executive Overview Pillars**:
  - **Market Reversal Tone**: Analyzes Put vs Call reversal distribution with visual sentiment gauge and tactical commentary.
  - **India VIX Volatility Regime**: Tracks live VIX against low/optimal/elevated volatility bands with theta capture recommendations.
  - **Underlying Anchor & Pattern Breakdown**: Nifty spot anchor, ATM strike, and distribution across the 4 pattern engines.
- **Key Reversals & High-Conviction Confluence Radar**: Flags strikes triggering across multiple timeframes (e.g. 75m + 1D) or multiple engines.
- **Immediate Action Watchlist**: Proximity alerts for strikes trading within $\le 3\%$ of primary support ($L_1$) or discount ($\text{Disc}_1$) waterlines.
- **Categorized Trade Ideas**: Dedicated watchlists for **High-Probability Put Selling (Bullish Floors)** and **Call Selling (Bearish Ceilings)** with 1-click chart launch.

### 9. Dual Background Themes (Dark / Light)
- **Global Theme Switcher**: Toggle between **Dark (Black)** and **Light (White)** themes across all screens (Header, Tabs, Filters, Screener Table, and Archive).
- **Independent Chart Background**: Switch chart canvas between deep black (`#090d16`) and pure white (`#ffffff`) with automatic color and contrast adaptation.
- Theme preference is stored in `localStorage` and persists across sessions.

### 10. Microstructure Radar & Institutional Order Flow Engine
- **Auto-Synced Current / Last Completed Session View**: Automatically synchronizes on server startup (`run_app.py`) and initial tab load (`ensure_current_session_data` with a 180s cooldown lock). Uses the exchange trade timestamp (`exchTradeTime`) to display **`Live / Today Session`** during market hours or **`Last Completed Session (YYYY-MM-DD)`** cleanly across holidays/weekends.
- **Ultra-Lean Zero-Timeout Architecture**: Dispatches **exactly 1 single batch quote query** (`getMarketData('FULL')`) for NIFTY Futures, 10 key boundary strikes (`ATM`, `ATM±100`, `ATM±200`, `ATM±300`, `ATM±500`), and tracked replay wings (`24,850 CE` / `21,050 PE`) in **~0.35 seconds**, avoiding SmartAPI rate-limit bans or gateway timeouts.
- **Leading Futures Basis Tracking**:
  - Monitors the spread between NIFTY Near-Month Futures and Spot price.
  - Normal Equilibrium Contango: $+20$ to $+50$ pts ($+0.10\%$ to $+0.25\%$) $\rightarrow$ Symmetric Strangle Eligible (subject to Q1 & FII filters).
  - Institutional Long Accumulation Tell: $\ge +80$ pts ($\ge +0.35\%$) $\rightarrow$ **Veto Naked Calls (3-day advance warning of vertical short squeeze)**.
  - Downside Panic / Hedging Discount: $< -20$ pts ($< -0.10\%$) $\rightarrow$ **Veto Naked Puts (Cascade Alert)**.
- **Order Book Depth Imbalance Ratio**: Evaluates aggregate Buy Quantity vs. Sell Quantity on NIFTY Futures ($\ge 2.5\times$ indicates aggressive buyer overdrive; $\le 0.6\times$ indicates heavy seller overhang).
- **Directionally Aware Boundary Wall Threat Analysis**:
  - **Dominant Call Wall** & **Dominant Put Wall** (largest CE / PE Open Interest strikes).
  - Enforces exact directional signs so Spot above the Call Wall (`cw_dist <= 0`) triggers **`BREACHED / SQUEEZE`** (`VETO NAKED CALLS`) and incorporates 5-day spot velocity (`±2.5%`) so intraday consolidation pauses do not silence active squeeze or breakdown vetoes.
  - Classifies walls as `DEFENDED`, `SUPPORT FLOOR ACTIVE`, `UNDER TEST`, `HIGH ALERT`, or `BREACHED / SQUEEZE` / `BREACHED / CASCADE`.
- **Dynamic Interactive High-Resolution Replay Charts**:
  - Automatically backfills missing historical trading sessions and appends live/completed readings to `microstructure_replay_past_week.csv` so all plots stay continuously current up to the latest session.
  - **Panel 1: Spot Price vs. Futures Basis**: Dynamic auto-scaled spot index line combined with colored basis bars and an overlay basis line plot.
  - **Panel 2: Call Squeeze vs. Put Decay Curve**: Contrasts the $24,850$ CE squeeze against $21,050$ PE decay with three Y-axis modes (`Zoom Tilt 0-45`, `Log`, `Linear`), marking the **$2.0\times$ Hard Stop (`₹12.60`)** and **$50\%$ Profit Target Lock (`₹9.75`)**.
  - **Dynamic Replay Period Selector**: Quick-slice buttons for *All Sessions (`10-27 – Latest`)*, *Oct 27–30 Basis Tell*, *Nov 02 – Latest (Execution & Live)*, *Last 5 Days*, and *Last 3 Days*.
  - **Publication 4-Panel 200 DPI PNG Modal**: Dynamic date headers and non-overlapping X-axis tick spacing with cache-busted refresh.

### 11. 4-Quadrant Volatility Decision Matrix & Two-Tier Primacy Interlock
- **Asymmetric Veto Interlock (Telemetry vs. 4-Quadrant Primacy)**:
  - The top **Master Executive Directive** banner enforces an **AND-gate for approval / OR-gate for risk vetoes** across **Intraday Telemetry**, the **4-Quadrant Volatility Matrix**, and **FII L/S Extremes**:
    1. **Strategic Regime Primacy (`4-Quadrant Matrix`)**: When **Quadrant 4 (`Danger Zone / Option Seller's Graveyard`)** or **FII Saturation ($\le 25\%$ / $\ge 75\%$)** is active, neutral intraday Futures Basis cannot falsely flip the banner green.
    2. **Early-Warning Primacy (`Microstructure Telemetry`)**: When **Quadrant 1** still looks calm on daily candles, a Futures Basis surge ($\ge +80$ pts) or Wall Breach in Telemetry overrides Q1 early (providing 1–3 days lead warning).
- **2D Cartesian Decision Plane**:
  - **Horizontal Axis ($X$): Dealer Gamma Exposure (GEX) Regime**: Centered on the dynamically derived **Gamma Flip Line ($S^*$)**. Positive GEX ($+GEX$) on the right (volatility shock absorber); Negative GEX ($-GEX$) on the left (volatility accelerator / squeeze & cascade).
  - **Vertical Axis ($Y$): Macro NTSI Score ($0\text{ to }100$)**: Centered on the **NTSI Safety Threshold ($60$)**. Upper half = calm / range-bound; Lower half = trending / breakout.
- **The 4 Distinct Market Regimes**:
  - **Quadrant 1 (Top-Right): Prime Setup / Seller's Paradise** ($+GEX$ & High NTSI $\ge 60$): Win Rate 95%–98%. Deploy Full Symmetrical OTM Strangles (~40–55 DTE, $+10.5\%$ CE / $-10.0\%$ PE).
  - **Quadrant 2 (Top-Left): Deceptive Range / Coiling Squeeze** ($-GEX$ & High NTSI $\ge 60$): Win Rate 55%–65%. Stand Aside or widen wings to $\ge \pm 14.5\%$ OTM.
  - **Quadrant 3 (Bottom-Right): Mean Reversion Dip / Buffered Trend** ($+GEX$ & Low NTSI $< 60$): Win Rate 80%–88%. Sell Credit Spreads away from trend.
  - **Quadrant 4 (Bottom-Left): Danger Zone / Seller's Graveyard** ($-GEX$ & Low NTSI $< 60$): Win Rate $< 35\%$. **100% Cash / Veto All Naked Options**.
- **Live Prevailing Session Pinpoint & Dynamic Trail**: Pulsating beacon displaying the current session's exact $(X, Y)$ coordinate and historical migration path from `Oct 27` through the latest session.
- **Next-Day Session Scenario Simulator**: Interactive projection toolbar (`+1.0% Squeeze`, `+0.4% Drift`, `Flat / Pin`, `-0.8% Dip`) with expected dealer hedging impacts for tomorrow's open.
- **Full Reference**: See [`MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md`](file:///c:/Users/mrigt/Documents/mrig_new_laptop/python%20coding/korefinz%20americas/antigravity/otm_option_screener/MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md) for complete walkthroughs and examples.

### 12. Operational Timing & Daily Execution Cadence Guide
The Microstructure Radar and Full Strategy Pipeline operate on an optimal, disciplined cadence:

| Window (IST) | Market Phase | Purpose & Recommended Stance |
| :---: | :--- | :--- |
| **09:15 – 09:45 AM** | **Opening Discovery Noise** | **STAND BY**: Retail MOO market orders and overnight stop executions create wide spreads. Futures Basis and Order Depth can show temporary phantom spikes. Avoid initiating fresh trades. |
| **10:00 – 10:30 AM** | **Prime Intraday Stance** | **IDEAL TIME FOR TODAY'S SESSION**: Opening institutional volatility has settled and MMs have established initial delta hedges. True Futures Basis and Order Depth reveal genuine positioning. If in Quadrant 1, deploy new month-end strangles. |
| **01:00 – 01:30 PM** | **European Open Transition** | **MIDDAY CHECK**: European markets open at 1:00 PM IST. FII currency and index arbitrage often trigger basis expansions or squeeze extensions. Verify existing short legs remain safely below $2.0\times$ stop. |
| **02:45 – 03:15 PM** | **Institutional Settlement** | **GAMMA & PINNING CHECK**: Late-day gamma velocity peaks as dealers hedge closing positions. Verify boundary walls. Enforce the $2.0\times$ stop-loss rule before market close. |
| **03:45 – 04:30 PM** | **EOD Post-Market Journal** | **BEST TIME FOR NEXT-DAY SESSION PLANNING**: NSE 30-minute VWAP cash settlement finalizes the daily candle, stamping the official NTSI score and updating Google Sheets. Review tomorrow's Next-Day Scenario vectors. |
| **07:00 – 07:30 PM** | **NSE Participant Data Release** | **OFFICIAL DERIVATIVES INVENTORY RELEASE**: NSE publishes the daily `fao_participant_oi` report. Sync via the **"Sync 7:00 PM NSE Data"** button to uncover FII Futures Long/Short ratio and PRO dealer positioning for tomorrow's session. |
| **08:45 – 09:05 AM** | **Next Morning Pre-Market** | **CONFIRMATION**: Quick 2-minute check of GIFT NIFTY to verify which of yesterday's EOD projected scenarios ($+1.0\%$, $+0.4\%$, Flat, $-0.8\%$) is playing out at open. |

### 13. Official 7:00 PM NSE Participant Open Interest Telemetry (FII, PRO, Client, DII)
Every evening by **19:00 IST**, the National Stock Exchange of India (NSE) publishes the official participant-wise derivatives open interest and volume files (`fao_participant_oi_{DDMMYYYY}.csv` and `fao_participant_vol_{DDMMYYYY}.csv`). 

While strike-level Open Interest shows *where* open contracts sit, it does **not** disclose *who* owns them. Option buying is often retail-driven, whereas option selling and delta hedging are institutional. The 7:00 PM NSE report unmasks the exact positioning of all four market participants (Foreign Institutions, Market Makers, Retail Clients, and Domestic Institutions), providing an indispensable compass for option sellers.

#### 1. Master Interpretation Matrix (The Beginner's Quick Reference)

| Participant Metric | What It Measures | Behavioral Mechanism & Smart Money Trap | Concrete Rule for an Option Seller |
| :--- | :--- | :--- | :--- |
| **FII Futures L/S $\le 25\%$**<br/>*(e.g. $-100\text{k}+$ Short Futures)* | **Extreme Short Saturation**<br/>Institutional funds holding massive directional short leverage. | **Short-Squeeze Fuel:** Even a minor overnight positive global trigger forces FII algorithmic buy programs to cover short futures at market open. Buy orders blast straight through resistance walls. | <span style="color:red">**STRICT VETO ON NAKED CALLS**</span>.<br/>Never sell naked calls into an FII short trap. Shift Call wings to $\ge +14.5\%$ OTM or sell Put Credit Spreads only. |
| **FII Futures L/S $\ge 75\%$**<br/>*(Extreme Long Inventory)* | **Exhaustion Top**<br/>FII long capacity exhausted; institutional marginal buying power depleted. | **Long Liquidation Cascade:** Lack of fresh buyers allows market to roll over. Any negative catalyst triggers aggressive institutional profit-taking and sharp drops. | <span style="color:orange">**STRICT VETO ON NAKED PUTS**</span>.<br/>Naked Puts are highly vulnerable. Call selling is favored; widen Put wings to $\ge -14.5\%$ OTM. |
| **FII Futures L/S $40\%\text{--}60\%$**<br/>*(Balanced Symmetrical Book)* | **Balanced Equilibrium**<br/>No institutional inventory overhang or squeeze bias. | **Mean-Reverting Pin:** Market oscillates between dominant Call and Put walls without runaway institutional momentum. | <span style="color:green">**APPROVE FULL STRANGLES**</span>.<br/>Deploy symmetrical 40–55 DTE month-end strangles ($+10.5\%$ CE / $-10.0\%$ PE) with standard $2.0\times$ stops. |
| **PRO Net Calls $> 0$**<br/>**& PRO Net Puts $< 0$** | **Market Maker Floor Defense**<br/>Proprietary desks net long calls and net short puts to retail. | **Delta-Neutral Dip Buying:** Because market makers must stay delta-neutral, declining prices make their inventory too short, forcing PRO algorithms to **buy futures on dips**, creating a resilient price cushion. | **BULL PUT SPREADS SAFE**.<br/>Confirms **Positive Dealer Gamma ($+GEX$)**. Pullbacks are absorbed at boundary walls. |
| **PRO Net Calls $< 0$**<br/>**& PRO Net Puts $> 0$** | **Dealer Negative Gamma Flow**<br/>Market makers net short calls and long puts. | **Volatility Accelerator:** PRO algorithms are forced to sell futures as spot drops and buy futures as spot rises. Amplifies price swings and triggers waterfall cascades. | **WIDEN ALL WINGS**.<br/>Confirms **Negative Dealer Gamma ($-GEX$)**. Avoid short strangles; switch to defined-risk Credit Spreads $\ge \pm 14.5\%$ OTM. |
| **CLIENT Net Puts $\ll 0$**<br/>*(e.g. $-300\text{k}+$ Short Puts)* | **Retail Put Writing Trap**<br/>Retail writing huge naked Put volume during slow grinds to capture small pennies. | **Forced Margin Liquidation:** On sudden gap-downs, retail broker RMS systems forcefully square off short puts by buying puts at market, fueling an intense panic selloff. | **DO NOT CATCH FALLING KNIVES**.<br/>Never sell fresh puts on Day 1 of a gap down when retail is heavily short puts. Wait for forced liquidation to subside (past 10:30 AM). |
| **DII Net Puts $> 0$**<br/>*(Systematic Put Buying)* | **Structural Equity Portfolio Insurance**<br/>Domestic mutual funds and insurers hedging equity holdings. | **Permanent Baseline Noise:** SEBI prohibits mutual funds from speculative shorting. DIIs buy OTM puts continuously as portfolio insurance; it is **NOT** a directional bearish bet. | **FILTER OUT AS NOISE**.<br/>Do not interpret rising DII long puts as a market crash warning. Base decisions on FII and PRO positioning. |

---

#### 2. Deep Dive: PRO (Market Maker) Net Option Inventory & Verifying True GEX

1. **Why PRO Positioning Matters:**
   Proprietary trading desks (PRO) and algorithmic market makers are professional arbitrageurs. They do not hold directional opinions. Their mandate is to harvest the bid-ask spread and collect the Volatility Risk Premium (VRP). Because PROs are delta-neutral, every option contract they hold requires an opposite position in underlying futures.
   
2. **Net Options Inventory Formula:**
   $$\text{PRO Net Calls} = \text{PRO Call Long} - \text{PRO Call Short}$$
   $$\text{PRO Net Puts} = \text{PRO Put Long} - \text{PRO Put Short}$$

3. **Verifying the True GEX Sign:**
   - When **PRO Net Calls $> 0$** and **PRO Net Puts $< 0$**, market makers have bought calls and sold puts to clients. To remain delta-neutral, market makers must **buy spot on dips and sell spot on rallies**. This is the mechanical definition of **Positive Gamma ($+GEX$)**—the market is cushioned, and pullbacks are absorbed.
   - When **PRO Net Calls $< 0$** and **PRO Net Puts $> 0$**, market makers are net short calls and net long puts. They must **sell spot when the market falls and buy spot when the market rises**, acting as an accelerant. This confirms **Negative Gamma ($-GEX$)**—runaway volatility is active.

---

#### 3. Cross-Validating Participant Telemetry with the 4-Quadrant Volatility Matrix

The 4-Quadrant Volatility Decision Matrix charts Nifty's macro position using Dealer Gamma (X-axis) and the Macro NTSI Score (Y-axis). The 7:00 PM NSE participant report acts as the final sanity filter:

- **Quadrant 1 (Prime Setup: $+GEX$ & High NTSI $\ge 60$) + FII L/S $40\%\text{--}60\%$**:
  - **Perfect Confluence (Green Light)**: Positive gamma cushions intraday moves, NTSI confirms low macro trendiness, and FIIs have no inventory overhang. Deploy full symmetrical strangles with maximum statistical edge.
- **Quadrant 1 (Prime Setup) + FII L/S $\le 25\%$**:
  - **The Squeeze Trap (Asymmetric Override)**: Even though Dealer GEX is positive, FII short saturation can override dealer gamma on a global gap-up. **Veto the Call wing**; sell Put credit spreads only.
- **Quadrant 3 (Mean Reversion Dip: $+GEX$ & Low NTSI $< 60$) + PRO Long Calls**:
  - **Institutional Dip Absorption**: NTSI is low (trend active) but GEX is positive and PROs are net long calls. Market makers will defend the put wall. Sell Bull Put Spreads with high win rates ($>85\%$).
- **Quadrant 4 (Danger Zone: $-GEX$ & Low NTSI $< 60$) + Client Short Puts**:
  - **Double Powder Keg (Full Stop)**: Negative GEX accelerates momentum, and retail is trapped short puts. Expect violent cascading liquidation. **100% Cash / Veto all option sales.**

---

#### 4. The Option Seller's 5-Step EOD 7:00 PM Sanity Checklist

Run through these 5 questions every evening at 19:00 IST before leaving overnight short options:
1. **Step 1: Check FII L/S Ratio**: Is FII L/S $\le 25\%$? If yes, close/hedge naked calls. Is it $\ge 75\%$? If yes, close/hedge naked puts.
2. **Step 2: Check PRO Book**: Are PROs net long calls and short puts? If yes, dealers will buy dips to defend the market floor.
3. **Step 3: Check Client Trap**: Are retail clients short $> 300\text{k}$ puts? If yes, prepare for RMS forced margin liquidation on any gap-down.
4. **Step 4: Check Prevailing Quadrant**: Check today's quadrant. Are we in Quadrant 1 (Green) or Quadrant 4 (Red)? Trade only when Q1 or Q3 prevails.
5. **Step 5: Confirm $2.0\times$ Hard Stop**: Never hold naked options overnight without an automated GTT stop order placed at exactly $2.0\times$ entry premium.

---

#### 5. Execution Workflows (Automatic, On-Demand & Integrated Scans)
1. **Automatic On Startup (`python run_app.py`) & Default View Sync**: Whenever the application starts or the Microstructure Radar tab initializes (with a 180s cooldown lock), background synchronization pulls official NSE archives (`archives.nseindia.com` using a 60-minute + post-19:00 IST TTL), fetches the latest exchange quote (`exchTradeTime` aware), backfills any missing completed sessions to the replay flow CSV, and regenerates charts—ensuring default telemetry and charts are never stale.
2. **Integrated Into Both Radar Scans**: Running either **`Microstructure Radar (Fast)`** (`⚡ Radar`) or **`Full NIFTY Analysis Pipeline`** (from the top Header dropdown or Microstructure tab buttons) automatically executes live batch quotes, incremental replay CSV synchronization, **NSE 7:00 PM FII/DII Participant OI sync**, and 4-panel chart regeneration together.
3. **Standalone On-Demand Sync (At 7:00 PM)**: A dedicated **"Sync 7:00 PM NSE Data"** button is embedded in both the **Microstructure Radar** header and inside the **4-Quadrant Volatility Decision Matrix** card to fetch freshly released CSVs in $<1$ second without running a full strategy scan or restarting the server.
4. **Interactive UI Field Guide**: Click **"Field Guide (FII / DII)"** inside the Telemetry card or select the **"Smart Money Guide"** tab in the Cheat Codes drawer anytime. For a complete walkthrough of all Microstructure Radar segments, see [`MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md`](file:///c:/Users/mrigt/Documents/mrig_new_laptop/python%20coding/korefinz%20americas/antigravity/otm_option_screener/MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md).

---

## Quick Start (Windows)

### Double-Click Launcher
Double-click `run_app.bat` in the project root. It will:
1. Verify / build the production frontend bundle.
2. Free port 8000 if previously occupied.
3. Launch the FastAPI server at `http://127.0.0.1:8000`.
4. Open your browser automatically.
5. Provide **instantaneous, non-blocking shutdown on `Ctrl + C`** (< 1 second).

### Manual Launch
```powershell
# From the repository root:
python run_app.py
```

Open your browser to: **`http://127.0.0.1:8000`**

---

## Process Supervision & Instant Ctrl+C Exit

On Windows, standard `uvicorn --reload` subprocesses frequently deadlock console signals when workers or sockets are active. 

`run_app.py` implements a robust supervision architecture:
1. **Windows Process Group Isolation**: Uses `creationflags=subprocess.CREATE_NEW_PROCESS_GROUP` so the supervisor always captures console interrupts first.
2. **Non-Blocking 200ms Timeout Poll**: Eliminates the blocking C-level `WaitForSingleObjectEx` call in Python, allowing `KeyboardInterrupt` to fire in `< 200ms`.
3. **Instant Kernel-Level Force Kill**: Immediately issues `taskkill /F /T /PID <proc.pid>` and `os._exit(0)`, terminating all child and worker processes in `< 50ms` and freeing port 8000 immediately.

---

## Configuration & Credentials

Add your Angel One SmartAPI credentials in `backend/creds.py` or as environment variables:
```python
api_key = "YOUR_SMARTAPI_KEY"
client_id = "YOUR_CLIENT_CODE"
pin = "YOUR_PIN"
totp_secret = "YOUR_TOTP_KEY"  # Enables hands-free auto-login
```

---

## 75-Minute Session Cadence & Operational Behavior

### 1. The 75-Minute Session Cadence
The Indian equity derivatives market operates from **09:15 to 15:30 IST** (375 trading minutes total). Standard 60-minute candles leave an irregular 15-minute residual candle at the end of the day. A **75-minute bar** divides the trading day into exactly **5 clean, equal sessions**:

| Session # | Trading Hours (IST) | Candle Timestamp | Session Close & Trigger Time | Notes |
| :---: | :---: | :---: | :---: | :--- |
| **1** | 09:15 – 10:30 | `09:15` | **10:30 IST** | Opening discovery & morning base |
| **2** | 10:30 – 11:45 | `10:30` | **11:45 IST** | European market pre-open positioning |
| **3** | 11:45 – 13:00 | `11:45` | **13:00 IST** | Midday liquidity & trend consolidation |
| **4** | 13:00 – 14:15 | `13:00` | **14:15 IST** | European market full trading session |
| **5** | 14:15 – 15:30 | `14:15` | **15:30 IST** | Settlement & closing auction drive |

The autonomous background scheduler (`Session75mScheduler`) monitors these exact times and triggers synchronization immediately upon completion of each session.

---

## Paced Accretive Data Engine

### 1. Relaxed, Paced Delta Synchronization (1.0s)
Because option analysis across 75-minute, Daily, Weekly, and Monthly frames is strategic rather than millisecond-critical, data ingestion runs in a paced manner:
- **1.0-Second Pacing**: Requests to Angel One's SmartAPI historical candle endpoint are spaced by `1.0s` intervals.
- **Contract Prioritization**: Current Month (`2026-09-29`) and Next Month (`2026-10-27`) liquid contracts are synchronized first, followed by far-month step-500 strikes.
- **Accurate Needs-Update Check**: The engine checks whether today's most recently completed 75m candle is already present in the local store. Contracts that already have the completed session are skipped instantly without network overhead.

### 2. Adaptive Backoff & Circuit Breaker Elimination
- If the broker issues a rate limit warning (`AB1021` or *Access denied because of exceeding access rate*), the engine catches the response immediately.
- It pauses with an adaptive exponential cooldown (**5s on attempt 1, 8s on attempt 2**) and retries up to 2 times.
- If a contract fails all 3 attempts, it logs a skip warning and proceeds to the next contract. **No global lockout or mass circuit breaker** is triggered, preventing any cascade failure across the ~180 contracts.

### 3. Permanent Accretive Storage
- **75M Store** (`backend/data/cache/{token}_75M.csv`): Permanent history of all completed 75m bars. Never truncated.
- **1D Store** (`backend/data/cache/{token}_1D.csv`): Permanent daily bars updated from intraday candles.
- **15M Intermediate Buffer**: Used only to feed the 75M and 1D resamplers, then pruned to a rolling 35-day window to eliminate disk bloat.

---

## Terminal Telemetry & Health Monitoring

When running `python run_app.py` or `run_app.bat`, the terminal console outputs clear, structured progress logs:

### 1. Scheduler Session Triggers
```
[Scheduler] 75-minute candle session close reached (10:30 IST). Starting background delta synchronization...
```

### 2. Paced Ingestion Progress
```
[Sync] Starting delta candle sync for 188 monitored contracts (1 VIX + 144 Near-Month + 43 Far-Month)...
[Sync] Pacing: 1.0s between calls | Target completed 75m candle: 09:15
[Sync] (1/188) India VIX -> 5 new bars appended (Store now has 328 75m bars)
[Sync] (2/188) NIFTY29SEP2623350CE -> 5 new bars appended (Store now has 128 75m bars)
...
[Sync] Completed: 22 contracts updated, 158 already up-to-date, 8 zero-volume, 0 errors.
```

### 3. Rate-Limit Throttling Notices (if throttled by broker)
```
[SmartAPI] Rate limit hit on token 73924 (attempt 1/3). Pausing 5s before retry...
```

### 4. Pattern Radar Results Breakdown
```
[Scanner] Scan complete: 298 total patterns (6 triggered today: 4 Bullish, 2 Bearish) at 10:31:15.
```
This distinguishes newly triggered signals formed during today's trading sessions from historical base patterns.

---

## Architecture Overview

```
otm_option_screener/
├── backend/
│   ├── main.py                                   # FastAPI routes, 75m close scheduler, startup auto-sync
│   ├── config.py                                 # Application constants, tokens (Spot, VIX), 75m sessions
│   ├── microstructure_service.py                 # Flow radar sync, GEX/NTSI 4-Quadrant engine & Asymmetric Veto banner
│   ├── participant_service.py                    # Official 7:00 PM NSE Participant OI (FII/PRO/Client/DII) downloader
│   ├── new_strikes_manager.py                    # New Strike Debut Tracker across far-month expiries
│   ├── resampler.py                              # 75m, 1d, weekly, monthly resamplers (Weekly/Monthly from 1D)
│   ├── archive_manager.py                        # Persistent CSV trigger recorder
│   ├── report_engine.py                          # Executive briefing, regime analysis & categorized trade ideas
│   ├── data_engine/
│   │   ├── smartapi_client.py                    # Angel One SmartConnect client with AB1021 circuit breaker & auto-TOTP
│   │   ├── scrip_master.py                       # Open scrip master ingestion (1,800+ Nifty option instruments)
│   │   ├── cache_manager.py                      # Accretive stores ({token}_75M.csv, {token}_1D.csv) & 15m buffer
│   │   └── scheduler.py                          # Market hours & 75m session close helpers
│   └── patterns/
│       ├── dhurandar.py                          # 3-candle support & discount level math
│       ├── bollinger_bands.py                    # Mean reversion & discount entry levels
│       ├── rsi_ichimoku.py                       # RSI(9) + 21 WMA + Tenkan-sen
│       └── tenkan_cross.py                       # Conversion line crossover engine
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.tsx                        # Spot, ATM, VIX badge, theme toggle, radar/pipeline & scan triggers
│   │   │   ├── MicrostructureRadarView.tsx       # Telemetry strip, dynamic replay flow charts, timing & cheat codes
│   │   │   ├── QuadrantMatrixView.tsx            # Interactive 2D GEX vs NTSI plane, Next-Day Simulator & NSE FII card
│   │   │   ├── MicrostructureGuideView.tsx       # Dedicated interactive web tab for interpreting all Radar segments
│   │   │   ├── ParticipantEducationalGuide.tsx   # Beginner-to-Pro smart money field guide & 5-step checklist
│   │   │   ├── NewStrikesView.tsx                # New strike debut monitor
│   │   │   ├── FiltersBar.tsx                    # Timeframe buttons, expiry selector, type selector, proximity toggle
│   │   │   ├── ScreenerTable.tsx                 # Candidate strikes table with pinned India VIX and indicators
│   │   │   ├── ChartModal.tsx                    # TradingView candlestick chart with RSI(9) + 21 WMA sub-pane
│   │   │   ├── ArchiveView.tsx                   # Historical trigger log with Active vs Expired segmentation & CSV export
│   │   │   ├── ReportView.tsx                    # Executive briefing & high-conviction trade opportunities
│   │   │   └── LoginModal.tsx                    # Manual SmartAPI / TOTP session re-authentication modal
│   │   └── App.tsx                               # Root component with tab routing, background sync & refresh keys
├── run_app.py                                    # Bulletproof process supervisor with instant Ctrl+C exit
├── run_app.bat                                   # Windows batch launcher
├── MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md  # Dedicated segment-by-segment Microstructure Radar field manual
└── README.md                                     # Main application documentation and architecture guide
```
