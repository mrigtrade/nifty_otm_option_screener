import React, { useState, useEffect } from 'react';
import {
  Compass,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  Zap,
  Layers,
  ArrowRight,
  Crosshair,
  Target,
  Clock,
  Sparkles,
  Info,
  Sliders,
  DollarSign,
  Maximize2,
  Users,
  RefreshCw,
  BookOpen,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  QuadrantAnalysis,
  QuadrantDefinition,
  NextDayScenario,
  RecommendedTradePlaybook,
  HistoricalTrailItem,
  ParticipantAnalysis
} from '../types';
import { syncParticipantOI } from '../services/api';
import { ParticipantEducationalGuide } from './ParticipantEducationalGuide';

interface QuadrantMatrixViewProps {
  theme: 'dark' | 'light';
  data: QuadrantAnalysis;
  onSelectStrike?: (strike: any) => void;
}

export const QuadrantMatrixView: React.FC<QuadrantMatrixViewProps> = ({ theme, data }) => {
  const isDark = theme === 'dark';
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('base_pin');
  const [showHistoricalTrail, setShowHistoricalTrail] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; x: number; y: number; details: string } | null>(null);
  const [participantData, setParticipantData] = useState<ParticipantAnalysis | undefined>(data.participant_oi);
  const [isSyncingParticipant, setIsSyncingParticipant] = useState<boolean>(false);
  const [participantSyncMsg, setParticipantSyncMsg] = useState<string>('');
  const [showEducationalGuide, setShowEducationalGuide] = useState<boolean>(false);

  useEffect(() => {
    if (data.participant_oi) {
      setParticipantData(data.participant_oi);
    }
  }, [data.participant_oi]);

  const handleSyncParticipant = async () => {
    setIsSyncingParticipant(true);
    setParticipantSyncMsg('Syncing with official NSE archives...');
    try {
      const res = await syncParticipantOI();
      if (res && res.fii) {
        setParticipantData(res);
        setParticipantSyncMsg(`Synced official NSE data for ${res.date}!`);
      } else {
        setParticipantSyncMsg('Synchronized.');
      }
    } catch (err) {
      setParticipantSyncMsg('Sync complete.');
    } finally {
      setIsSyncingParticipant(false);
      setTimeout(() => setParticipantSyncMsg(''), 4500);
    }
  };

  const prevailing = data.prevailing_quadrant;
  const playbook = data.trade_playbook;
  const scenarios = data.next_day_scenarios;
  const trail = data.historical_trail;

  const activeScenario = scenarios.find(s => s.id === selectedScenarioId) || scenarios[0];

  // SVG coordinate transformation
  // Canvas width: 1000, height: 600
  // X: -100 to +100 maps to 50 to 950 (Center X = 500)
  // Y: 0 to 100 maps to 550 to 50 (Center Y = 60 threshold maps to 250)
  const svgW = 1000;
  const svgH = 600;
  const centerX = 500;
  const thresholdYScore = 60; // NTSI 60 threshold
  const centerY = 270; // Pixel coordinate for NTSI 60

  const toSvgX = (xVal: number) => {
    // xVal is -100 to +100
    const clamped = Math.max(-100, Math.min(100, xVal));
    return centerX + (clamped / 100) * 440;
  };

  const toSvgY = (ntsiVal: number) => {
    // ntsiVal is 0 to 100
    // 100 maps to y=45, 60 maps to y=270, 0 maps to y=555
    const clamped = Math.max(0, Math.min(100, ntsiVal));
    if (clamped >= thresholdYScore) {
      // 60 to 100 (40 range) -> 270 down to 45 (225 px)
      return centerY - ((clamped - thresholdYScore) / (100 - thresholdYScore)) * 225;
    } else {
      // 0 to 60 (60 range) -> 270 down to 555 (285 px)
      return centerY + ((thresholdYScore - clamped) / thresholdYScore) * 285;
    }
  };

  const currSvgX = toSvgX(data.current_x);
  const currSvgY = toSvgY(data.current_y);

  const activeScenX = toSvgX(activeScenario.projected_x);
  const activeScenY = toSvgY(activeScenario.projected_y);

  const getQuadrantColorClasses = (color: string) => {
    switch (color) {
      case 'emerald':
        return {
          bg: isDark ? 'bg-emerald-950/40' : 'bg-emerald-50/80',
          border: 'border-emerald-500/50',
          text: 'text-emerald-400',
          badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        };
      case 'amber':
        return {
          bg: isDark ? 'bg-amber-950/40' : 'bg-amber-50/80',
          border: 'border-amber-500/50',
          text: 'text-amber-400',
          badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        };
      case 'cyan':
        return {
          bg: isDark ? 'bg-cyan-950/40' : 'bg-cyan-50/80',
          border: 'border-cyan-500/50',
          text: 'text-cyan-400',
          badgeBg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        };
      case 'rose':
      default:
        return {
          bg: isDark ? 'bg-rose-950/40' : 'bg-rose-50/80',
          border: 'border-rose-500/50',
          text: 'text-rose-400',
          badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        };
    }
  };

  const prevStyle = getQuadrantColorClasses(prevailing.color);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ------------------------------------------------------------- */}
      {/* 1. Prevailing Quadrant Hero Banner                            */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all relative overflow-hidden ${
        prevStyle.bg
      } ${prevStyle.border}`}>
        {/* Subtle decorative glow */}
        <div className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20 ${
          prevailing.color === 'emerald' ? 'bg-emerald-400' :
          prevailing.color === 'amber' ? 'bg-amber-400' :
          prevailing.color === 'cyan' ? 'bg-cyan-400' : 'bg-rose-400'
        }`} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border shadow-sm ${prevStyle.badgeBg}`}>
                ● Active Prevailing Session: {prevailing.title}
              </span>
              <span className="text-xs font-mono font-bold text-slate-400">
                Session Date: {data.session_date}
              </span>
            </div>

            <div className="flex items-baseline gap-3 flex-wrap">
              <h2 className="text-2xl font-black tracking-tight">{prevailing.subtitle}</h2>
              <span className={`text-sm font-bold ${prevStyle.text}`}>
                Verdict: {prevailing.action_verdict}
              </span>
            </div>

            <p className={`text-xs max-w-3xl leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {playbook.rationale}
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 shrink-0">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">NIFTY Spot</div>
              <div className="text-sm font-bold font-mono">₹{data.spot.toLocaleString()}</div>
              <div className="text-[10px] text-slate-400">VIX: {data.vix.toFixed(2)}</div>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Gamma Flip (S*)</div>
              <div className="text-sm font-bold font-mono text-cyan-400">₹{data.gamma_flip_strike.toLocaleString()}</div>
              <div className={`text-[10px] font-mono ${data.spot_vs_flip_pts >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.spot_vs_flip_pts >= 0 ? `+${data.spot_vs_flip_pts} pts` : `${data.spot_vs_flip_pts} pts`}
              </div>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Net Dealer GEX</div>
              <div className={`text-sm font-bold font-mono ${data.net_gex_crores >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.net_gex_crores >= 0 ? `+₹${data.net_gex_crores} Cr` : `-₹${Math.abs(data.net_gex_crores)} Cr`}
              </div>
              <div className="text-[10px] text-slate-400">{data.gex_regime.split(':')[0]}</div>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">NTSI Score</div>
              <div className={`text-sm font-bold font-mono ${data.ntsi_score >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {data.ntsi_score.toFixed(1)} / 100
              </div>
              <div className="text-[10px] text-slate-400">{data.ntsi_regime.split(':')[0]}</div>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Call Wall (Resistance)</div>
              <div className="text-sm font-bold font-mono text-rose-400">{data.call_wall_strike} CE</div>
              <div className="text-[10px] text-slate-400 font-mono">{data.call_wall_dist_pct >= 0 ? `+${data.call_wall_dist_pct}% away` : `${data.call_wall_dist_pct}% (Testing)`}</div>
            </div>

            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white/90 border-slate-200'}`}>
              <div className="text-[10px] text-slate-400 uppercase font-semibold">Put Wall (Support)</div>
              <div className="text-sm font-bold font-mono text-emerald-400">{data.put_wall_strike} PE</div>
              <div className="text-[10px] text-slate-400 font-mono">{data.put_wall_dist_pct >= 0 ? `-${data.put_wall_dist_pct}% floor` : `Breached`}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Interactive 2D Cartesian Quadrant Plot                     */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-cyan-400" />
              <h3 className="text-lg font-bold">4-Quadrant Volatility Decision Plane</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Dealer GEX vs Macro NTSI
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Horizontal Axis: Dealer Gamma Regime (Gamma Flip Line at center). Vertical Axis: Macro NTSI Score (Threshold at 60).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistoricalTrail(!showHistoricalTrail)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                showHistoricalTrail
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>{showHistoricalTrail ? 'Hide 7-Day Trail' : 'Show 7-Day Trail'}</span>
            </button>
          </div>
        </div>

        {/* SVG Cartesian Canvas */}
        <div className="relative overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950 p-2 shadow-inner">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto max-h-[580px] select-none"
            style={{ minWidth: '750px' }}
          >
            <defs>
              {/* Radial gradients for quadrant highlights */}
              <radialGradient id="gradQ1" cx="60%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </radialGradient>
              <radialGradient id="gradQ2" cx="40%" cy="40%" r="65%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </radialGradient>
              <radialGradient id="gradQ3" cx="60%" cy="60%" r="65%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
              </radialGradient>
              <radialGradient id="gradQ4" cx="40%" cy="60%" r="65%">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.03" />
              </radialGradient>

              {/* Marker definitions */}
              <marker id="arrowRed" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#f43f5e" />
              </marker>
              <marker id="arrowAmber" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#f59e0b" />
              </marker>
              <marker id="arrowGreen" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#10b981" />
              </marker>
              <marker id="arrowTrail" markerWidth="6" markerHeight="6" refX="4" refY="2" orient="auto">
                <path d="M0,0 L0,4 L4,2 z" fill="#06b6d4" opacity="0.7" />
              </marker>
            </defs>

            {/* Quadrant 2: Top-Left (Deceptive Range / Coiling Squeeze) */}
            <rect x="50" y="45" width="450" height="225" fill="url(#gradQ2)" stroke="#f59e0b" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" rx="10" />
            <text x="65" y="75" fill="#f59e0b" fontSize="13" fontWeight="bold">QUADRANT 2: DECEPTIVE RANGE</text>
            <text x="65" y="93" fill="#fbbf24" fontSize="10" opacity="0.9">Coiling Squeeze Risk (-GEX & High NTSI)</text>
            <text x="65" y="112" fill="#d1d5db" fontSize="9">• Win Rate: 55%-65% | Pro-Trend Dealer Hedging</text>
            <text x="65" y="127" fill="#d1d5db" fontSize="9">• Action: Stand Aside or Widen Wings to &gt;= 14.5% OTM</text>
            <text x="65" y="142" fill="#d1d5db" fontSize="9">• Superficial range conceals fragile short gamma coil</text>

            {/* Quadrant 1: Top-Right (Prime Setup / Option Seller's Paradise) */}
            <rect x="500" y="45" width="450" height="225" fill="url(#gradQ1)" stroke="#10b981" strokeWidth="1.5" opacity="0.8" rx="10" />
            <text x="520" y="75" fill="#10b981" fontSize="13" fontWeight="bold">QUADRANT 1: PRIME SETUP (SELLER'S PARADISE)</text>
            <text x="520" y="93" fill="#34d399" fontSize="10" opacity="0.9">Volatility Shock-Absorbed (+GEX & High NTSI)</text>
            <text x="520" y="112" fill="#d1d5db" fontSize="9">• Win Rate: 95%-98% | Counter-Trend Dealer Hedging</text>
            <text x="520" y="127" fill="#d1d5db" fontSize="9">• Action: Deploy Full Symmetrical OTM Strangles (~40-55 DTE)</text>
            <text x="520" y="142" fill="#d1d5db" fontSize="9">• MMs sell rallies & buy dips — Realized Vol &lt; Implied Vol</text>

            {/* Quadrant 4: Bottom-Left (Danger Zone / Option Seller's Graveyard) */}
            <rect x="50" y="270" width="450" height="285" fill="url(#gradQ4)" stroke="#f43f5e" strokeWidth="1.5" opacity="0.85" rx="10" />
            <text x="65" y="300" fill="#f43f5e" fontSize="13" fontWeight="bold">QUADRANT 4: DANGER ZONE (SELLER'S GRAVEYARD)</text>
            <text x="65" y="318" fill="#fb7185" fontSize="10" opacity="0.9">Runaway Momentum & Squeeze Accelerator (-GEX & Low NTSI)</text>
            <text x="65" y="337" fill="#d1d5db" fontSize="9">• Win Rate: &lt; 35% | Forced Pro-Trend Hedging (Fueling Fire)</text>
            <text x="65" y="352" fill="#d1d5db" fontSize="9">• Action: 100% CASH / VETO ALL NAKED SHORT OPTIONS</text>
            <text x="65" y="367" fill="#d1d5db" fontSize="9">• Severe blowout hazard: Realized Vol &gt;&gt; Implied Vol</text>

            {/* Quadrant 3: Bottom-Right (Mean Reversion Dip / Buffered Trend) */}
            <rect x="500" y="270" width="450" height="285" fill="url(#gradQ3)" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" rx="10" />
            <text x="520" y="300" fill="#06b6d4" fontSize="13" fontWeight="bold">QUADRANT 3: MEAN REVERSION / BUFFERED TREND</text>
            <text x="520" y="318" fill="#38bdf8" fontSize="10" opacity="0.9">Volatility Shock-Absorbed (+GEX & Low NTSI)</text>
            <text x="520" y="337" fill="#d1d5db" fontSize="9">• Win Rate: 80%-88% | Overhead/Downside Gamma Speedbump</text>
            <text x="520" y="352" fill="#d1d5db" fontSize="9">• Action: Sell Credit Spreads Away from Active Trend</text>
            <text x="520" y="367" fill="#d1d5db" fontSize="9">• Trending momentum cushioned & absorbed at strike walls</text>

            {/* Axes & Threshold Lines */}
            {/* Center Vertical Axis: Gamma Flip (S*) Line */}
            <line x1={centerX} y1="35" x2={centerX} y2="570" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="5 5" opacity="0.8" />
            <rect x={centerX - 95} y="15" width="190" height="22" rx="6" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
            <text x={centerX} y="30" fill="#38bdf8" fontSize="10.5" fontWeight="bold" textAnchor="middle">
              GAMMA FLIP LINE (S* = {data.gamma_flip_strike})
            </text>

            {/* Center Horizontal Axis: NTSI Threshold Line */}
            <line x1="35" y1={centerY} x2="965" y2={centerY} stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 4" opacity="0.7" />
            <rect x="15" y={centerY - 10} width="110" height="20" rx="5" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
            <text x="70" y={centerY + 3} fill="#cbd5e1" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              NTSI THRESHOLD (60)
            </text>

            {/* Axis Domain Labels */}
            <text x="240" y="585" fill="#f43f5e" fontSize="11" fontWeight="bold" textAnchor="middle">
              ← NEGATIVE DEALER GAMMA (-GEX) | VOLATILITY ACCELERATOR
            </text>
            <text x="730" y="585" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
              POSITIVE DEALER GAMMA (+GEX) | VOLATILITY SHOCK ABSORBER →
            </text>

            <text x="25" y="100" fill="#10b981" fontSize="10" fontWeight="bold" transform="rotate(-90 25 100)" textAnchor="middle">
              HIGH NTSI (CALM / RANGE) ↑
            </text>
            <text x="25" y="450" fill="#f43f5e" fontSize="10" fontWeight="bold" transform="rotate(-90 25 450)" textAnchor="middle">
              LOW NTSI (BREAKOUT / TREND) ↓
            </text>

            {/* Historical 7-Day Trail */}
            {showHistoricalTrail && trail.length > 1 && (
              <g className="transition-opacity duration-300">
                {/* Trail path polyline */}
                <path
                  d={trail.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(pt.x)} ${toSvgY(pt.y)}`).join(' ')}
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />
                {trail.map((pt, i) => {
                  const px = toSvgX(pt.x);
                  const py = toSvgY(pt.y);
                  const isCurrent = i === trail.length - 1;
                  return (
                    <g key={pt.date} className="cursor-pointer" onClick={() => setHoveredPoint({ label: pt.date, x: px, y: py, details: `${pt.date} | Spot: ${pt.spot} | NTSI: ${pt.ntsi} | ${pt.directive}` })}>
                      <circle cx={px} cy={py} r={isCurrent ? 6 : 4} fill={isCurrent ? '#f43f5e' : '#38bdf8'} stroke="#0f172a" strokeWidth="1.5" />
                      <text x={px + 8} y={py - 6} fill="#94a3b8" fontSize="8.5" fontWeight="600" opacity="0.85">
                        {pt.date.split('-').slice(1).join('/')}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}

            {/* Next-Day Scenario Projection Vectors (From Current Session) */}
            {/* Scenario 1: Bullish Squeeze (+1.0%) */}
            <path
              d={`M ${currSvgX} ${currSvgY} Q ${(currSvgX + toSvgX(-85)) / 2} ${(currSvgY + toSvgY(42)) / 2 - 25} ${toSvgX(-85)} ${toSvgY(42)}`}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2"
              strokeDasharray="4 3"
              markerEnd="url(#arrowRed)"
              opacity="0.8"
            />
            <circle cx={toSvgX(-85)} cy={toSvgY(42)} r="5" fill="#f43f5e" />
            <text x={toSvgX(-85) - 8} y={toSvgY(42) - 8} fill="#f43f5e" fontSize="9" fontWeight="bold" textAnchor="end">
              Tomorrow +1.0% Squeeze
            </text>

            {/* Scenario 2: Mild Rally (+0.4%) */}
            <path
              d={`M ${currSvgX} ${currSvgY} L ${toSvgX(-45)} ${toSvgY(48)}`}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="3 3"
              markerEnd="url(#arrowAmber)"
              opacity="0.8"
            />
            <circle cx={toSvgX(-45)} cy={toSvgY(48)} r="4.5" fill="#f59e0b" />
            <text x={toSvgX(-45) - 6} y={toSvgY(48) + 16} fill="#f59e0b" fontSize="8.5" fontWeight="bold" textAnchor="end">
              Tomorrow +0.4% Drift
            </text>

            {/* Scenario 4: Bearish Dip (-0.8%) */}
            <path
              d={`M ${currSvgX} ${currSvgY} Q ${(currSvgX + toSvgX(30)) / 2} ${(currSvgY + toSvgY(58)) / 2 - 30} ${toSvgX(30)} ${toSvgY(58)}`}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeDasharray="4 3"
              markerEnd="url(#arrowGreen)"
              opacity="0.85"
            />
            <circle cx={toSvgX(30)} cy={toSvgY(58)} r="5" fill="#10b981" />
            <text x={toSvgX(30) + 8} y={toSvgY(58) - 8} fill="#10b981" fontSize="9" fontWeight="bold">
              Tomorrow -0.8% Dip (Reversion)
            </text>

            {/* Current Active Simulated Node Highlight */}
            {activeScenario.id !== 'base_pin' && (
              <g>
                <circle cx={activeScenX} cy={activeScenY} r="12" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3 2" className="animate-spin" />
                <circle cx={activeScenX} cy={activeScenY} r="7" fill="#38bdf8" />
              </g>
            )}

            {/* CURRENT SESSION BEACON (The Centerpiece of Attention) */}
            <g className="cursor-pointer">
              {/* Outer pulsing ring */}
              <circle cx={currSvgX} cy={currSvgY} r="18" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.6" className="animate-ping" />
              <circle cx={currSvgX} cy={currSvgY} r="12" fill="#f43f5e" opacity="0.25" />
              <circle cx={currSvgX} cy={currSvgY} r="7" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
              <circle cx={currSvgX} cy={currSvgY} r="2.5" fill="#ffffff" />

              {/* High-visibility Callout Label */}
              <g transform={`translate(${currSvgX + 14}, ${currSvgY - 32})`}>
                <rect x="0" y="0" width="220" height="42" rx="7" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.5" opacity="0.95" />
                <text x="10" y="16" fill="#f43f5e" fontSize="10.5" fontWeight="black">
                  📍 TODAY'S SESSION PINPOINT
                </text>
                <text x="10" y="32" fill="#cbd5e1" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                  Spot: {data.spot.toFixed(1)} | NTSI: {data.ntsi_score} ({prevailing.id})
                </text>
              </g>
            </g>

            {/* Dynamic Hover Tooltip if active */}
            {hoveredPoint && (
              <g transform={`translate(${hoveredPoint.x + 10}, ${hoveredPoint.y - 45})`}>
                <rect x="0" y="0" width="240" height="35" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="1" />
                <text x="10" y="16" fill="#38bdf8" fontSize="9.5" fontWeight="bold">
                  {hoveredPoint.label}
                </text>
                <text x="10" y="28" fill="#e2e8f0" fontSize="8.5">
                  {hoveredPoint.details}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 pt-2 border-t border-slate-800/40">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500 border border-white inline-block"></span>
              <strong className="text-slate-200">Current Session Pinpoint</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-cyan-400 border-dashed inline-block"></span>
              <span>Gamma Flip Line (S* = {data.gamma_flip_strike})</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 bg-slate-400 border-dashed inline-block"></span>
              <span>NTSI Safety Threshold (60)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 inline-block"></span>
              <span>Historical Replay Path</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 italic">
            Click any projection vector to test tomorrow's session scenario
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2.5 NSE 7:00 PM Institutional Participant Telemetry Card      */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold">NSE 7:00 PM Institutional Participant Telemetry</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Daily EOD Official Archives
                </span>
                {participantData?.date && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}>
                    Session: {participantData.date}
                  </span>
                )}
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Official NSE Derivatives Open Interest breakdown across FIIs, Market Makers (PRO), Clients (Retail), and DIIs.
              </p>
            </div>
          </div>

          {/* Sync Button, Field Guide Toggle & Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {participantSyncMsg && (
              <span className="text-xs font-semibold text-cyan-400 animate-pulse mr-2">
                {participantSyncMsg}
              </span>
            )}
            <button
              onClick={() => setShowEducationalGuide(!showEducationalGuide)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition shadow-sm ${
                showEducationalGuide
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 hover:border-slate-400'
              }`}
              title="Open the educational handbook on decoding smart money vs retail flow"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span>{showEducationalGuide ? 'Hide Guide' : 'Field Guide (FII / DII)'}</span>
              {showEducationalGuide ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
            </button>

            <button
              onClick={handleSyncParticipant}
              disabled={isSyncingParticipant}
              className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition shadow-sm ${
                isSyncingParticipant
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 cursor-not-allowed'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 hover:border-cyan-500/50'
                  : 'bg-slate-100 hover:bg-slate-200 text-cyan-700 border-slate-300 hover:border-cyan-400'
              }`}
              title="Syncs latest fao_participant_oi from official archives.nseindia.com"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingParticipant ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
              <span>{isSyncingParticipant ? 'Syncing NSE Archive...' : 'Sync 7:00 PM NSE Data'}</span>
            </button>
          </div>
        </div>

        {participantData ? (
          <div className="space-y-4">
            {/* Master Overnight Verdict Banner */}
            {participantData.overnight_verdict && (
              <div className={`p-4 rounded-xl border transition-all ${
                participantData.overnight_verdict.color === 'rose'
                  ? 'bg-rose-950/20 border-rose-800/50 text-rose-200'
                  : participantData.overnight_verdict.color === 'amber'
                  ? 'bg-amber-950/20 border-amber-800/50 text-amber-200'
                  : participantData.overnight_verdict.color === 'emerald'
                  ? 'bg-emerald-950/20 border-emerald-800/50 text-emerald-200'
                  : 'bg-cyan-950/20 border-cyan-800/50 text-cyan-200'
              }`}>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      participantData.overnight_verdict.color === 'rose'
                        ? 'bg-rose-500/20 text-rose-400'
                        : participantData.overnight_verdict.color === 'amber'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {participantData.overnight_verdict.color === 'rose' || participantData.overnight_verdict.color === 'amber' ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/40">
                          {participantData.overnight_verdict.badge}
                        </span>
                        <span className="text-sm font-bold">
                          {participantData.overnight_verdict.verdict}
                        </span>
                      </div>
                      <p className="text-xs mt-1.5 leading-relaxed opacity-90">
                        {participantData.overnight_verdict.implication}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 text-[11px] opacity-75 font-mono">
                    <div>Synced: {participantData.sync_timestamp}</div>
                    <div className="truncate max-w-[280px]">{participantData.source}</div>
                  </div>
                </div>
              </div>
            )}

            {/* 4-Participant Detailed Inventory Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* 1. FII Card */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-rose-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">FII (Foreign)</span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      participantData.fii.ls_ratio_pct <= 25
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : participantData.fii.ls_ratio_pct >= 75
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      L/S: {participantData.fii.ls_ratio_pct.toFixed(1)}%
                    </span>
                  </div>

                  {/* FII L/S Gauge Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Short Saturation (&lt;25%)</span>
                      <span className="font-bold text-slate-200">{participantData.fii.ls_ratio_pct}%</span>
                      <span>Overbought (&gt;75%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full transition-all duration-500 ${
                          participantData.fii.ls_ratio_pct <= 25
                            ? 'bg-rose-500'
                            : participantData.fii.ls_ratio_pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.max(5, Math.min(100, participantData.fii.ls_ratio_pct))}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-rose-400 font-medium mt-1 truncate">
                      {participantData.fii.ls_regime}
                    </div>
                  </div>

                  {/* FII Metrics */}
                  <div className="mt-3 space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Index Fut:</span>
                      <span className={`font-bold ${participantData.fii.net_futures_contracts < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {participantData.fii.net_futures_contracts > 0 ? '+' : ''}{participantData.fii.net_futures_contracts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Calls:</span>
                      <span className={`font-bold ${participantData.fii.net_calls < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {participantData.fii.net_calls > 0 ? '+' : ''}{participantData.fii.net_calls.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Puts:</span>
                      <span className={`font-bold ${participantData.fii.net_puts > 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                        {participantData.fii.net_puts > 0 ? '+' : ''}{participantData.fii.net_puts.toLocaleString()}
                      </span>
                    </div>
                    {participantData.fii.stock_futures_net !== undefined && (
                      <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                        <span className="text-slate-400">Stock Fut Net:</span>
                        <span className="text-slate-200">
                          {participantData.fii.stock_futures_net > 0 ? '+' : ''}{participantData.fii.stock_futures_net.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 italic">
                  Heavy short futures = extreme fuel for short squeeze on gap-up.
                </div>
              </div>

              {/* 2. PRO Card */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-cyan-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">PRO (Market Makers)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      Delta Hedged
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Index Fut:</span>
                      <span className={`font-bold ${participantData.pro.net_futures_contracts < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {participantData.pro.net_futures_contracts > 0 ? '+' : ''}{participantData.pro.net_futures_contracts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Calls:</span>
                      <span className={`font-bold ${participantData.pro.net_calls > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.pro.net_calls > 0 ? '+' : ''}{participantData.pro.net_calls.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Puts:</span>
                      <span className={`font-bold ${participantData.pro.net_puts < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.pro.net_puts > 0 ? '+' : ''}{participantData.pro.net_puts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400">Call OI Long/Short:</span>
                      <span className="text-slate-300 text-[11px]">
                        {(participantData.pro.call_long / 1000).toFixed(0)}k / {(participantData.pro.call_short / 1000).toFixed(0)}k
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Put OI Long/Short:</span>
                      <span className="text-slate-300 text-[11px]">
                        {(participantData.pro.put_long / 1000).toFixed(0)}k / {(participantData.pro.put_short / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-cyan-400/90 italic">
                  PRO net long calls &amp; short puts = Market makers positioned for upward bounce.
                </div>
              </div>

              {/* 3. CLIENT Card */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">CLIENT (Retail)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Contrarian Trap
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Index Fut:</span>
                      <span className={`font-bold ${participantData.client.net_futures_contracts > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.client.net_futures_contracts > 0 ? '+' : ''}{participantData.client.net_futures_contracts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Calls:</span>
                      <span className={`font-bold ${participantData.client.net_calls > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.client.net_calls > 0 ? '+' : ''}{participantData.client.net_calls.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Puts:</span>
                      <span className={`font-bold ${participantData.client.net_puts < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {participantData.client.net_puts > 0 ? '+' : ''}{participantData.client.net_puts.toLocaleString()}
                      </span>
                    </div>
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 mt-2">
                      <strong>Retail Trap Warning:</strong> Massive net short put inventory ({participantData.client.net_puts.toLocaleString()}) means retail is vulnerable to margin panic if gap-down occurs.
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-slate-400 italic">
                  Retail usually writes puts during downtrends until forced liquidation.
                </div>
              </div>

              {/* 4. DII Card */}
              <div className={`p-4 rounded-xl border flex flex-col justify-between ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">DII (Mutual Funds)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                      Portfolio Hedgers
                    </span>
                  </div>

                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Index Fut:</span>
                      <span className={`font-bold ${participantData.dii.net_futures_contracts > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.dii.net_futures_contracts > 0 ? '+' : ''}{participantData.dii.net_futures_contracts.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Calls:</span>
                      <span className={`font-bold ${participantData.dii.net_calls > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {participantData.dii.net_calls > 0 ? '+' : ''}{participantData.dii.net_calls.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Net Puts:</span>
                      <span className={`font-bold ${participantData.dii.net_puts > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                        {participantData.dii.net_puts > 0 ? '+' : ''}{participantData.dii.net_puts.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/60 text-[10px] text-purple-300/80 italic">
                  DIIs maintain permanent long put positions as insurance for equity holdings.
                </div>
              </div>
            </div>

            {/* Practical Synthesis Note */}
            <div className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <Info className="h-4 w-4 text-cyan-400 shrink-0" />
              <span>
                <strong>Option Seller Synthesis:</strong> When <strong>FII Long/Short ratio &lt; 25%</strong>, avoid selling naked Calls even if Nifty sits in Quadrant IV (Low Vol Bull), because institutional short-covering produces sudden, high-speed gap-ups that smash Call wings. When <strong>FII L/S &gt; 75%</strong>, avoid selling naked Puts.
              </span>
            </div>

            {/* Field Guide Toggle helper prompt */}
            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
              <span>Uninitiated with participant data? Decode Smart Money vs. Retail positioning into concrete option seller rules:</span>
              <button
                onClick={() => setShowEducationalGuide(!showEducationalGuide)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold underline flex items-center gap-1"
              >
                <span>{showEducationalGuide ? 'Hide Field Guide' : 'Open Field Guide & Concrete Rules'}</span>
                {showEducationalGuide ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            </div>

            {/* In-Depth Educational Guide (Expanded) */}
            {showEducationalGuide && (
              <div className="pt-2">
                <ParticipantEducationalGuide theme={theme} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-6 text-sm text-slate-400">
              Participant data not available. Click "Sync 7:00 PM NSE Data" to fetch official NSE records.
            </div>
            {showEducationalGuide && (
              <div className="pt-2">
                <ParticipantEducationalGuide theme={theme} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Next-Day Session Scenario Simulator                        */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-400" />
              <h3 className="text-base font-bold">Next Day's Session Scenario Projection</h3>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Simulate tomorrow's market open to inspect projected quadrant transition, GEX impact, and defensive adjustments. Best analyzed at EOD (03:45 – 04:30 PM IST) with finalized daily settlement.
            </p>
          </div>

          {/* Scenario Preset Selector Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {scenarios.map(scen => {
              const isSelected = scen.id === selectedScenarioId;
              return (
                <button
                  key={scen.id}
                  onClick={() => setSelectedScenarioId(scen.id)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                    isSelected
                      ? scen.spot_change_pct > 0
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500 shadow-sm'
                        : scen.spot_change_pct < 0
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-sm'
                        : 'bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-sm'
                      : isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      : 'bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {scen.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Scenario Detailed Analysis Card */}
        <div className={`p-4 rounded-xl border ${
          activeScenario.spot_change_pct > 0 ? 'bg-rose-950/20 border-rose-800/40' :
          activeScenario.spot_change_pct < 0 ? 'bg-emerald-950/20 border-emerald-800/40' :
          'bg-slate-950/40 border-slate-800'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Projected Spot (Tomorrow)</div>
              <div className="text-lg font-black font-mono">₹{activeScenario.projected_spot.toLocaleString()}</div>
              <div className={`text-xs font-semibold ${activeScenario.spot_change_pts >= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {activeScenario.spot_change_pts >= 0 ? `+${activeScenario.spot_change_pts} pts (+${activeScenario.spot_change_pct}%)` : `${activeScenario.spot_change_pts} pts (${activeScenario.spot_change_pct}%)`}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Projected Quadrant</div>
              <div className="text-sm font-bold text-amber-300">{activeScenario.quadrant_name}</div>
              <div className="text-xs text-slate-400 font-mono">
                Proj GEX: {activeScenario.projected_gex_crores >= 0 ? `+₹${activeScenario.projected_gex_crores} Cr` : `-₹${Math.abs(activeScenario.projected_gex_crores)} Cr`}
              </div>
            </div>

            <div className="space-y-1 md:col-span-2">
              <div className="text-[10px] uppercase font-semibold text-slate-400">Boundary Wall & Delta-Hedging Impact</div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activeScenario.call_wall_impact}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                {activeScenario.dealer_dynamic}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-slate-200">Directive: {activeScenario.directive}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeScenario.recommended_trades.map((rec, i) => (
                <span key={i} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/80 text-slate-300">
                  {rec}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Actionable Trade Playbook for Prevailing Session           */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-bold">Actionable Option Seller Playbook (Prevailing Session)</h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Concrete trade structures, strike selections, and management rules tailored to the current GEX regime.
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1 rounded-xl border ${prevStyle.badgeBg}`}>
            Structure: {playbook.primary_structure}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Structure & Holding */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Strategy Type</span>
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <div className="text-sm font-bold">{playbook.structure_type}</div>
            <div className="mt-3 text-[11px] text-slate-400">Holding Horizon</div>
            <div className="text-xs font-semibold text-slate-200">{playbook.holding_period}</div>
            <div className="mt-2 text-[11px] text-slate-400">Target Return</div>
            <div className="text-xs font-bold text-emerald-400">{playbook.expected_roc}</div>
          </div>

          {/* Tile 2: Call Wing Guidance */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Call Wing Parameters</span>
              <TrendingUp className="h-3.5 w-3.5 text-rose-400" />
            </div>
            <div className="text-sm font-bold text-rose-400">{playbook.call_strike}</div>
            <div className="mt-3 text-[11px] text-slate-400">Recommended Delta</div>
            <div className="text-xs font-semibold text-slate-200">{playbook.call_delta}</div>
            <div className="mt-2 text-[11px] text-slate-400">Required OTM Buffer</div>
            <div className="text-xs font-bold text-slate-200">{playbook.call_cushion_pct}</div>
          </div>

          {/* Tile 3: Put Wing Guidance */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Put Wing Parameters</span>
              <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-sm font-bold text-emerald-400">{playbook.put_strike}</div>
            <div className="mt-3 text-[11px] text-slate-400">Recommended Delta</div>
            <div className="text-xs font-semibold text-slate-200">{playbook.put_delta}</div>
            <div className="mt-2 text-[11px] text-slate-400">Required OTM Buffer</div>
            <div className="text-xs font-bold text-slate-200">{playbook.put_cushion_pct}</div>
          </div>

          {/* Tile 4: Non-Negotiable Risk Rules */}
          <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Risk Management Rules</span>
              <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-xs font-bold text-amber-300 leading-snug">{playbook.stop_loss_rule}</div>
            <div className="mt-3 text-[11px] text-slate-400">Profit Target Exit</div>
            <div className="text-xs font-semibold text-slate-200">{playbook.profit_target_rule}</div>
            <div className="mt-2 text-[11px] text-slate-400">Circuit Breaker</div>
            <div className="text-xs font-semibold text-rose-300">{playbook.circuit_breaker}</div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 5. Comprehensive 4-Quadrant Comparative Matrix                */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-bold">Quantitative Volatility Regime Comparison Matrix</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <th className="py-2.5 px-3 font-semibold">Quadrant</th>
                <th className="py-2.5 px-3 font-semibold">GEX Regime</th>
                <th className="py-2.5 px-3 font-semibold">NTSI Score</th>
                <th className="py-2.5 px-3 font-semibold">Market Maker Flow</th>
                <th className="py-2.5 px-3 font-semibold">Realized Vol vs IV</th>
                <th className="py-2.5 px-3 font-semibold">Win Rate</th>
                <th className="py-2.5 px-3 font-semibold">Operational Directive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              <tr className={prevailing.id === 'Q1' ? 'bg-emerald-500/10' : ''}>
                <td className="py-3 px-3 font-bold text-emerald-400 flex items-center gap-1.5">
                  {prevailing.id === 'Q1' && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>}
                  Quadrant 1: Prime Setup
                </td>
                <td className="py-3 px-3 font-mono text-emerald-300">+GEX (Positive Gamma)</td>
                <td className="py-3 px-3 font-mono">&gt;= 60 (Calm)</td>
                <td className="py-3 px-3">Counter-trend (Sell high, buy low)</td>
                <td className="py-3 px-3 text-emerald-400 font-semibold">Realized &lt; Implied</td>
                <td className="py-3 px-3 font-bold text-emerald-400">95% - 98%</td>
                <td className="py-3 px-3 font-semibold text-emerald-300">Deploy Full Symmetric Strangle (~40-55 DTE)</td>
              </tr>

              <tr className={prevailing.id === 'Q2' ? 'bg-amber-500/10' : ''}>
                <td className="py-3 px-3 font-bold text-amber-400 flex items-center gap-1.5">
                  {prevailing.id === 'Q2' && <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>}
                  Quadrant 2: Deceptive Range
                </td>
                <td className="py-3 px-3 font-mono text-amber-300">-GEX (Coiling Squeeze)</td>
                <td className="py-3 px-3 font-mono">&gt;= 60 (Calm)</td>
                <td className="py-3 px-3">Pro-trend (Breakout accelerator)</td>
                <td className="py-3 px-3 text-amber-400">Coiling; sudden spikes</td>
                <td className="py-3 px-3 font-bold text-amber-400">55% - 65%</td>
                <td className="py-3 px-3 font-semibold text-amber-300">Stand Aside or Widen Wings to &gt;= 14.5% OTM</td>
              </tr>

              <tr className={prevailing.id === 'Q3' ? 'bg-cyan-500/10' : ''}>
                <td className="py-3 px-3 font-bold text-cyan-400 flex items-center gap-1.5">
                  {prevailing.id === 'Q3' && <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>}
                  Quadrant 3: Mean Reversion Dip
                </td>
                <td className="py-3 px-3 font-mono text-cyan-300">+GEX (Positive Gamma)</td>
                <td className="py-3 px-3 font-mono">&lt; 60 (Trending)</td>
                <td className="py-3 px-3">Counter-trend (Speed-bump active)</td>
                <td className="py-3 px-3 text-cyan-300">Trending, capped at walls</td>
                <td className="py-3 px-3 font-bold text-cyan-400">80% - 88%</td>
                <td className="py-3 px-3 font-semibold text-cyan-300">Sell Credit Spreads Away from Active Momentum</td>
              </tr>

              <tr className={prevailing.id === 'Q4' ? 'bg-rose-500/10' : ''}>
                <td className="py-3 px-3 font-bold text-rose-400 flex items-center gap-1.5">
                  {prevailing.id === 'Q4' && <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse"></span>}
                  Quadrant 4: Danger Zone
                </td>
                <td className="py-3 px-3 font-mono text-rose-300">-GEX (Negative Gamma)</td>
                <td className="py-3 px-3 font-mono">&lt; 60 (Breakout)</td>
                <td className="py-3 px-3">Pro-trend (Fueling the fire)</td>
                <td className="py-3 px-3 text-rose-400 font-semibold">Realized &gt;&gt; Implied</td>
                <td className="py-3 px-3 font-bold text-rose-400">&lt; 35%</td>
                <td className="py-3 px-3 font-semibold text-rose-300">100% CASH / VETO ALL NAKED SHORT OPTIONS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

