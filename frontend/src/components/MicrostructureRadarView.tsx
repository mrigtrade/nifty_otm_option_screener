import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info,
  ChevronDown,
  ChevronUp,
  Calendar,
  Eye,
  Sliders,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  ExternalLink,
  Grid,
  Clock,
  X,
  Users,
  BookOpen
} from 'lucide-react';
import {
  MicrostructurePayload,
  MicrostructureReplayItem,
  BasisRegimeCheatCode,
  CoreRuleCheatCode,
  DecisionMatrixItem
} from '../types';
import { getMicrostructureData, runMicrostructure, getMicrostructureStatus, syncParticipantOI } from '../services/api';
import { QuadrantMatrixView } from './QuadrantMatrixView';
import { ParticipantEducationalGuide } from './ParticipantEducationalGuide';
import { MicrostructureGuideView } from './MicrostructureGuideView';

interface MicrostructureRadarViewProps {
  theme: 'dark' | 'light';
  onSelectStrike?: (strike: any) => void;
  refreshKey?: number;
  externalIsRunning?: boolean;
}

export const MicrostructureRadarView: React.FC<MicrostructureRadarViewProps> = ({
  theme,
  onSelectStrike,
  refreshKey = 0,
  externalIsRunning = false
}) => {
  const isDark = theme === 'dark';
  const [data, setData] = useState<MicrostructurePayload | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'radar' | 'quadrant' | 'guide'>('radar');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execMessage, setExecMessage] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'tell' | 'execution' | '5d' | '3d'>('all');
  const [chartScaleMode, setChartScaleMode] = useState<'zoomed' | 'log' | 'linear'>('zoomed');
  const [activeCheatTab, setActiveCheatTab] = useState<'regimes' | 'rules' | 'matrix' | 'participant'>('regimes');
  const [hoveredReplayDate, setHoveredReplayDate] = useState<string | null>(null);
  const [showNativeChartModal, setShowNativeChartModal] = useState<boolean>(false);
  const [showCheatCodes, setShowCheatCodes] = useState<boolean>(true);
  const [showTimingGuide, setShowTimingGuide] = useState<boolean>(true);
  const [isSyncingParticipant, setIsSyncingParticipant] = useState<boolean>(false);
  const [participantSyncMsg, setParticipantSyncMsg] = useState<string>('');
  const [chartImgTs, setChartImgTs] = useState<number>(() => Date.now());

  // Handle manual sync of official 7:00 PM NSE Participant OI
  const handleSyncParticipant = async () => {
    setIsSyncingParticipant(true);
    setParticipantSyncMsg('Syncing 7:00 PM NSE participant OI from official archives...');
    try {
      const res = await syncParticipantOI();
      if (res && res.fii) {
        setParticipantSyncMsg(`Synced official NSE data for ${res.date}!`);
        await loadData();
      } else {
        setParticipantSyncMsg('NSE Participant data refreshed.');
      }
    } catch (err: any) {
      console.error('Participant sync error:', err);
      setParticipantSyncMsg(err.message || 'Sync complete');
    } finally {
      setIsSyncingParticipant(false);
      setTimeout(() => setParticipantSyncMsg(''), 4500);
    }
  };

  // Fetch microstructure data
  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await getMicrostructureData();
      setData(res);
      setChartImgTs(Date.now());
      if (res.runner_state?.is_running) {
        setIsExecuting(true);
        setExecMessage(res.runner_state.message || 'Executing...');
      }
    } catch (err) {
      console.error('Failed to load microstructure data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (refreshKey > 0) {
      loadData();
    }
  }, [refreshKey]);

  useEffect(() => {
    if (externalIsRunning && !isExecuting) {
      setIsExecuting(true);
      setExecMessage('Running pipeline...');
    }
  }, [externalIsRunning]);

  // Poll status while executing
  useEffect(() => {
    if (!isExecuting) return;
    const interval = setInterval(async () => {
      try {
        const state = await getMicrostructureStatus();
        if (!state.is_running) {
          setIsExecuting(false);
          setExecMessage(state.message || 'Execution completed');
          loadData();
        } else {
          setExecMessage(state.message || 'Running...');
        }
      } catch (e) {
        console.error('Status poll error:', e);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [isExecuting]);

  // Handle run button triggers
  const handleRun = async (mode: 'radar' | 'full' | 'charts') => {
    setIsExecuting(true);
    setExecMessage(`Starting ${mode} run...`);
    try {
      const res = await runMicrostructure(mode);
      setExecMessage(res.message);
    } catch (err: any) {
      console.error('Run trigger error:', err);
      setIsExecuting(false);
      setExecMessage(err.message || 'Execution failed');
    }
  };

  const latest = data?.latest || {};
  const replay = data?.replay || [];
  const cheatCodes = data?.cheat_codes;
  const directiveBadge = data?.directive_badge;

  // Filter replay by user selected period
  const filteredReplay = useMemo(() => {
    if (!replay.length) return [];
    if (selectedPeriod === 'tell') {
      return replay.filter(r => r.date <= '2026-10-30');
    }
    if (selectedPeriod === 'execution') {
      return replay.filter(r => r.date >= '2026-11-02');
    }
    if (selectedPeriod === '5d') {
      return replay.slice(-5);
    }
    if (selectedPeriod === '3d') {
      return replay.slice(-3);
    }
    return replay;
  }, [replay, selectedPeriod]);

  // Compute selected replay hover item
  const activeHoverItem = useMemo(() => {
    if (!hoveredReplayDate || !filteredReplay.length) {
      return filteredReplay[filteredReplay.length - 1] || null;
    }
    return filteredReplay.find(r => r.date === hoveredReplayDate) || filteredReplay[filteredReplay.length - 1];
  }, [hoveredReplayDate, filteredReplay]);

  // -------------------------------------------------------------
  // Chart 1: SVG Dual-Axis Spot vs Basis Coordinate Math
  // -------------------------------------------------------------
  const chart1Metrics = useMemo(() => {
    if (!filteredReplay.length) return null;
    const w = 720;
    const h = 260;
    const padL = 60;
    const padR = 60;
    const padT = 30;
    const padB = 40;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const rawMinSpot = Math.min(...filteredReplay.map(r => r.spot));
    const rawMaxSpot = Math.max(...filteredReplay.map(r => r.spot));
    const minSpot = Math.floor((rawMinSpot - 250) / 500) * 500;
    const maxSpot = Math.ceil((rawMaxSpot + 300) / 500) * 500;
    const spotTicks = [
      maxSpot - Math.round((maxSpot - minSpot) * 0.15 / 100) * 100,
      Math.round(((minSpot + maxSpot) / 2) / 100) * 100,
      minSpot + Math.round((maxSpot - minSpot) * 0.15 / 100) * 100
    ];

    const rawMinBasis = Math.min(...filteredReplay.map(r => r.basis_pts));
    const rawMaxBasis = Math.max(...filteredReplay.map(r => r.basis_pts));
    const minBasis = Math.min(-45, Math.floor((rawMinBasis - 10) / 10) * 10);
    const maxBasis = Math.max(125, Math.ceil((rawMaxBasis + 15) / 10) * 10);

    const getX = (idx: number) => padL + (idx / Math.max(1, filteredReplay.length - 1)) * innerW;
    const getYSpot = (val: number) => padT + (1 - (val - minSpot) / Math.max(1, maxSpot - minSpot)) * innerH;
    const getYBasis = (val: number) => padT + (1 - (val - minBasis) / Math.max(1, maxBasis - minBasis)) * innerH;

    // Spot line path
    const spotPath = filteredReplay.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getYSpot(pt.spot)}`).join(' ');

    // Basis points
    const basisPoints = filteredReplay.map((pt, i) => ({
      x: getX(i),
      y: getYBasis(pt.basis_pts),
      val: pt.basis_pts,
      date: pt.date,
      isSqueeze: pt.basis_pts >= 80,
      isPanic: pt.basis_pts <= -20
    }));

    // Basis line path (not overpowering, smooth line connecting basis points)
    const basisPath = basisPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

    // Reference lines
    const yThreshold80 = getYBasis(80);
    const yEquilibriumHigh = getYBasis(50);
    const yEquilibriumLow = getYBasis(20);
    const yThresholdMinus20 = getYBasis(-20);
    const yBasisZero = getYBasis(0);

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      innerW,
      innerH,
      minSpot,
      maxSpot,
      spotTicks,
      minBasis,
      maxBasis,
      getX,
      getYSpot,
      getYBasis,
      spotPath,
      basisPoints,
      basisPath,
      yThreshold80,
      yEquilibriumHigh,
      yEquilibriumLow,
      yThresholdMinus20,
      yBasisZero
    };
  }, [filteredReplay]);

  // -------------------------------------------------------------
  // Chart 2: SVG Call Squeeze vs Put Decay Coordinate Math
  // -------------------------------------------------------------
  const chart2Metrics = useMemo(() => {
    if (!filteredReplay.length) return null;
    const w = 720;
    const h = 260;
    const padL = 60;
    const padR = 60;
    const padT = 30;
    const padB = 40;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;

    const rawMaxPrem = Math.max(...filteredReplay.map(r => Math.max(r.ce_ltp, r.pe_ltp)));
    let minVal = 0;
    let maxVal = Math.max(450, Math.ceil((rawMaxPrem + 20) / 50) * 50);

    if (chartScaleMode === 'zoomed') {
      maxVal = 45; // 0 to 45 pts to clearly discern the tilt from 5.5 to 10.1 to 12.60!
    } else if (chartScaleMode === 'log') {
      minVal = 1;
      maxVal = Math.max(500, Math.ceil((rawMaxPrem + 50) / 100) * 100);
    }

    const getX = (idx: number) => padL + (idx / Math.max(1, filteredReplay.length - 1)) * innerW;

    const getYVal = (val: number) => {
      if (chartScaleMode === 'log') {
        const safeVal = Math.max(1, val);
        const logMin = Math.log10(minVal);
        const logMax = Math.log10(maxVal);
        const norm = (Math.log10(safeVal) - logMin) / (logMax - logMin);
        return padT + (1 - Math.max(0, Math.min(1, norm))) * innerH;
      } else {
        const clamped = Math.max(minVal, Math.min(maxVal, val));
        return padT + (1 - (clamped - minVal) / (maxVal - minVal)) * innerH;
      }
    };

    const callPoints = filteredReplay.map((pt, i) => ({
      x: getX(i),
      y: getYVal(pt.ce_ltp),
      val: pt.ce_ltp,
      date: pt.date,
      isClipped: chartScaleMode === 'zoomed' && pt.ce_ltp > maxVal
    }));

    const putPoints = filteredReplay.map((pt, i) => ({
      x: getX(i),
      y: getYVal(pt.pe_ltp),
      val: pt.pe_ltp,
      date: pt.date
    }));

    const callPath = callPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
    const putPath = putPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');

    const yStopLoss = getYVal(12.60);
    const yTargetLock = getYVal(9.75);

    return {
      w,
      h,
      padL,
      padR,
      padT,
      padB,
      innerW,
      innerH,
      minVal,
      maxVal,
      getX,
      getYVal,
      callPoints,
      putPoints,
      callPath,
      putPath,
      yStopLoss,
      yTargetLock
    };
  }, [filteredReplay, chartScaleMode]);

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
      {/* ------------------------------------------------------------- */}
      {/* 1. Header & Executive Directive Hero Bar                     */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border p-6 shadow-xl transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">Microstructure Flow & Dealer Gamma Radar</h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Zero-Timeout Institutional Module
                </span>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Forward-looking Futures Basis, Order Book Depth Ratio, Call/Put Boundary Walls, and Delta-Hedging Regime
              </p>
            </div>
          </div>

          {/* Action Buttons & Execution Status */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleRun('radar')}
              disabled={isExecuting}
              className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl border transition shadow-sm ${
                isExecuting
                  ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-300 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-cyan-600/20'
              }`}
              title="Dispatches 1 single batch quote query, updates flow replay charts & syncs NSE FII/DII data"
            >
              {isExecuting ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              )}
              <span>{isExecuting ? 'Running Radar...' : 'Run Microstructure Radar'}</span>
            </button>

            <button
              onClick={() => handleRun('full')}
              disabled={isExecuting}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Runs nifty_option_seller.py (NTSI), nifty_microstructure_radar.py, Flow Replay & NSE FII/DII sync"
            >
              <Layers className="h-3.5 w-3.5 text-purple-400" />
              <span>Run Full Pipeline</span>
            </button>

            <button
              onClick={() => {
                setChartImgTs(Date.now());
                setShowNativeChartModal(true);
              }}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="View 4-Panel 200 DPI Matplotlib Publication Chart"
            >
              <Eye className="h-3.5 w-3.5 text-emerald-400" />
              <span>4-Panel PNG Chart</span>
            </button>

            <button
              onClick={handleSyncParticipant}
              disabled={isSyncingParticipant || isExecuting}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition shadow-sm ${
                isSyncingParticipant
                  ? 'bg-indigo-600/30 border-indigo-500/40 text-indigo-300 cursor-not-allowed'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-indigo-300 border-slate-700 hover:border-indigo-500/40'
                  : 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border-slate-300 hover:border-indigo-400'
              }`}
              title="Download & parse latest official 7:00 PM NSE Participant Open Interest (FII, PRO, Client, DII)"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncingParticipant ? 'animate-spin text-indigo-400' : 'text-indigo-400'}`} />
              <span>{isSyncingParticipant ? 'Syncing NSE...' : 'Sync 7:00 PM NSE Data'}</span>
            </button>

            <button
              onClick={loadData}
              disabled={isLoading || isExecuting}
              className={`p-2 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
              }`}
              title="Refresh radar data"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Execution progress banner if running */}
        {isExecuting && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-300">{execMessage}</span>
            </div>
            <span className="text-[11px] text-cyan-400/80 animate-pulse font-mono">Single Batch Query in Progress...</span>
          </div>
        )}

        {/* Participant OI sync message notification */}
        {participantSyncMsg && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <Users className="h-4 w-4 text-indigo-400" />
              <span>{participantSyncMsg}</span>
            </div>
            <span className="text-[11px] text-indigo-400/80 font-mono">archives.nseindia.com</span>
          </div>
        )}

        {/* EXECUTIVE DIRECTIVE BANNER */}
        <div className={`mt-5 p-4 rounded-xl border transition-all ${
          directiveBadge?.type === 'VETO_CALLS' || directiveBadge?.type === 'STAND_ASIDE'
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            : directiveBadge?.type === 'VETO_PUTS'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : directiveBadge?.type === 'APPROVED'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-slate-800 border-slate-700 text-slate-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                directiveBadge?.type === 'VETO_CALLS' || directiveBadge?.type === 'STAND_ASIDE'
                  ? 'bg-rose-500/20 text-rose-400'
                  : directiveBadge?.type === 'VETO_PUTS'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}>
                {directiveBadge?.type === 'VETO_CALLS' || directiveBadge?.type === 'STAND_ASIDE' ? (
                  <AlertTriangle className="h-5 w-5" />
                ) : directiveBadge?.type === 'VETO_PUTS' ? (
                  <TrendingDown className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-black/30">
                    Master Executive Directive
                  </span>
                  <span className="text-xs font-bold tracking-wide">
                    {directiveBadge?.title || 'EXECUTIVE DIRECTIVE'}
                  </span>
                </div>
                <p className="text-sm font-semibold mt-1">
                  {directiveBadge?.full_text || latest['Actionable Option Seller Directive'] || 'Analyzing current market positioning...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono shrink-0 pl-11 md:pl-0">
              <div>
                <span className={`text-[10px] block uppercase font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Trending Risk
                </span>
                <span className={`font-bold ${
                  latest['Forward-Looking Trending Risk']?.includes('HIGH') ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                  {latest['Forward-Looking Trending Risk'] || 'STABLE'}
                </span>
              </div>
              <div className={`h-7 w-[1px] ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
              <div>
                <span className={`text-[10px] block uppercase font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {latest['Session Status'] ? latest['Session Status'] : 'Active Session'}
                </span>
                <span className="font-semibold">{latest['Date']} {latest['Time (IST)']}</span>
                {latest['Last Synced IST'] && (
                  <span className="text-[10px] block text-slate-500">Synced: {latest['Last Synced IST']}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real-Time Live Metrics 6-Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
          {/* Tile 1: Spot & VIX */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] block uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              NIFTY Spot / VIX
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-base font-bold">{latest['Nifty Spot'] || '--'}</span>
              <span className="text-xs font-semibold text-purple-400">({latest['India VIX'] || '--'})</span>
            </div>
            <span className={`text-[11px] block mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              India VIX Volatility
            </span>
          </div>

          {/* Tile 2: Futures Basis */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] block uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Futures Basis
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-base font-bold ${
                parseFloat(latest['Futures Basis (pts)'] || '0') >= 80
                  ? 'text-rose-400'
                  : parseFloat(latest['Futures Basis (pts)'] || '0') < -20
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {latest['Futures Basis (pts)'] || '--'} pts
              </span>
              <span className="text-[11px] text-slate-400">({latest['Futures Basis %'] || '--'})</span>
            </div>
            <span className={`text-[11px] block mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={latest['Futures Basis Regime']}>
              {latest['Futures Basis Regime']?.split(':')[0] || 'Contango'}
            </span>
          </div>

          {/* Tile 3: Order Book Depth */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] block uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Futures Depth Ratio
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className={`text-base font-bold ${
                parseFloat(latest['Futures Buy/Sell Depth Ratio'] || '1') >= 2.5
                  ? 'text-rose-400'
                  : parseFloat(latest['Futures Buy/Sell Depth Ratio'] || '1') <= 0.6
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}>
                {latest['Futures Buy/Sell Depth Ratio'] || '--'}x
              </span>
            </div>
            <span className={`text-[11px] block mt-0.5 truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`} title={latest['Futures Flow Sentiment']}>
              {latest['Futures Flow Sentiment'] || 'Balanced'}
            </span>
          </div>

          {/* Tile 4: Call Wall Resistance */}
          {(() => {
            const cwStatus = latest['Call Wall Threat Status'] || '';
            const isCallThreat = cwStatus.includes('BREACHED') || cwStatus.includes('HIGH ALERT') || cwStatus.includes('UNDER TEST');
            return (
              <div className={`p-3 rounded-xl border ${
                isCallThreat
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] block uppercase font-semibold text-rose-400">
                  Dominant Call Wall
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-base font-bold text-rose-400">{latest['Dominant Call Wall Strike'] || '--'}</span>
                  <span className="text-[11px] text-slate-400">({latest['Call Wall Distance %'] || '--'})</span>
                </div>
                <span className={`text-[11px] block mt-0.5 truncate ${
                  isCallThreat ? 'text-rose-300 font-semibold' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`} title={cwStatus}>
                  {cwStatus.split(':')[0] || 'Defended'}
                </span>
              </div>
            );
          })()}

          {/* Tile 5: Put Wall Support */}
          {(() => {
            const pwStatus = latest['Put Wall Threat Status'] || '';
            const isPutThreat = pwStatus.includes('BREACHED') || pwStatus.includes('HIGH ALERT') || pwStatus.includes('UNDER TEST');
            return (
              <div className={`p-3 rounded-xl border ${
                isPutThreat
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className={`text-[10px] block uppercase font-semibold ${
                  isPutThreat ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  Dominant Put Wall
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className={`text-base font-bold ${
                    isPutThreat ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {latest['Dominant Put Wall Strike'] || '--'}
                  </span>
                  <span className="text-[11px] text-slate-400">({latest['Put Wall Distance %'] || '--'})</span>
                </div>
                <span className={`text-[11px] block mt-0.5 truncate ${
                  isPutThreat ? 'text-amber-300 font-semibold' : isDark ? 'text-slate-400' : 'text-slate-500'
                }`} title={pwStatus}>
                  {pwStatus.split(':')[0] || 'Defended'}
                </span>
              </div>
            );
          })()}

          {/* Tile 6: Contract Expiry */}
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className={`text-[10px] block uppercase font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Near Futures
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-sm font-bold truncate">{latest['Near Futures Symbol'] || 'NIFTY FUT'}</span>
            </div>
            <span className={`text-[11px] block mt-0.5 text-slate-400`}>
              LTP: ₹{latest['Futures LTP'] || '--'}
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Sub-Navigation Switcher: Telemetry vs 4-Quadrant vs Guide     */}
      {/* ------------------------------------------------------------- */}
      <div className={`p-1.5 rounded-2xl border flex flex-wrap md:flex-nowrap items-center gap-2 shadow-md ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveSubTab('radar')}
          className={`flex-1 min-w-[200px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
            activeSubTab === 'radar'
              ? 'bg-cyan-600 text-white shadow-cyan-600/20'
              : isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Activity className="h-4 w-4 shrink-0" />
          <span>Microstructure Telemetry & Flow Radar</span>
        </button>

        <button
          onClick={() => setActiveSubTab('quadrant')}
          className={`flex-1 min-w-[220px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
            activeSubTab === 'quadrant'
              ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-emerald-600/20'
              : isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <Grid className="h-4 w-4 shrink-0" />
          <span>4-Quadrant Volatility Matrix (GEX vs NTSI)</span>
          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shrink-0">
            Current & Next Day
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('guide')}
          className={`flex-none md:flex-1 min-w-[190px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition shadow-sm ${
            activeSubTab === 'guide'
              ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 text-white shadow-indigo-600/20'
              : isDark
              ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>How to Interpret (Field Guide)</span>
          <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full shrink-0 ${
            activeSubTab === 'guide'
              ? 'bg-white/20 text-white'
              : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
          }`}>
            Manual
          </span>
        </button>
      </div>

      {activeSubTab === 'guide' ? (
        <MicrostructureGuideView theme={theme} onJumpToTab={(tab) => setActiveSubTab(tab)} />
      ) : activeSubTab === 'quadrant' ? (
        data?.quadrant_analysis ? (
          <QuadrantMatrixView theme={theme} data={data.quadrant_analysis} onSelectStrike={onSelectStrike} />
        ) : (
          <div className="p-12 text-center text-slate-400">Loading 4-Quadrant Volatility Matrix...</div>
        )
      ) : (
        <>
          {/* Replay Period Selector Toolbar */}
          <div className={`rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-sm ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
          }`}>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-cyan-400" />
          <span className="text-xs font-bold tracking-tight">Chart Replay Period:</span>
          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            ({filteredReplay.length} sessions: {filteredReplay[0]?.date || '--'} to {filteredReplay[filteredReplay.length - 1]?.date || '--'})
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'all', label: `All Sessions (${replay[0]?.date?.slice(5) || '10-27'} – ${replay[replay.length - 1]?.date?.slice(5) || 'Latest'})` },
            { id: 'tell', label: 'Oct 27–30 (+110pt Basis Spike)' },
            { id: 'execution', label: 'Nov 02 – Latest (Execution & Live)' },
            { id: '5d', label: 'Last 5 Days' },
            { id: '3d', label: 'Last 3 Days' }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedPeriod(p.id as any)}
              className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition border ${
                selectedPeriod === p.id
                  ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                  : isDark
                  ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Visual Charts Section: Chart 1 & Chart 2                  */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CHART 1: Spot Price vs Leading Futures Basis (+110 pt Tell) */}
        <div className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-xs border border-cyan-500/20">
                  C1
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Lead Squeeze Signal: Spot vs Futures Basis</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Dual-axis institutional accumulation radar (+80 pt breakout veto threshold)
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                Oct 29: +110.7 pt Squeeze Tell
              </span>
            </div>

            {/* SVG Interactive Chart 1 */}
            {chart1Metrics && (
              <div className="relative mt-4">
                <svg viewBox={`0 0 ${chart1Metrics.w} ${chart1Metrics.h}`} className="w-full h-auto overflow-visible select-none">
                  {/* Shaded Institutional Squeeze Zone (> +80 pts) */}
                  <rect
                    x={chart1Metrics.padL}
                    y={chart1Metrics.padT}
                    width={chart1Metrics.innerW}
                    height={Math.max(0, chart1Metrics.yThreshold80 - chart1Metrics.padT)}
                    fill="rgba(244, 63, 94, 0.08)"
                  />
                  {/* Shaded Equilibrium Zone (+20 to +50 pts) */}
                  <rect
                    x={chart1Metrics.padL}
                    y={chart1Metrics.yEquilibriumHigh}
                    width={chart1Metrics.innerW}
                    height={Math.max(0, chart1Metrics.yEquilibriumLow - chart1Metrics.yEquilibriumHigh)}
                    fill="rgba(16, 185, 129, 0.08)"
                  />

                  {/* Horizontal Grid & Threshold Lines */}
                  {/* +80 pt Veto Line */}
                  <line
                    x1={chart1Metrics.padL}
                    y1={chart1Metrics.yThreshold80}
                    x2={chart1Metrics.w - chart1Metrics.padR}
                    y2={chart1Metrics.yThreshold80}
                    stroke="#f43f5e"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={chart1Metrics.w - chart1Metrics.padR - 4}
                    y={chart1Metrics.yThreshold80 - 4}
                    textAnchor="end"
                    fill="#f43f5e"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    +80 pt Squeeze Veto Threshold
                  </text>

                  {/* 0 pt Basis Line */}
                  <line
                    x1={chart1Metrics.padL}
                    y1={chart1Metrics.yBasisZero}
                    x2={chart1Metrics.w - chart1Metrics.padR}
                    y2={chart1Metrics.yBasisZero}
                    stroke={isDark ? '#475569' : '#cbd5e1'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />

                  {/* Left Y-Axis (Spot) labels */}
                  {chart1Metrics.spotTicks.map((stk) => (
                    <text key={`ytick-${stk}`} x={chart1Metrics.padL - 8} y={chart1Metrics.getYSpot(stk)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9" fontWeight="600">
                      {stk.toLocaleString('en-IN')}
                    </text>
                  ))}

                  {/* Right Y-Axis (Basis) labels */}
                  <text x={chart1Metrics.w - chart1Metrics.padR + 8} y={chart1Metrics.getYBasis(100)} textAnchor="start" fill="#f43f5e" fontSize="9" fontWeight="bold">+100</text>
                  <text x={chart1Metrics.w - chart1Metrics.padR + 8} y={chart1Metrics.getYBasis(50)} textAnchor="start" fill="#10b981" fontSize="9" fontWeight="bold">+50</text>
                  <text x={chart1Metrics.w - chart1Metrics.padR + 8} y={chart1Metrics.getYBasis(0)} textAnchor="start" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">0</text>
                  <text x={chart1Metrics.w - chart1Metrics.padR + 8} y={chart1Metrics.getYBasis(-30)} textAnchor="start" fill="#f59e0b" fontSize="9">-30</text>

                  {/* Basis Bars (Translucent Base) */}
                  {chart1Metrics.basisPoints.map((pt, i) => {
                    const barTop = Math.min(pt.y, chart1Metrics.yBasisZero);
                    const barH = Math.max(3, Math.abs(pt.y - chart1Metrics.yBasisZero));
                    return (
                      <g key={`bar-${i}`} onMouseEnter={() => setHoveredReplayDate(pt.date)} className="cursor-pointer">
                        <rect
                          x={pt.x - 7}
                          y={barTop}
                          width={14}
                          height={barH}
                          fill={pt.isSqueeze ? '#f43f5e' : pt.val >= 20 ? '#10b981' : pt.val < 0 ? '#f59e0b' : '#06b6d4'}
                          opacity={hoveredReplayDate === pt.date ? 0.45 : 0.22}
                          rx={2}
                        />
                      </g>
                    );
                  })}

                  {/* Futures Basis Line Plot (not overpowering, smooth line over the bars) */}
                  <path
                    d={chart1Metrics.basisPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />

                  {/* Futures Basis Diamond Markers */}
                  {chart1Metrics.basisPoints.map((pt, i) => {
                    const isHovered = hoveredReplayDate === pt.date;
                    const size = isHovered ? 5 : 3.5;
                    return (
                      <g key={`basis-dot-${i}`} onMouseEnter={() => setHoveredReplayDate(pt.date)} className="cursor-pointer">
                        <polygon
                          points={`${pt.x},${pt.y - size} ${pt.x + size},${pt.y} ${pt.x},${pt.y + size} ${pt.x - size},${pt.y}`}
                          fill={pt.isSqueeze ? '#f43f5e' : pt.val >= 20 ? '#10b981' : '#f59e0b'}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth="1.2"
                        />
                      </g>
                    );
                  })}

                  {/* NIFTY Spot Line */}
                  <path
                    d={chart1Metrics.spotPath}
                    fill="none"
                    stroke={isDark ? '#f8fafc' : '#0f172a'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points on Spot */}
                  {filteredReplay.map((pt, i) => {
                    const x = chart1Metrics.getX(i);
                    const y = chart1Metrics.getYSpot(pt.spot);
                    const isHovered = hoveredReplayDate === pt.date;
                    const showTick = filteredReplay.length <= 13 || i % Math.ceil(filteredReplay.length / 8) === 0 || i === filteredReplay.length - 1;
                    return (
                      <g key={`pt-${i}`} onMouseEnter={() => setHoveredReplayDate(pt.date)} className="cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r={isHovered ? 6 : 4}
                          fill={isDark ? '#f8fafc' : '#0f172a'}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth="2"
                        />
                        {/* X-Axis Date Labels */}
                        {showTick && (
                          <text
                            x={x}
                            y={chart1Metrics.h - 10}
                            textAnchor="middle"
                            fill={isHovered ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#64748b' : '#94a3b8')}
                            fontSize="8.5"
                            fontWeight={isHovered ? 'bold' : 'normal'}
                          >
                            {pt.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Oct 29 Spike Callout Marker (Dynamic per selected period) */}
                  {(() => {
                    const oct29Idx = filteredReplay.findIndex(r => r.date === '2026-10-29');
                    if (oct29Idx === -1) return null;
                    const xPos = chart1Metrics.getX(oct29Idx);
                    const yPos = chart1Metrics.getYBasis(110.65);
                    return (
                      <g>
                        <line
                          x1={xPos}
                          y1={yPos}
                          x2={xPos + 15}
                          y2={yPos - 15}
                          stroke="#f43f5e"
                          strokeWidth="1.5"
                        />
                        <rect
                          x={xPos - 45}
                          y={yPos - 34}
                          width={120}
                          height={20}
                          rx={4}
                          fill={isDark ? '#1e293b' : '#ffffff'}
                          stroke="#f43f5e"
                          strokeWidth="1"
                        />
                        <text
                          x={xPos + 15}
                          y={yPos - 20}
                          textAnchor="middle"
                          fill="#f43f5e"
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          Oct 29: +110.7 pt SPIKE
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Interactive Info Footer for Chart 1 */}
          <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${isDark ? 'bg-slate-100' : 'bg-slate-900'}`} />
                <span className="font-semibold">NIFTY Spot: {activeHoverItem?.spot?.toLocaleString('en-IN') || '--'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1">
                  <span className="h-2.5 w-2 rounded-sm bg-rose-500 opacity-40" />
                  <span className="h-0.5 w-3 bg-rose-500 rounded-full" />
                </div>
                <span className="font-semibold text-rose-400">
                  Basis (Line & Bars): {activeHoverItem?.basis_pts > 0 ? `+${activeHoverItem.basis_pts}` : activeHoverItem?.basis_pts} pts ({activeHoverItem?.basis_pct}%)
                </span>
              </div>
            </div>
            <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Date: {activeHoverItem?.date || '--'}
            </span>
          </div>
        </div>

        {/* CHART 2: Call Wing Squeeze vs Put Wing Decay Curve */}
        <div className={`rounded-2xl border p-5 shadow-lg flex flex-col justify-between ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 font-bold text-xs border border-rose-500/20">
                  C2
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Call Squeeze (24,850 CE) vs Put Decay (21,050 PE)</h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Convex gamma risk vs steady theta capture with 2x stop loss level (₹12.60)
                  </p>
                </div>
              </div>

              {/* SCALE SELECTOR TOOLBAR */}
              <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-lg border border-slate-800 text-[10px]">
                <button
                  onClick={() => setChartScaleMode('zoomed')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    chartScaleMode === 'zoomed'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                  }`}
                  title="0 to 45 pts: Discern the subtle early curl and exact 2x stop trigger"
                >
                  Zoom Tilt (0-45)
                </button>
                <button
                  onClick={() => setChartScaleMode('log')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    chartScaleMode === 'log'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                  }`}
                  title="Logarithmic: View both low premium tilt and ₹433 spike on single scale"
                >
                  Log
                </button>
                <button
                  onClick={() => setChartScaleMode('linear')}
                  className={`px-2 py-0.5 rounded font-bold transition ${
                    chartScaleMode === 'linear'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                  }`}
                  title="Linear (0 to 450 pts): Full macro perspective"
                >
                  Linear (0-450)
                </button>
              </div>
            </div>

            {/* SVG Interactive Chart 2 */}
            {chart2Metrics && (
              <div className="relative mt-4">
                <svg viewBox={`0 0 ${chart2Metrics.w} ${chart2Metrics.h}`} className="w-full h-auto overflow-visible select-none">
                  {/* Horizontal Threshold Reference Lines */}
                  {/* 2x Hard Stop Line (12.60 pts) */}
                  <line
                    x1={chart2Metrics.padL}
                    y1={chart2Metrics.yStopLoss}
                    x2={chart2Metrics.w - chart2Metrics.padR}
                    y2={chart2Metrics.yStopLoss}
                    stroke="#3b82f6"
                    strokeDasharray="4 4"
                    strokeWidth="1.5"
                  />
                  <text
                    x={chart2Metrics.w - chart2Metrics.padR - 4}
                    y={chart2Metrics.yStopLoss - 4}
                    textAnchor="end"
                    fill="#3b82f6"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    2x Hard Stop-Loss (₹12.60)
                  </text>

                  {/* 50% Decay Target Line (9.75 pts) */}
                  <line
                    x1={chart2Metrics.padL}
                    y1={chart2Metrics.yTargetLock}
                    x2={chart2Metrics.w - chart2Metrics.padR}
                    y2={chart2Metrics.yTargetLock}
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    strokeWidth="1.2"
                  />
                  <text
                    x={chart2Metrics.padL + 6}
                    y={chart2Metrics.yTargetLock - 4}
                    textAnchor="start"
                    fill="#f59e0b"
                    fontSize="8.5"
                    fontWeight="bold"
                  >
                    50% Profit Target (₹9.75)
                  </text>

                  {/* Y-Axis Labels */}
                  {chartScaleMode === 'zoomed' ? (
                    <>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(40)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹40</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(25)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹25</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(12.6)} textAnchor="end" fill="#3b82f6" fontSize="9" fontWeight="bold">₹12.6</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(5)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹5</text>
                    </>
                  ) : chartScaleMode === 'log' ? (
                    <>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(400)} textAnchor="end" fill="#f43f5e" fontSize="9" fontWeight="bold">₹400</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(100)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹100</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(20)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹20</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(5)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹5</text>
                    </>
                  ) : (
                    <>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(400)} textAnchor="end" fill="#f43f5e" fontSize="9" fontWeight="bold">₹400</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(200)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹200</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(50)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹50</text>
                      <text x={chart2Metrics.padL - 8} y={chart2Metrics.getYVal(0)} textAnchor="end" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="9">₹0</text>
                    </>
                  )}

                  {/* Put Wing Decay Line (Green) */}
                  <path
                    d={chart2Metrics.putPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Call Wing Squeeze Line (Red) */}
                  <path
                    d={chart2Metrics.callPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Put Wing Points */}
                  {chart2Metrics.putPoints.map((pt, i) => {
                    const isHovered = hoveredReplayDate === pt.date;
                    return (
                      <g key={`pe-${i}`} onMouseEnter={() => setHoveredReplayDate(pt.date)} className="cursor-pointer">
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 6 : 4}
                          fill="#10b981"
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth="2"
                        />
                      </g>
                    );
                  })}

                  {/* Call Wing Points */}
                  {chart2Metrics.callPoints.map((pt, i) => {
                    const isHovered = hoveredReplayDate === pt.date;
                    const showTick = chart2Metrics.callPoints.length <= 13 || i % Math.ceil(chart2Metrics.callPoints.length / 8) === 0 || i === chart2Metrics.callPoints.length - 1;
                    return (
                      <g key={`ce-${i}`} onMouseEnter={() => setHoveredReplayDate(pt.date)} className="cursor-pointer">
                        <rect
                          x={pt.x - (isHovered ? 5 : 3.5)}
                          y={pt.y - (isHovered ? 5 : 3.5)}
                          width={isHovered ? 10 : 7}
                          height={isHovered ? 10 : 7}
                          fill="#f43f5e"
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth="1.5"
                        />
                        {/* If point is clipped in zoomed mode, show upward arrow */}
                        {pt.isClipped && (
                          <g>
                            <polygon
                              points={`${pt.x},${pt.y - 12} ${pt.x - 4},${pt.y - 4} ${pt.x + 4},${pt.y - 4}`}
                              fill="#f43f5e"
                            />
                            <text
                              x={pt.x}
                              y={pt.y - 16}
                              textAnchor="middle"
                              fill="#f43f5e"
                              fontSize="8"
                              fontWeight="bold"
                            >
                              ₹{pt.val.toFixed(0)}
                            </text>
                          </g>
                        )}
                        {/* X-Axis Date Labels */}
                        {showTick && (
                          <text
                            x={pt.x}
                            y={chart2Metrics.h - 10}
                            textAnchor="middle"
                            fill={isHovered ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#64748b' : '#94a3b8')}
                            fontSize="8.5"
                            fontWeight={isHovered ? 'bold' : 'normal'}
                          >
                            {pt.date.slice(5)}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Nov 03 2x Stop Executed Annotation (Dynamic per selected period) */}
                  {(() => {
                    const nov3Idx = filteredReplay.findIndex(r => r.date === '2026-11-03');
                    if (nov3Idx === -1) return null;
                    const xPos = chart2Metrics.getX(nov3Idx);
                    const yPos = chart2Metrics.getYVal(22.85);
                    return (
                      <g>
                        <circle
                          cx={xPos}
                          cy={yPos}
                          r="8"
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          strokeDasharray="2 2"
                        />
                        <rect
                          x={xPos - 60}
                          y={yPos - 34}
                          width={130}
                          height={20}
                          rx={4}
                          fill={isDark ? '#1e293b' : '#ffffff'}
                          stroke="#3b82f6"
                          strokeWidth="1"
                        />
                        <text
                          x={xPos + 5}
                          y={yPos - 20}
                          textAnchor="middle"
                          fill="#3b82f6"
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          Nov 03: 2x Stop Executed
                        </text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            )}
          </div>

          {/* Interactive Info Footer for Chart 2 */}
          <div className={`mt-3 p-3 rounded-xl border text-xs flex items-center justify-between ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
                <span className="font-semibold text-rose-400">
                  24,850 CE: ₹{activeHoverItem?.ce_ltp?.toFixed(2) || '--'}
                </span>
                <span className="text-[10px] text-slate-400">
                  (Vol: {activeHoverItem?.ce_vol?.toLocaleString() || 0})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-emerald-400">
                  21,050 PE: ₹{activeHoverItem?.pe_ltp?.toFixed(2) || '--'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                activeHoverItem?.net_pnl_disciplined_lot >= 0
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}>
                Disciplined P&L: {activeHoverItem?.net_pnl_disciplined_lot >= 0 ? '+' : ''}₹{activeHoverItem?.net_pnl_disciplined_lot?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Operational Timing & Daily Execution Cadence Guide         */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-tight">Operational Timing & Daily Execution Cadence Guide</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Intraday vs. EOD Planning
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Optimal schedule to run the radar during market hours and when to analyze the next day's session
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTimingGuide(!showTimingGuide)}
            className={`p-1.5 rounded-lg border transition ${
              isDark ? 'border-slate-800 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
          >
            {showTimingGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {showTimingGuide && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: 9:15 - 9:45 AM */}
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-slate-300">09:15 – 09:45 AM</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    STAND BY (NOISY)
                  </span>
                </div>
                <div className="text-xs font-semibold text-amber-400 mb-1">Opening Discovery Noise</div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Retail MOO market orders and overnight stops create wide spreads. Futures Basis and Order Depth can show temporary phantom spikes. Avoid initiating fresh trades.
                </p>
              </div>

              {/* Card 2: 10:00 - 10:30 AM */}
              <div className={`p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/30`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-emerald-400">10:00 – 10:30 AM</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    PRIME INTRADAY
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-300 mb-1">Ideal Current Session Stance</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Best time to run for today.</strong> Institutional market makers have settled initial delta-hedges. True Futures Basis and Order Depth reveal genuine positioning. If Quadrant 1, deploy new month-end strangles.
                </p>
              </div>

              {/* Card 3: 1:00 - 1:30 PM */}
              <div className={`p-3.5 rounded-xl border bg-cyan-500/5 border-cyan-500/30`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-cyan-400">01:00 – 01:30 PM</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    MIDDAY CHECK
                  </span>
                </div>
                <div className="text-xs font-semibold text-cyan-300 mb-1">European Open Inflection</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  European markets open at 1:00 PM IST. FII currency and index arbitrage often trigger basis shifts or squeeze extensions. Verify existing short legs remain safely below 2x stop.
                </p>
              </div>

              {/* Card 4: 3:45 - 4:30 PM */}
              <div className={`p-3.5 rounded-xl border bg-purple-500/5 border-purple-500/30`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono text-purple-400">03:45 – 04:30 PM</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    BEST FOR TOMORROW
                  </span>
                </div>
                <div className="text-xs font-semibold text-purple-300 mb-1">EOD Next-Day Session Planning</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Best time to assess tomorrow.</strong> NSE 30-minute VWAP cash settlement finalizes the daily candle, stamping the official NTSI score and updating Google Sheets. Inspect Next-Day Scenario vectors.
                </p>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>
                  <strong>Zero-Timeout Idempotent Architecture:</strong> Each run dispatches exactly 1 single batch query (~0.35s runtime). Running multiple times intraday is completely safe and carries zero broker rate-limit risk.
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400 shrink-0">
                GIFT NIFTY check: 08:45 AM IST next morning
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Visual Interpretation Cheat Codes & Rules Accordion        */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Quantitative Interpretation Cheat Codes & Directives</h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Field-tested institutional operational rules, dealer gamma mechanics, and execution thresholds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs for Cheat Code Sub-Sections */}
            <div className="flex items-center gap-1 bg-slate-950/40 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActiveCheatTab('regimes')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeCheatTab === 'regimes'
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                3 Basis Regimes
              </button>
              <button
                onClick={() => setActiveCheatTab('rules')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeCheatTab === 'rules'
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                3 Core Rules
              </button>
              <button
                onClick={() => setActiveCheatTab('matrix')}
                className={`px-3 py-1 rounded-lg font-semibold transition ${
                  activeCheatTab === 'matrix'
                    ? 'bg-emerald-600 text-white'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                4-Quadrant Matrix
              </button>
              <button
                onClick={() => setActiveCheatTab('participant')}
                className={`px-3 py-1 rounded-lg font-semibold transition flex items-center gap-1.5 ${
                  activeCheatTab === 'participant'
                    ? 'bg-indigo-600 text-white'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>Smart Money Guide</span>
              </button>
            </div>

            <button
              onClick={() => setShowCheatCodes(!showCheatCodes)}
              className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400"
              title={showCheatCodes ? 'Collapse Cheat Codes' : 'Expand Cheat Codes'}
            >
              {showCheatCodes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showCheatCodes && (
          <div className="p-5">
            {/* Sub-Tab 1: The 3 Basis Regimes */}
            {activeCheatTab === 'regimes' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cheatCodes?.basis_regimes.map((regime) => (
                  <div
                    key={regime.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      regime.id === 'equilibrium'
                        ? isDark ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-emerald-50/70 border-emerald-300'
                        : regime.id === 'accumulation'
                        ? isDark ? 'bg-rose-950/20 border-rose-500/30' : 'bg-rose-50/70 border-rose-300'
                        : isDark ? 'bg-amber-950/20 border-amber-500/30' : 'bg-amber-50/70 border-amber-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          regime.id === 'equilibrium'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : regime.id === 'accumulation'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {regime.badge}
                        </span>
                        <span className="text-xs font-mono font-bold">{regime.range}</span>
                      </div>
                      <h4 className="text-sm font-bold mt-2">{regime.name}</h4>
                      <p className={`text-xs mt-1.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {regime.meaning}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-700/30">
                      <span className="text-[10px] uppercase font-bold tracking-wider block text-slate-400">
                        Operational Directive
                      </span>
                      <span className={`text-xs font-bold block mt-0.5 ${
                        regime.id === 'equilibrium'
                          ? 'text-emerald-400'
                          : regime.id === 'accumulation'
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}>
                        {regime.directive}
                      </span>
                      <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        👉 {regime.action}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-Tab 2: The 3 Core Rules */}
            {activeCheatTab === 'rules' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {cheatCodes?.core_rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className={`rounded-xl border p-4 flex flex-col justify-between ${
                      isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-lg bg-cyan-500/10 text-cyan-400 font-bold text-xs flex items-center justify-center border border-cyan-500/20">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs font-bold">{rule.rule}</h4>
                      </div>
                      <p className="text-xs font-semibold mt-2 text-cyan-400">
                        {rule.summary}
                      </p>
                      <div className="mt-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">Disciplined Execution</span>
                        <p className="text-[11px] text-emerald-300 mt-0.5">{rule.execution}</p>
                      </div>
                      <div className="mt-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                        <span className="text-[10px] uppercase font-bold text-rose-400 block">The Hope Trap</span>
                        <p className="text-[11px] text-rose-300 mt-0.5">{rule.hope_trap}</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/40 text-[11px] text-slate-400 italic">
                      🔍 Visual Cue: {rule.visual_cue}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-Tab 3: The 4-Quadrant Operational Decision Matrix */}
            {activeCheatTab === 'matrix' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className={`border-b ${isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Indicator Readings</th>
                      <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Market Regime</th>
                      <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Tactical Directive</th>
                      <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Action & Management</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {cheatCodes?.decision_matrix.map((row, idx) => (
                      <tr key={idx} className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                        <td className="py-3 px-3 font-mono font-medium">{row.indicators}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            row.type === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : row.type === 'danger'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : row.type === 'warning'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {row.regime}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold">{row.directive}</td>
                        <td className={`py-3 px-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{row.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-Tab 4: Smart Money & Institutional Participant Guide */}
            {activeCheatTab === 'participant' && (
              <div className="pt-1">
                <ParticipantEducationalGuide theme={theme} defaultExpandedSection="fii_ls" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 4. Daily Microstructure Replay Audit Table (7 Sessions)       */}
      {/* ------------------------------------------------------------- */}
      <div className={`rounded-2xl border shadow-xl overflow-hidden transition-all ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <Activity className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Microstructure Replay Audit ({filteredReplay.length} Sessions Selected)</h3>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Session-by-session breakdown demonstrating 2x stop execution, strangle cushioning, and +₹559/lot win vs -₹10,019/lot blowout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Disciplined Win: +₹559/lot
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Blind Hold Loss: -₹10,019/lot
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className={`border-b ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'}`}>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Date</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Spot</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">5d Ret %</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Basis (pts)</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">24850 CE</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">21050 PE</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Microstructure Directive</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Disciplined P&L</th>
                <th className="py-2.5 px-3 uppercase tracking-wider font-semibold">Blind Hold P&L</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {filteredReplay.map((row) => {
                const isOct29 = row.date === '2026-10-29';
                const isNov03 = row.date === '2026-11-03';
                const isNov05 = row.date === '2026-11-05';
                const isNov06 = row.date === '2026-11-06';
                const isHovered = hoveredReplayDate === row.date;

                return (
                  <tr
                    key={row.date}
                    onMouseEnter={() => setHoveredReplayDate(row.date)}
                    className={`transition-colors ${
                      isHovered
                        ? isDark ? 'bg-cyan-500/10' : 'bg-cyan-50'
                        : isOct29
                        ? isDark ? 'bg-rose-950/15' : 'bg-rose-50/50'
                        : isNov03
                        ? isDark ? 'bg-blue-950/15' : 'bg-blue-50/50'
                        : isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold flex items-center gap-1.5">
                      {row.date}
                      {isOct29 && <span className="text-[9px] px-1 py-0.2 rounded bg-rose-500 text-white font-sans font-bold">TELL</span>}
                      {isNov03 && <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500 text-white font-sans font-bold">2X STOP</span>}
                      {isNov05 && <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500 text-white font-sans font-bold">TARGET</span>}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold">{row.spot.toLocaleString('en-IN')}</td>
                    <td className={`py-2.5 px-3 font-mono font-semibold ${row.ret_5d > 2.5 ? 'text-rose-400' : 'text-slate-400'}`}>
                      {row.ret_5d >= 0 ? `+${row.ret_5d}%` : `${row.ret_5d}%`}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        row.basis_pts >= 80
                          ? 'bg-rose-500/20 text-rose-400 font-extrabold'
                          : row.basis_pts < -20
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'text-emerald-400'
                      }`}>
                        {row.basis_pts > 0 ? `+${row.basis_pts}` : row.basis_pts} pts
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`font-bold ${row.ce_ltp > 20 ? 'text-rose-400 font-extrabold' : 'text-slate-300'}`}>
                        ₹{row.ce_ltp.toFixed(2)}
                      </span>
                      {row.ce_vol > 500 && (
                        <span className="text-[10px] text-slate-500 block">
                          Vol: {row.ce_vol.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-emerald-400">
                      ₹{row.pe_ltp.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[11px] font-semibold ${
                        row.directive.includes('VETO') ? 'text-rose-400 font-bold' : 'text-emerald-400'
                      }`}>
                        {row.directive}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`font-bold ${
                        row.net_pnl_disciplined_lot >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {row.net_pnl_disciplined_lot >= 0 ? '+' : ''}₹{row.net_pnl_disciplined_lot.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span className={`font-bold ${
                        row.net_pnl_blind_lot >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {row.net_pnl_blind_lot >= 0 ? '+' : ''}₹{row.net_pnl_blind_lot.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Audit Footnote */}
        <div className={`p-4 border-t text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 ${
          isDark ? 'bg-slate-950/70 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
        }`}>
          <div>
            <span className="font-bold text-slate-200">Execution Summary: </span>
            <span>Disciplined option seller closed the 24,850 CE wing at ₹12.60 (-₹177.50 loss) on Nov 03 and locked 53% decay on the 21,050 PE wing at ₹9.10 (+₹696.25 profit) on Nov 05, yielding </span>
            <span className="text-emerald-400 font-bold">+₹518.75 to +₹559/lot NET PROFIT</span>
            <span> vs a </span>
            <span className="text-rose-400 font-bold">-₹10,019/lot BLOWOUT</span>
            <span> for passive holders.</span>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className="text-[11px] font-mono">1 Lot = 25 Contracts</span>
          </div>
        </div>
      </div>
      </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. Native 4-Panel Publication Chart Modal                     */}
      {/* ------------------------------------------------------------- */}
      {showNativeChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className={`relative max-w-5xl w-full max-h-[90vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="p-4 border-b border-slate-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-cyan-400" />
                <h3 className="font-bold text-sm">Microstructure Replay Charts (4-Panel Publication-Grade 200 DPI)</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/microstructure/chart-image?t=${chartImgTs}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-cyan-400" />
                  Full Resolution
                </a>
                <button
                  onClick={() => handleRun('charts')}
                  disabled={isExecuting}
                  className="text-xs px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition"
                >
                  Regenerate Charts
                </button>
                <button
                  onClick={() => setShowNativeChartModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-start bg-slate-950">
              <img
                src={`/api/microstructure/chart-image?t=${chartImgTs}`}
                alt="Microstructure Replay Charts"
                className="max-w-full h-auto rounded-lg shadow-lg border border-slate-800"
                onError={(e) => {
                  (e.target as any).src = '';
                  (e.target as any).alt = 'Chart image currently generating. Please click "Regenerate Charts".';
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

