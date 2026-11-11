import React, { useState, useRef, useEffect } from 'react';
import { TrendingUp, RefreshCw, CheckCircle2, AlertCircle, Clock, Sun, Moon, Zap, ChevronDown, Database, Sparkles, Compass } from 'lucide-react';
import { AppStatus } from '../types';

interface HeaderProps {
  status: AppStatus | null;
  onScanNow: (options?: { force?: boolean; syncCandles?: boolean }) => void;
  onOpenLogin: () => void;
  isLoading: boolean;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSelectVIX?: () => void;
  onRunMicrostructure?: (mode: 'radar' | 'full' | 'charts') => void;
  isMicrostructureRunning?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  onScanNow,
  onOpenLogin,
  isLoading,
  theme,
  onToggleTheme,
  onSelectVIX,
  onRunMicrostructure,
  isMicrostructureRunning = false
}) => {
  const isDark = theme === 'dark';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRadarMenuOpen, setIsRadarMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const radarMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (radarMenuRef.current && !radarMenuRef.current.contains(event.target as Node)) {
        setIsRadarMenuOpen(false);
      }
    };
    if (isMenuOpen || isRadarMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen, isRadarMenuOpen]);

  const isScanning = Boolean(status?.is_scanning);
  const isSyncing = Boolean(status?.is_syncing);
  const isBusy = isLoading || isScanning || isSyncing;
  const syncProgress = status?.sync_progress;

  const handleAction = (options: { force?: boolean; syncCandles?: boolean }) => {
    setIsMenuOpen(false);
    onScanNow(options);
  };

  return (
    <header className={`border-b sticky top-0 z-30 px-6 py-3 flex flex-wrap items-center justify-between gap-4 transition-colors ${
      isDark
        ? 'border-slate-800 bg-slate-900/90 backdrop-blur text-slate-100'
        : 'border-slate-200 bg-white/95 backdrop-blur shadow-sm text-slate-800'
    }`}>
      {/* Title & Brand */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <TrendingUp className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">OTM Option Screener</h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Pro Seller Radar
            </span>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Nifty Out-Of-The-Money Reversal & Dhurandar Support Scanner
          </p>
        </div>
      </div>

      {/* Spot Price, ATM & India VIX Widget */}
      <div className={`flex items-center gap-4 rounded-xl px-4 py-2 border transition-colors ${
        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <div>
          <span className={`text-[10px] uppercase tracking-wider block font-semibold ${
            isDark ? 'text-slate-500' : 'text-slate-600'
          }`}>NIFTY 50 SPOT</span>
          <span className="text-base font-bold tracking-tight">
            {status?.spot_price ? status.spot_price.toLocaleString('en-IN') : 'Loading...'}
          </span>
        </div>
        <div className={`h-7 w-[1px] ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        <div>
          <span className={`text-[10px] uppercase tracking-wider block font-semibold ${
            isDark ? 'text-slate-500' : 'text-slate-600'
          }`}>ATM STRIKE</span>
          <span className={`text-base font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {status?.atm_strike ? status.atm_strike.toLocaleString('en-IN') : '--'}
          </span>
        </div>
        <div className={`h-7 w-[1px] ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />
        <div
          onClick={onSelectVIX}
          className="cursor-pointer hover:opacity-80 transition group"
          title="Click to show India VIX signals in screener"
        >
          <span className="text-[10px] uppercase tracking-wider text-purple-500 block font-semibold group-hover:underline">
            INDIA VIX ↗
          </span>
          <span className={`text-base font-bold tracking-tight ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
            {status?.vix_price ? status.vix_price.toFixed(2) : '--'}
          </span>
        </div>
        <div className={`h-7 w-[1px] ${isDark ? 'bg-slate-800' : 'bg-slate-300'}`} />

        <div className="flex items-center gap-2.5">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] uppercase tracking-wider font-semibold ${
                status?.is_market_open
                  ? 'text-amber-500'
                  : 'text-emerald-500 font-bold'
              }`}>
                {status?.is_market_open ? 'Market Open' : 'Market Closed'}
              </span>
              {status?.is_market_open ? (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                  Auto 75m Sync Active
                </span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Off-Market (Best for Scan)
                </span>
              )}
            </div>
            <div className={`flex items-center gap-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <Clock className="h-3 w-3" />
              <span>Next 75m: {status?.next_75m_close || '--'}</span>
            </div>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${status?.is_market_open ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
        </div>
      </div>

      {/* Theme Toggle, Auth & Scan Now Controls */}
      <div className="flex items-center gap-3">
        {/* Black / White Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
              : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
          }`}
          title={isDark ? 'Switch to White (Light) Background' : 'Switch to Black (Dark) Background'}
        >
          {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-600" />}
          <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>

        {status?.is_connected ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Connected ({status.client_code})</span>
          </div>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-1.5 transition"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span>Login SmartAPI</span>
          </button>
        )}

        {/* Run NIFTY Microstructure Radar Separate Button */}
        <div className="relative" ref={radarMenuRef}>
          <div className="flex items-center rounded-lg shadow-sm">
            <button
              onClick={() => {
                setIsRadarMenuOpen(false);
                onRunMicrostructure?.('radar');
              }}
              disabled={isMicrostructureRunning}
              title="Run NIFTY Microstructure Radar (Single-Batch Flow, Replay & NSE FII Sync)"
              className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-l-lg transition border disabled:opacity-75 ${
                isMicrostructureRunning
                  ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-300'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-600/20'
              }`}
            >
              {isMicrostructureRunning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              ) : (
                <Compass className="h-3.5 w-3.5 text-white" />
              )}
              <span>{isMicrostructureRunning ? 'Running Radar...' : '⚡ Radar'}</span>
            </button>

            <button
              onClick={() => setIsRadarMenuOpen(!isRadarMenuOpen)}
              disabled={isMicrostructureRunning}
              title="Microstructure Radar Options"
              className={`px-1.5 py-1.5 rounded-r-lg border-y border-r transition text-xs disabled:opacity-75 ${
                isMicrostructureRunning
                  ? 'bg-cyan-600/30 border-cyan-500/40 text-cyan-300'
                  : 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-500'
              }`}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isRadarMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Radar Options Dropdown Menu */}
          {isRadarMenuOpen && (
            <div className={`absolute right-0 mt-2 w-72 rounded-xl border shadow-xl p-2 z-50 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}>
              <div className="px-2.5 py-1.5 border-b border-slate-800/50 mb-1">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Microstructure &amp; NTSI Execution
                </span>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Native Studio Backend Engine
                </p>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => {
                    setIsRadarMenuOpen(false);
                    onRunMicrostructure?.('radar');
                  }}
                  className={`w-full text-left p-2 rounded-lg transition flex items-start gap-2.5 ${
                    isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <Compass className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-cyan-400">Microstructure Radar (Fast)</span>
                    <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Single batch Futures &amp; Walls quote + Replay sync + NSE FII/DII data sync.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsRadarMenuOpen(false);
                    onRunMicrostructure?.('full');
                  }}
                  className={`w-full text-left p-2 rounded-lg transition flex items-start gap-2.5 ${
                    isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="p-1 rounded bg-purple-500/10 text-purple-400 shrink-0 mt-0.5">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-purple-400">Full NIFTY Analysis Pipeline</span>
                    <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Executes NTSI model, Microstructure radar, Flow replay &amp; NSE FII/DII sync.
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsRadarMenuOpen(false);
                    onRunMicrostructure?.('charts');
                  }}
                  className={`w-full text-left p-2 rounded-lg transition flex items-start gap-2.5 ${
                    isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block text-emerald-400">Regenerate 4-Panel Charts</span>
                    <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Re-plots high-res Matplotlib microstructure replay charts.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scan Now Combined Control */}
        <div className="relative" ref={menuRef}>
          <div className="flex items-center rounded-lg shadow-sm">
            {/* Primary Action Button */}
            <button
              onClick={() => handleAction({ syncCandles: true, force: false })}
              disabled={isBusy}
              title="Sync latest candles & scan patterns (ideal off-market hours)"
              className={`flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-l-lg transition border disabled:opacity-75 ${
                isBusy
                  ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-600/20'
              }`}
            >
              {isBusy ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              ) : (
                <Zap className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              )}
              <span>
                {isSyncing
                  ? syncProgress?.current
                    ? `Syncing (${syncProgress.current}/${syncProgress.total})...`
                    : 'Syncing candles...'
                  : isScanning
                  ? 'Analyzing patterns...'
                  : 'Scan Now'}
              </span>
            </button>

            {/* Split Dropdown Trigger */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              disabled={isBusy}
              title="Scan Options"
              className={`px-2 py-1.5 rounded-r-lg border-y border-r transition text-xs disabled:opacity-75 ${
                isBusy
                  ? 'bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
              }`}
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Progress Bar under button when busy */}
          {isBusy && syncProgress && syncProgress.percent > 0 && (
            <div className="absolute -bottom-1.5 left-0 right-0 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, syncProgress.percent)}%` }}
              />
            </div>
          )}

          {/* Options Dropdown Menu */}
          {isMenuOpen && (
            <div className={`absolute right-0 mt-2 w-72 rounded-xl border shadow-xl p-2 z-50 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-slate-300/50'
            }`}>
              <div className="px-2.5 py-1.5 border-b border-slate-800/50 mb-1">
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Scanner Run Modes
                </span>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Choose when and how to scan Nifty OTM strikes
                </p>
              </div>

              {/* Option 1: Full Sync & Scan */}
              <button
                onClick={() => handleAction({ syncCandles: true, force: false })}
                className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <div className="p-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-0.5">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">Full Sync & Scan</span>
                    <span className="text-[9px] px-1 rounded bg-emerald-500/10 text-emerald-400 font-bold">Recommended</span>
                  </div>
                  <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Fetches delta candles from Angel One and detects patterns. Best used off-market hours.
                  </p>
                </div>
              </button>

              {/* Option 2: Quick Local Scan */}
              <button
                onClick={() => handleAction({ syncCandles: false, force: false })}
                className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition mt-1 ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <div className="p-1 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 mt-0.5">
                  <Database className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold">Quick Scan (Local Data)</span>
                    <span className="text-[9px] px-1 rounded bg-cyan-500/10 text-cyan-400 font-bold">&lt; 1 sec</span>
                  </div>
                  <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Re-analyzes all patterns instantly from local stores. Zero broker API calls, no rate limit risk.
                  </p>
                </div>
              </button>

              {/* Option 3: Force Full Re-Sync */}
              <button
                onClick={() => handleAction({ syncCandles: true, force: true })}
                className={`w-full text-left p-2 rounded-lg flex items-start gap-2.5 transition mt-1 ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                }`}
              >
                <div className="p-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-0.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="text-xs font-semibold">Force Full Re-Fetch</span>
                  <p className={`text-[11px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Forces re-download of all contracts from broker, ignoring local cache checkpoints.
                  </p>
                </div>
              </button>

              {status?.last_scan_time && (
                <div className={`mt-2 pt-2 border-t text-[10px] px-2 flex justify-between ${
                  isDark ? 'border-slate-800 text-slate-400' : 'border-slate-100 text-slate-500'
                }`}>
                  <span>Last Scan:</span>
                  <span className="font-mono">{status.last_scan_time}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
