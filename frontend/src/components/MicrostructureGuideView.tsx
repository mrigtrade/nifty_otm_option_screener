import React from 'react';
import {
  BookOpen,
  Compass,
  Zap,
  Layers,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Activity,
  Grid,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';

interface MicrostructureGuideViewProps {
  theme: 'dark' | 'light';
  onJumpToTab?: (tab: 'radar' | 'quadrant') => void;
}

export const MicrostructureGuideView: React.FC<MicrostructureGuideViewProps> = ({
  theme,
  onJumpToTab
}) => {
  const isDark = theme === 'dark';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cardBg = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100'
    : 'bg-white border-slate-200 text-slate-900';

  const subCardBg = isDark
    ? 'bg-slate-950/50 border-slate-800/80'
    : 'bg-slate-50 border-slate-200';

  const tableHeadBg = isDark
    ? 'bg-slate-950/70 text-slate-400 border-b border-slate-800'
    : 'bg-slate-100 text-slate-600 border-b border-slate-200';

  return (
    <div className="space-y-6">
      {/* ================================================================= */}
      {/* HERO HEADER & QUICK-JUMP SECTION STRIP                            */}
      {/* ================================================================= */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${cardBg}`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold tracking-tight">
                  Microstructure Radar &amp; Volatility Matrix — Field Interpretation Guide
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                  Reference Handbook
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-4xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                A practical, trader-focused manual decoding every banner, metric tile, replay chart, 4-Quadrant matrix state, and FII/DII participant metric in this dashboard. Built for option sellers seeking institutional edge and disciplined capital preservation.
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono px-3 py-1.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 shrink-0 self-start lg:self-center">
            Source: MICROSTRUCTURE_RADAR_INTERPRETATION_GUIDE.md
          </div>
        </div>

        {/* Sticky Quick-Jump Navigation Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/50 flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] font-bold uppercase tracking-wider mr-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
            Jump To:
          </span>
          {[
            { id: 'guide-primacy', label: '1. Decision Primacy Hierarchy' },
            { id: 'guide-controls', label: '2. Buttons & Auto-Sync' },
            { id: 'guide-telemetry', label: '3. Banners & 6 Metric Tiles' },
            { id: 'guide-charts', label: '4. Replay Charts & Audit' },
            { id: 'guide-quadrant', label: '5. 4-Quadrant Matrix' },
            { id: 'guide-fii', label: '6. 7:00 PM NSE FII/DII' },
            { id: 'guide-routine', label: '7. 3-Min Daily Routine' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold border transition ${
                isDark
                  ? 'bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border-slate-700 hover:border-indigo-500/40'
                  : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 1. DECISION PRIMACY HIERARCHY                                     */}
      {/* ================================================================= */}
      <div id="guide-primacy" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">1. Decision Primacy Hierarchy: Telemetry vs. 4-Quadrant Matrix</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Resolving conflicts cleanly via the Two-Tier Asymmetric Veto Interlock
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
            AND-Gate to Sell / OR-Gate to Veto
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5 items-center">
          {/* Left: Logic Rules & Diagram */}
          <div className="lg:col-span-5 space-y-3">
            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-emerald-950/20 border-emerald-800/40' : 'bg-emerald-50 border-emerald-200'}`}>
              <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Selling Symmetric Strangles = AND Gate
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <strong>ALL three layers</strong> (Quadrant 1 + Calm Microstructure + Balanced FII Inventory 40%–60%) must confirm safety before writing balanced OTM strangles.
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-rose-950/20 border-rose-800/40' : 'bg-rose-50 border-rose-200'}`}>
              <div className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Blocking Risk / Vetoing = OR Gate
              </div>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                A red flag in <strong>ANY single layer</strong> blocks naked option selling immediately. Calm intraday Futures Basis cannot override Quadrant 4, and Q1 calm daily indicators cannot silence an urgent Futures Basis spike.
              </p>
            </div>
          </div>

          {/* Right: Crisp Custom SVG Architecture Flow Diagram */}
          <div className={`lg:col-span-7 p-4 rounded-xl border ${subCardBg}`}>
            <svg viewBox="0 0 640 235" className="w-full h-auto select-none">
              <defs>
                <marker id="arrow-rose" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f43f5e" />
                </marker>
                <marker id="arrow-emerald" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#10b981" />
                </marker>
                <marker id="arrow-amber" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#f59e0b" />
                </marker>
              </defs>

              {/* Node 1: 4-Quadrant */}
              <rect x="12" y="16" width="185" height="52" rx="10" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#06b6d4" strokeWidth="1.5" />
              <text x="104" y="38" textAnchor="middle" fill={isDark ? '#f8fafc' : '#0f172a'} fontSize="11" fontWeight="bold">4-Quadrant Matrix</text>
              <text x="104" y="54" textAnchor="middle" fill="#06b6d4" fontSize="9.5">(Dealer GEX + Macro NTSI)</text>

              {/* Node 2: Telemetry */}
              <rect x="12" y="96" width="185" height="52" rx="10" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#10b981" strokeWidth="1.5" />
              <text x="104" y="118" textAnchor="middle" fill={isDark ? '#f8fafc' : '#0f172a'} fontSize="11" fontWeight="bold">Microstructure Telemetry</text>
              <text x="104" y="134" textAnchor="middle" fill="#10b981" fontSize="9.5">(Basis, Depth, Wall Breaches)</text>

              {/* Node 3: FII L/S */}
              <rect x="12" y="172" width="185" height="50" rx="10" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#8b5cf6" strokeWidth="1.5" />
              <text x="104" y="194" textAnchor="middle" fill={isDark ? '#f8fafc' : '#0f172a'} fontSize="11" fontWeight="bold">7:00 PM FII L/S Filter</text>
              <text x="104" y="209" textAnchor="middle" fill="#8b5cf6" fontSize="9.5">(NSE Participant OI)</text>

              {/* Down arrows when safe */}
              <path d="M 104 68 L 104 94" stroke="#10b981" strokeWidth="1.8" markerEnd="url(#arrow-emerald)" />
              <text x="112" y="84" fill="#10b981" fontSize="8.5" fontWeight="bold">Q1 Safe</text>

              <path d="M 104 148 L 104 170" stroke="#10b981" strokeWidth="1.8" markerEnd="url(#arrow-emerald)" />
              <text x="112" y="163" fill="#10b981" fontSize="8.5" fontWeight="bold">Contango OK</text>

              {/* Veto Arrow Q4 */}
              <path d="M 197 42 L 320 42" stroke="#f43f5e" strokeWidth="2" markerEnd="url(#arrow-rose)" />
              <text x="258" y="34" textAnchor="middle" fill="#f43f5e" fontSize="8.5" fontWeight="bold">Q4 Danger</text>
              <rect x="326" y="16" width="300" height="52" rx="10" fill={isDark ? 'rgba(244,63,94,0.12)' : '#fff1f2'} stroke="#f43f5e" strokeWidth="1.5" />
              <text x="476" y="37" textAnchor="middle" fill="#f43f5e" fontSize="10.5" fontWeight="bold">STRATEGIC REGIME VETO (100% CASH)</text>
              <text x="476" y="54" textAnchor="middle" fill={isDark ? '#fda4af' : '#be123c'} fontSize="9">Overrides calm intraday basis pauses</text>

              {/* Veto Arrow Telemetry */}
              <path d="M 197 122 L 320 122" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow-amber)" />
              <text x="258" y="114" textAnchor="middle" fill="#f59e0b" fontSize="8.5" fontWeight="bold">Basis &gt;= 80 / Breach</text>
              <rect x="326" y="96" width="300" height="52" rx="10" fill={isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb'} stroke="#f59e0b" strokeWidth="1.5" />
              <text x="476" y="117" textAnchor="middle" fill="#f59e0b" fontSize="10.5" fontWeight="bold">EARLY-WARNING VETO (FREEZE WING)</text>
              <text x="476" y="134" textAnchor="middle" fill={isDark ? '#fcd34d' : '#b45309'} fontSize="9">e.g. Oct 29 (+110.7 pt) warned 3 days before Q4</text>

              {/* Approved Arrow vs Overnight Veto */}
              <path d="M 197 197 L 320 197" stroke="#10b981" strokeWidth="2" markerEnd="url(#arrow-emerald)" />
              <text x="258" y="189" textAnchor="middle" fill="#10b981" fontSize="8.5" fontWeight="bold">40–60% Balanced</text>
              <rect x="326" y="172" width="300" height="50" rx="10" fill={isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5'} stroke="#10b981" strokeWidth="1.8" />
              <text x="476" y="193" textAnchor="middle" fill="#10b981" fontSize="10.5" fontWeight="bold">DEPLOY SYMMETRIC STRANGLE</text>
              <text x="476" y="209" textAnchor="middle" fill={isDark ? '#6ee7b7' : '#047857'} fontSize="9">Also veto if FII L/S &le; 25% or &ge; 75%</text>
            </svg>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800/70">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={tableHeadBg}>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Market Phase</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Primary Authority</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Why &amp; Live Case Study</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                <td className="py-3 px-3 font-bold">
                  1. Quiet Market Coiling for Breakout
                  <div className="text-[11px] font-normal text-slate-400">(Range &rarr; Trend Transition)</div>
                </td>
                <td className="py-3 px-3 font-bold text-amber-400">
                  Microstructure Telemetry
                  <div className="text-[10px] font-normal text-amber-300/80">(Early-Warning Primacy)</div>
                </td>
                <td className="py-3 px-3 leading-relaxed">
                  Daily technicals in NTSI (ADX, CHOP, 5d Ret) lag by 1–3 sessions. On <strong>Oct 29, 2026</strong>, Quadrant 1 was still green (NTSI = 80), yet <strong>Futures Basis</strong> spiked to <strong>+110.65 pts</strong>, warning <strong>3 days early</strong> before a +2,331 pt breakout. <em>Telemetry overrules Q1’s green light.</em>
                </td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                <td className="py-3 px-3 font-bold">
                  2. Active Runaway Trend / Pause
                  <div className="text-[11px] font-normal text-slate-400">(Sustained Squeeze or Cascade)</div>
                </td>
                <td className="py-3 px-3 font-bold text-rose-400">
                  4-Quadrant Volatility Matrix
                  <div className="text-[10px] font-normal text-rose-300/80">(Regime Primacy)</div>
                </td>
                <td className="py-3 px-3 leading-relaxed">
                  Mid-rally, intraday Futures Basis can temporarily cool back into +40 to +55 pt Contango. On <strong>Nov 11, 2026</strong> (Spot 25,304, 5d Ret +5.65%), intraday basis looked calm (+47.65 pts), but Spot stood <strong>+305 pts above the 25,000 CE Call Wall</strong> (-830 Cr -GEX, NTSI 34.0 = <strong>Quadrant 4</strong>). <em>Never let a pause lure you into selling naked wings in Q4.</em>
                </td>
              </tr>
              <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                <td className="py-3 px-3 font-bold">
                  3. Overnight Inventory Risk (19:00 IST)
                </td>
                <td className="py-3 px-3 font-bold text-indigo-400">
                  7:00 PM NSE FII / DII Telemetry
                </td>
                <td className="py-3 px-3 leading-relaxed">
                  Reveals <em>who</em> owns open contracts. <strong>FII Futures L/S &le; 25%</strong> signals massive short-covering fuel ready to squeeze Call wings on any overnight positive global trigger.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. HEADER BAR, CONTROLS & AUTO SESSION SYNC                       */}
      {/* ================================================================= */}
      <div id="guide-controls" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/60">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">2. Header Action Buttons &amp; Automatic Session Synchronization</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              What happens behind each execution trigger and how holidays/live sessions are tracked accurately
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="flex items-center gap-2 font-bold text-cyan-400 mb-1.5">
              <Zap className="h-4 w-4" />
              Run Microstructure Radar (Fast)
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Dispatches <strong>1 single batch quote</strong> (<code className="text-cyan-400">getMarketData('FULL')</code>) for near-month Futures, 10 ATM&plusmn;500 Call/Put walls, and replay wings (24,850 CE / 21,050 PE). Incrementally updates the replay CSV through the current session, syncs 7:00 PM NSE FII/DII data, and refreshes charts.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="flex items-center gap-2 font-bold text-purple-400 mb-1.5">
              <Layers className="h-4 w-4" />
              Run Full Pipeline
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Runs the entire institutional daily update sequentially inside <code className="text-purple-400">microstructure_engine.py</code>: <strong>(1)</strong> Daily NIFTY OHLCV &amp; NTSI macro update, <strong>(2)</strong> Single-batch Microstructure Radar &amp; Replay CSV sync, <strong>(3)</strong> NSE 7:00 PM FII/DII Sync, and <strong>(4)</strong> 4-Panel 200 DPI PNG generation.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="flex items-center gap-2 font-bold text-indigo-400 mb-1.5">
              <Users className="h-4 w-4" />
              Sync 7:00 PM NSE Data &amp; 4-Panel PNG Chart
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <strong>NSE Sync</strong> downloads official <code className="text-indigo-400">fao_participant_oi</code> CSV archives (walking back up to 7 days cleanly across holidays/weekends). <strong>4-Panel PNG</strong> opens the 200 DPI Matplotlib export modal with calibrated top headroom.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="flex items-center gap-2 font-bold text-emerald-400 mb-1.5">
              <Clock className="h-4 w-4" />
              Default View Auto-Sync &amp; Exchange Session Detection
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              On startup (<code className="text-emerald-400">python run_app.py</code>) and initial tab load (with a 180s cooldown lock), the backend parses broker <code className="text-emerald-400">exchTradeTime</code>. Live trading shows <strong>Live / Today Session</strong>; market holidays accurately stamp <strong>Last Completed Session (YYYY-MM-DD)</strong> without creating fake holiday candles.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 3. TOP EXECUTIVE DIRECTIVE BANNER & 6 TELEMETRY TILES             */}
      {/* ================================================================= */}
      <div id="guide-telemetry" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">3. Top Executive Directive Banner &amp; 6-Tile Telemetry Strip</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Reading the master verdict colors and live intraday option-chain metrics
              </p>
            </div>
          </div>
          {onJumpToTab && (
            <button
              onClick={() => onJumpToTab('radar')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition flex items-center gap-1"
            >
              <span>View Live Telemetry</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Master Directive Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-xs">
          <div className="p-3.5 rounded-xl border bg-emerald-500/10 border-emerald-500/30">
            <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="h-4 w-4" />
              EMERALD: STRANGLE APPROVED
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Quadrant 1 is active (+GEX, NTSI &ge; 60), Futures Basis sits in normal Contango, walls are &gt; 1.8% away, and FII L/S is balanced (40%–60%). Safe to deploy symmetrical month-end OTM strangles.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-rose-500/10 border-rose-500/30">
            <div className="font-bold text-rose-400 flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-4 w-4" />
              ROSE: VETO CALLS / Q4 100% CASH
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Call Wall breached, Futures Basis &ge; +80 pts, Quadrant 4 active, or FII L/S &le; 25%. Freeze naked Call sales immediately, honor 2.0x hard stops, or stick to 100% Cash / Bull Put Spreads.
            </p>
          </div>

          <div className="p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30">
            <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-4 w-4" />
              AMBER: VETO PUTS / CAUTION
            </div>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Futures Basis dropped &lt; -20 pts (Panic Backwardation), Put Wall under pressure/breached, Quadrant 2/3 regime warning, or FII L/S &ge; 75%. Use defined-risk credit spreads or stand aside.
            </p>
          </div>
        </div>

        {/* 6 Tiles Table */}
        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800/70">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={tableHeadBg}>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Telemetry Tile</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">What It Measures</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Green / Safe Zone</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Warning / Hazard Threshold</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr>
                <td className="py-2.5 px-3 font-bold">1. NIFTY Spot / VIX</td>
                <td className="py-2.5 px-3">Index level &amp; India VIX implied volatility gauge.</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">VIX 13.0 – 17.5 (Sweet Spot VRP).</td>
                <td className="py-2.5 px-3 text-rose-400">VIX &gt; 19.0 (Crisis/stand aside) or &lt; 12.0 (Underpaid risk).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">2. Futures Basis</td>
                <td className="py-2.5 px-3">Near Futures LTP minus Spot (pts &amp; %).</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">+20 to +50 pts Contango (-20 to +20 Mild Carry).</td>
                <td className="py-2.5 px-3 text-rose-400">&ge; +80 pts (Squeeze Alert: Veto Calls) &bull; &lt; -20 pts (Panic: Veto Puts).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">3. Futures Depth Ratio</td>
                <td className="py-2.5 px-3">Limit Order Book Buy Qty / Sell Qty on Futures.</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">0.8x – 1.8x (Two-way liquidity).</td>
                <td className="py-2.5 px-3 text-amber-400">&ge; 2.5x (Bullish Overdrive) &bull; &le; 0.6x (Seller Overhang).</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">4. Dominant Call Wall</td>
                <td className="py-2.5 px-3">Largest Call OI strike (+% = overhead cushion; -% = Spot above wall).</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">DEFENDED (&gt; +1.8% overhead distance).</td>
                <td className="py-2.5 px-3 text-rose-400">UNDER TEST (+0–1.8%), HIGH ALERT (Buyers &ge; 3x), <strong>BREACHED (&le; 0%)</strong>.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">5. Dominant Put Wall</td>
                <td className="py-2.5 px-3">Largest Put OI strike in the ATM&plusmn;500 corridor.</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">DEFENDED (&gt; 1.8% floor) or SUPPORT FLOOR ACTIVE (during rally).</td>
                <td className="py-2.5 px-3 text-amber-400">UNDER TEST (&le; 1.2% w/ negative flow) &bull; <strong>BREACHED (Spot &le; Put Wall)</strong>.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold">6. Near Futures</td>
                <td className="py-2.5 px-3">Front-month NIFTY futures contract &amp; LTP.</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">Liquid front contract tracked.</td>
                <td className="py-2.5 px-3 text-slate-400">Verify rollover during final 3 days before monthly expiry.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 4. FLOW CHARTS, AUDIT TABLE & TIMING CADENCE                      */}
      {/* ================================================================= */}
      <div id="guide-charts" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">4. Flow Replay Charts, Period Toolbar, Audit Table &amp; Timing Cadence</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                How to interpret the dual-axis squeeze visualizers and disciplined vs. blind P&amp;L comparison
              </p>
            </div>
          </div>
          {onJumpToTab && (
            <button
              onClick={() => onJumpToTab('radar')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition flex items-center gap-1"
            >
              <span>Inspect Replay Charts</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-cyan-400 mb-2">Chart 1 — Lead Squeeze Signal: Spot vs. Futures Basis</div>
            <ul className={`list-disc pl-4 space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li><strong>Dual-Axis Layout:</strong> Solid line plots NIFTY Spot (left Y-axis); shaded bars + thin red overlay trace Futures Basis (right Y-axis).</li>
              <li><strong>Red Squeeze Zone (&ge; +80 pts):</strong> Institutional long accumulation before cash catches up (e.g., Oct 29 spike to +110.65 pts).</li>
              <li><strong>Green Equilibrium Band (+20 to +50 pts):</strong> Balanced carry favoring range-bound decay. Zero dashed line = Fair value boundary.</li>
            </ul>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-rose-400 mb-2">Chart 2 — Call Squeeze (24,850 CE) vs. Put Decay (21,050 PE)</div>
            <ul className={`list-disc pl-4 space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li><strong>3 Y-Axis Modes:</strong> Start on <strong>Zoom Tilt (0–45)</strong> to spot the early upward curl across ₹12.60; clipped extreme spikes show red ▲ arrows; toggle <strong>Log</strong> / <strong>Linear</strong> for full blowout scale.</li>
              <li><strong>Blue Line (₹12.60):</strong> Non-negotiable <strong>2.0x Hard Stop</strong>. Saved position from a ₹600+ explosion.</li>
              <li><strong>Amber Line (₹9.75):</strong> <strong>50% Profit Target</strong> to bank early Put wing decay cleanly.</li>
            </ul>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-emerald-400 mb-2">Replay Period Filters &amp; Audit Table</div>
            <ul className={`list-disc pl-4 space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li><strong>Quick Slices:</strong> Filter across <em>All Sessions (10-27 – Latest)</em>, <em>Oct 27–30 Tell</em>, <em>Nov 02 – Latest</em>, <em>Last 5D</em>, or <em>Last 3D</em>. Hovering syncs Chart 1, Chart 2, and footers simultaneously.</li>
              <li><strong>Disciplined vs. Blind P&amp;L:</strong> Demonstrates locking net <strong>+₹518.75/lot profit</strong> (cutting threatened wing at 2x + banking 50% decay) versus passive hope losing <strong>-₹14,671+/lot</strong>.</li>
            </ul>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-purple-400 mb-2">Operational Timing &amp; Cheat Codes Accordion</div>
            <ul className={`list-disc pl-4 space-y-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <li><strong>09:15–09:45 AM:</strong> Stand by (opening MOO noise). <strong>10:00–10:30 AM:</strong> Prime entry window.</li>
              <li><strong>01:00–01:30 PM:</strong> European open transition check. <strong>03:45–04:30 PM:</strong> Best window for next-day settlement planning.</li>
              <li><strong>4 Cheat Code Tabs:</strong> 3 Basis Regimes, 3 Core Rules, 4-Quadrant Matrix summary, and Smart Money Guide.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 5. SUB-TAB 2: 4-QUADRANT VOLATILITY MATRIX                        */}
      {/* ================================================================= */}
      <div id="guide-quadrant" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Grid className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">5. Sub-Tab 2: 4-Quadrant Volatility Matrix (Dealer GEX vs. Macro NTSI)</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Mapping Dealer Gamma shock-absorption vs. runaway accelerators on a 2D Cartesian plane
              </p>
            </div>
          </div>
          {onJumpToTab && (
            <button
              onClick={() => onJumpToTab('quadrant')}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition flex items-center gap-1"
            >
              <span>Open 4-Quadrant Matrix</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Axes Explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
          <div className={`p-3.5 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-cyan-400 mb-1">Horizontal Axis (X): Dealer Gamma Exposure (GEX)</div>
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              Centered on the skew-weighted <strong>Gamma Flip Line (S*)</strong>. <strong>Right (+GEX)</strong> = Dealers sell rallies &amp; buy dips (shock absorber). <strong>Left (-GEX)</strong> = Dealers chase moves to re-hedge (volatility accelerator).
            </p>
          </div>
          <div className={`p-3.5 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-emerald-400 mb-1">Vertical Axis (Y): Macro NTSI Score (0–100)</div>
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              Centered on threshold <strong>60</strong>. <strong>Top Half (&ge; 60)</strong> = Subdued directional momentum, suppressed BBW, high choppiness. <strong>Bottom Half (&lt; 60)</strong> = Active directional trend / breakout.
            </p>
          </div>
        </div>

        {/* 4 Quadrants Matrix */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/70">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={tableHeadBg}>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Quadrant</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Location &amp; Regime</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Market Physics</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Win Rate</th>
                <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Required Option Seller Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              <tr className={isDark ? 'bg-emerald-950/15' : 'bg-emerald-50/50'}>
                <td className="py-2.5 px-3 font-bold text-emerald-400">Q1: Prime Setup<div className="text-[10px] font-normal">Seller's Paradise</div></td>
                <td className="py-2.5 px-3 font-mono">Top-Right (+GEX &amp; NTSI &ge; 60)</td>
                <td className="py-2.5 px-3">Calm technicals + MM volatility dampener.</td>
                <td className="py-2.5 px-3 font-bold text-emerald-400">95% – 98%</td>
                <td className="py-2.5 px-3 font-semibold">Deploy Full Symmetric Strangle (~40–55 DTE, +10.5% CE / -10.0% PE, 2x stop).</td>
              </tr>
              <tr className={isDark ? 'bg-amber-950/15' : 'bg-amber-50/50'}>
                <td className="py-2.5 px-3 font-bold text-amber-400">Q2: Deceptive Range<div className="text-[10px] font-normal">Coiling Squeeze</div></td>
                <td className="py-2.5 px-3 font-mono">Top-Left (-GEX &amp; NTSI &ge; 60)</td>
                <td className="py-2.5 px-3">Superficial calm hiding negative dealer gamma.</td>
                <td className="py-2.5 px-3 font-bold text-amber-400">55% – 65%</td>
                <td className="py-2.5 px-3 font-semibold">Stand aside or widen strikes &ge; &plusmn;14.5% OTM using defined Iron Condors.</td>
              </tr>
              <tr className={isDark ? 'bg-cyan-950/15' : 'bg-cyan-50/50'}>
                <td className="py-2.5 px-3 font-bold text-cyan-400">Q3: Mean Reversion<div className="text-[10px] font-normal">Buffered Trend</div></td>
                <td className="py-2.5 px-3 font-mono">Bottom-Right (+GEX &amp; NTSI &lt; 60)</td>
                <td className="py-2.5 px-3">Momentum active, capped at heavy strike walls.</td>
                <td className="py-2.5 px-3 font-bold text-cyan-400">80% – 88%</td>
                <td className="py-2.5 px-3 font-semibold">Sell defined Credit Spreads away from trend (e.g., Bull Put Spreads on supported dips).</td>
              </tr>
              <tr className={isDark ? 'bg-rose-950/15' : 'bg-rose-50/50'}>
                <td className="py-2.5 px-3 font-bold text-rose-400">Q4: Danger Zone<div className="text-[10px] font-normal">Seller's Graveyard</div></td>
                <td className="py-2.5 px-3 font-mono">Bottom-Left (-GEX &amp; NTSI &lt; 60)</td>
                <td className="py-2.5 px-3">Runaway trend + forced MM hedging accelerator.</td>
                <td className="py-2.5 px-3 font-bold text-rose-400">&lt; 35%</td>
                <td className="py-2.5 px-3 font-bold text-rose-400">100% CASH / VETO ALL NAKED OPTIONS. Enforce 2.0x hard stops unconditionally.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className={`p-3 rounded-xl border ${subCardBg}`}>
            <span className="font-bold text-cyan-400 block mb-1">Historical Replay Path</span>
            <span className="opacity-90">Cyan dashed trail traces Nifty dynamically from Oct 27 up through the current session pinpoint.</span>
          </div>
          <div className={`p-3 rounded-xl border ${subCardBg}`}>
            <span className="font-bold text-amber-400 block mb-1">Next-Day Scenario Simulator</span>
            <span className="opacity-90">Click +1.0% Squeeze, +0.4% Drift, Flat/Pin, or -0.8% Dip to preview tomorrow’s projected GEX &amp; wall impact.</span>
          </div>
          <div className={`p-3 rounded-xl border ${subCardBg}`}>
            <span className="font-bold text-emerald-400 block mb-1">Seller Playbook Card</span>
            <span className="opacity-90">Translates your current quadrant into exact OTM strike targets, deltas, stop losses, and circuit breakers.</span>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 6. NSE 7:00 PM INSTITUTIONAL PARTICIPANT TELEMETRY                */}
      {/* ================================================================= */}
      <div id="guide-fii" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center justify-between flex-wrap gap-2 pb-4 border-b border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">6. NSE 7:00 PM Institutional Participant Telemetry (FII, PRO, Client, DII)</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Located inside the 4-Quadrant tab (with interactive Field Guide expander)
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-rose-400 flex items-center gap-1.5 mb-1.5">
              <TrendingUp className="h-4 w-4" />
              FII (Foreign Investors)
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Track <strong>FII Futures L/S Ratio</strong>: <strong>&le; 25%</strong> = Extreme Short Saturation (Squeeze Hazard &rarr; Veto Calls); <strong>40%–60%</strong> = Equilibrium Safe; <strong>&ge; 75%</strong> = Exhaustion Top (Veto Puts).
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1.5">
              <Activity className="h-4 w-4" />
              PRO (Market Makers)
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              PROs delta-hedge continuously. <strong>PRO Net Calls &gt; 0 &amp; Net Puts &lt; 0</strong> confirms market makers must buy spot dips, verifying <strong>+GEX</strong> floor defense.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="h-4 w-4" />
              CLIENT (Retail Herd)
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Heavy negative <strong>Client Net Puts (-300k to -500k+)</strong> warns of over-leveraged retail put writers vulnerable to forced 10:00 AM broker RMS margin square-offs on gap-downs.
            </p>
          </div>

          <div className={`p-4 rounded-xl border ${subCardBg}`}>
            <div className="font-bold text-purple-400 flex items-center gap-1.5 mb-1.5">
              <ShieldCheck className="h-4 w-4" />
              DII (Mutual Funds)
            </div>
            <p className={`leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Persistent positive DII Net Puts represent structural tail-risk insurance for equity portfolios under SEBI rules. Treat as <strong>neutral baseline noise</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* 7. DAILY 3-MINUTE OPTION SELLER ROUTINE                           */}
      {/* ================================================================= */}
      <div id="guide-routine" className={`rounded-2xl border p-6 shadow-xl scroll-mt-4 ${cardBg}`}>
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/60">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-bold">7. Daily 3-Minute Option Seller Execution Routine</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Synthesizing Telemetry, 4-Quadrants, and 7:00 PM FII Data into repeatable habit
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
          <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/30">
            <span className="text-[10px] font-bold font-mono text-emerald-400 block mb-1">10:00 AM IST</span>
            <div className="font-bold text-sm mb-1.5">Morning Anchor Check</div>
            <p className="opacity-90 leading-relaxed">
              Click <strong>Run Microstructure Radar</strong> after opening MOO noise settles. Deploy fresh strangles ONLY if <strong>Quadrant 1 + Normal Contango + Balanced FII</strong> align.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-cyan-500/5 border-cyan-500/30">
            <span className="text-[10px] font-bold font-mono text-cyan-400 block mb-1">01:15 PM IST</span>
            <div className="font-bold text-sm mb-1.5">European Open Pulse</div>
            <p className="opacity-90 leading-relaxed">
              Quick refresh (~0.35s) to check Futures Basis shifts and verify active short strikes remain comfortably below their 2.0x stop-loss triggers.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-purple-500/5 border-purple-500/30">
            <span className="text-[10px] font-bold font-mono text-purple-400 block mb-1">03:55 PM IST</span>
            <div className="font-bold text-sm mb-1.5">EOD Pipeline &amp; Scenarios</div>
            <p className="opacity-90 leading-relaxed">
              Click <strong>Run Full Pipeline</strong> (stamps EOD NTSI score &amp; updates Google Sheets). Test +1.0%, Flat, and -0.8% vectors in the Next-Day Scenario Simulator.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-indigo-500/5 border-indigo-500/30">
            <span className="text-[10px] font-bold font-mono text-indigo-400 block mb-1">07:05 PM IST</span>
            <div className="font-bold text-sm mb-1.5">Overnight Inventory Audit</div>
            <p className="opacity-90 leading-relaxed">
              Click <strong>Sync 7:00 PM NSE Data</strong>. Verify FII L/S Ratio (25%/75% guardrails) and Client Put traps before holding short options overnight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
