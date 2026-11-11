import React, { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { FiltersBar } from './components/FiltersBar';
import { ScreenerTable } from './components/ScreenerTable';
import { ChartModal } from './components/ChartModal';
import { LoginModal } from './components/LoginModal';
import { ArchiveView } from './components/ArchiveView';
import { ReportView } from './components/ReportView';
import { NewStrikesView } from './components/NewStrikesView';
import { MicrostructureRadarView } from './components/MicrostructureRadarView';
import { AppStatus, OptionMatch } from './types';
import { getStatus, getExpiries, runScreener, triggerScanNow, runMicrostructure, getMicrostructureStatus } from './services/api';
import { Sparkles, Layers, Activity, Radio, Archive, FileText, Zap, Compass } from 'lucide-react';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('screener_theme') as 'dark' | 'light') || 'dark';
  });

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('screener_theme', next);
  };

  const isDark = theme === 'dark';

  const [status, setStatus] = useState<AppStatus | null>(null);
  const [expiries, setExpiries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  
  const [timeframe, setTimeframe] = useState<string>('all');
  const [selectedExpiries, setSelectedExpiries] = useState<string[]>([]);
  const [optionType, setOptionType] = useState<string>('all');
  const [proximityOnly, setProximityOnly] = useState<boolean>(false);

  const [allMatches, setAllMatches] = useState<OptionMatch[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStrike, setSelectedStrike] = useState<OptionMatch | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [isMicrostructureRunning, setIsMicrostructureRunning] = useState<boolean>(false);
  const [microstructureRefreshKey, setMicrostructureRefreshKey] = useState<number>(0);

  const handleRunMicrostructure = async (mode: 'radar' | 'full' | 'charts' = 'radar') => {
    setIsMicrostructureRunning(true);
    setActiveTab('microstructure');
    try {
      await runMicrostructure(mode);
      const pollInterval = setInterval(async () => {
        try {
          const st = await getMicrostructureStatus();
          if (!st.is_running) {
            setIsMicrostructureRunning(false);
            setMicrostructureRefreshKey(prev => prev + 1);
            clearInterval(pollInterval);
          }
        } catch {
          setIsMicrostructureRunning(false);
          clearInterval(pollInterval);
        }
      }, 1500);
    } catch (err) {
      console.error('Failed to trigger microstructure run:', err);
      setIsMicrostructureRunning(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshStatus();
    getExpiries().then(expList => {
      setExpiries(expList);
      setSelectedExpiries(expList);
    });
    fetchScreener(false);

    // Subtle 30s background sync to receive updates
    const interval = setInterval(() => {
      refreshStatus();
      runScreener({ force: false })
        .then(res => {
          if (res && res.matches && res.matches.length > 0) {
            setAllMatches(res.matches);
          }
        })
        .catch(() => {});
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const refreshStatus = () => {
    getStatus().then(setStatus).catch(err => console.error('Status check error:', err));
  };

  // Active fast polling whenever a background scan or delta sync is active
  useEffect(() => {
    const isBusy = Boolean(status?.is_syncing || status?.is_scanning);
    if (!isBusy) return;

    const timer = setInterval(async () => {
      try {
        const nextStatus = await getStatus();
        setStatus(nextStatus);
        if (!nextStatus.is_syncing && !nextStatus.is_scanning) {
          clearInterval(timer);
          setIsLoading(false);
          // Reload screener with freshly scanned pattern data
          const res = await runScreener({ force: false });
          if (res && res.matches) {
            setAllMatches(res.matches);
          }
        }
      } catch (e) {
        console.error('Status poll error:', e);
      }
    }, 1500);

    return () => clearInterval(timer);
  }, [status?.is_syncing, status?.is_scanning]);

  const fetchScreener = async (force: boolean = false) => {
    setIsLoading(true);
    try {
      const res = await runScreener({ force });
      if (res.matches) {
        setAllMatches(res.matches);
      }
      refreshStatus();
    } catch (err) {
      console.error('Screener fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanNow = async (options: { force?: boolean; syncCandles?: boolean } = { force: false, syncCandles: true }) => {
    // If user requested broker candle sync but session is offline, show LoginModal
    if (options.syncCandles && !status?.is_connected) {
      setIsLoginOpen(true);
      return;
    }

    setIsLoading(true);
    try {
      await triggerScanNow(options.force, options.syncCandles);
      // Immediately refresh status to pick up is_syncing / is_scanning flags
      const currentStatus = await getStatus();
      setStatus(currentStatus);
    } catch (err) {
      console.error('Scan trigger error:', err);
      setIsLoading(false);
    }
  };

  // Instant in-memory filtering (<1ms) across all candidate strikes
  const filteredMatches = React.useMemo(() => {
    const result = allMatches.filter(m => {
      // 1. Tab / Pattern Filter
      if (activeTab !== 'all' && activeTab !== 'archive') {
        if (!m.pattern.toLowerCase().includes(activeTab.toLowerCase())) {
          return false;
        }
      }

      // 2. Timeframe Filter
      if (timeframe && timeframe !== 'all') {
        if (m.timeframe !== timeframe) return false;
      }

      // 3. Expiry Filter (Multi-Select Checkboxes)
      if (selectedExpiries.length < expiries.length) {
        if (m.option_type === 'VIX') {
          // Keep VIX visible unless user explicitly asked for CE or PE only
          if (optionType === 'CE' || optionType === 'PE') return false;
        } else if (!selectedExpiries.includes(m.expiry)) {
          return false;
        }
      }

      // 4. Option Type Filter
      if (optionType && optionType !== 'all') {
        if (m.option_type !== optionType) return false;
      }

      // 5. Proximity Alert (Near L1 / Disc1 <= 3%)
      if (proximityOnly) {
        if (m.proximity !== 'Near L1' && m.proximity !== 'Near Disc1') return false;
      }

      return true;
    });

    // Default pattern detected presentation: Recent date to oldest date
    return result.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA; // Recent date first, oldest date last
      }
      return a.symbol.localeCompare(b.symbol);
    });
  }, [allMatches, activeTab, timeframe, selectedExpiries, expiries.length, optionType, proximityOnly]);


  return (
    <div className={`min-h-screen flex flex-col transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <Header
        status={status}
        onScanNow={handleScanNow}
        onOpenLogin={() => setIsLoginOpen(true)}
        isLoading={isLoading}
        theme={theme}
        onToggleTheme={toggleTheme}
        onSelectVIX={() => {
          setOptionType('VIX');
          setActiveTab('all');
        }}
        onRunMicrostructure={handleRunMicrostructure}
        isMicrostructureRunning={isMicrostructureRunning}
      />

      {/* Main Pattern Navigation Tabs */}
      <div className={`px-6 pt-2 flex items-center gap-2 border-b transition-colors overflow-x-auto ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {[
          { id: 'all', label: 'All OTM Patterns', icon: Layers },
          { id: 'microstructure', label: 'Microstructure Radar', icon: Compass },
          { id: 'new-strikes', label: 'New Far Strikes', icon: Zap },
          { id: 'Dhurandar', label: 'Dhurandar Support Radar', icon: Sparkles },
          { id: 'Bollinger', label: 'Bollinger Reversals', icon: Activity },
          { id: 'RSI-Ichimoku', label: 'RSI-Ichimoku', icon: Radio },
          { id: 'Tenkan', label: 'Tenkan Crossovers', icon: Activity },
          { id: 'report', label: 'Intelligence Report', icon: FileText },
          { id: 'archive', label: 'Historical Archive', icon: Archive },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition shrink-0 ${
                isActive
                  ? isDark
                    ? 'border-emerald-500 text-white bg-slate-800/40 rounded-t-lg'
                    : 'border-emerald-600 text-emerald-700 bg-emerald-50/70 rounded-t-lg'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${
                isActive
                  ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                  : isDark ? 'text-slate-500' : 'text-slate-400'
              }`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'microstructure' ? (
        <MicrostructureRadarView
          theme={theme}
          onSelectStrike={setSelectedStrike}
          refreshKey={microstructureRefreshKey}
          externalIsRunning={isMicrostructureRunning}
        />
      ) : activeTab === 'new-strikes' ? (
        <NewStrikesView theme={theme} onSelectStrike={setSelectedStrike} />
      ) : activeTab === 'report' ? (
        <ReportView theme={theme} onSelectStrike={setSelectedStrike} />
      ) : activeTab === 'archive' ? (
        <ArchiveView theme={theme} onSelectStrike={setSelectedStrike} />
      ) : (
        <>
          {/* Filters Bar */}
          <FiltersBar
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            selectedExpiries={selectedExpiries}
            setSelectedExpiries={setSelectedExpiries}
            expiries={expiries}
            optionType={optionType}
            setOptionType={setOptionType}
            proximityOnly={proximityOnly}
            setProximityOnly={setProximityOnly}
            totalMatches={filteredMatches.length}
            theme={theme}
          />

          {/* Results Table */}
          <main className="flex-1 overflow-auto">
            <ScreenerTable
              matches={filteredMatches}
              onSelectStrike={setSelectedStrike}
              theme={theme}
            />
          </main>

        </>
      )}

      {/* Interactive Candlestick Chart Modal */}
      {selectedStrike && (
        <ChartModal
          strikeMatch={selectedStrike}
          onClose={() => setSelectedStrike(null)}
          theme={theme}
        />
      )}

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          refreshStatus();
          fetchScreener(false);
        }}
      />
    </div>
  );
};
