import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  Archive,
  Search,
  Download,
  Calendar,
  Layers,
  Filter,
  ExternalLink,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
  Check
} from 'lucide-react';
import { ArchiveRecord, ArchiveExpiryMeta, OptionMatch } from '../types';
import { getArchiveData } from '../services/api';

interface ArchiveViewProps {
  theme: 'dark' | 'light';
  onSelectStrike?: (match: OptionMatch) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ theme, onSelectStrike }) => {
  const isDark = theme === 'dark';
  // Active contracts (fast initial load) and Expired contracts (loaded on demand)
  const [activeRecords, setActiveRecords] = useState<ArchiveRecord[]>([]);
  const [expiredRecords, setExpiredRecords] = useState<ArchiveRecord[]>([]);
  const [hasLoadedExpired, setHasLoadedExpired] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingPast, setIsLoadingPast] = useState<boolean>(false);

  // Expiries metadata (contains all active and past expiries from backend)
  const [expiriesMeta, setExpiriesMeta] = useState<ArchiveExpiryMeta[]>([]);
  const [summaryStats, setSummaryStats] = useState({ total: 0, active: 0, expired: 0 });

  // Logical Filter States
  const [recency, setRecency] = useState<string>('all'); // all, today, 1d, 2d, 3d, 7d
  const [pattern, setPattern] = useState<string>('all');
  const [selectedExpiries, setSelectedExpiries] = useState<string[]>([]);
  const [isExpiryDropdownOpen, setIsExpiryDropdownOpen] = useState<boolean>(false);
  const expiryDropdownRef = useRef<HTMLDivElement>(null);
  // Default to 'active' for lightning fast initial load!
  const [expiryStatus, setExpiryStatus] = useState<'all' | 'active' | 'expired'>('active');
  const [optionType, setOptionType] = useState<string>('all'); // all, CE, PE, VIX
  const [timeframe, setTimeframe] = useState<string>('all'); // all, 75m, 1d, weekly, monthly
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(200);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset pagination to first page whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [recency, pattern, selectedExpiries, expiryStatus, optionType, timeframe, filterQuery]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (expiryDropdownRef.current && !expiryDropdownRef.current.contains(event.target as Node)) {
        setIsExpiryDropdownOpen(false);
      }
    };
    if (isExpiryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpiryDropdownOpen]);

  // 1. Initial fast load: only active contracts + expiries metadata (<20ms)
  useEffect(() => {
    setIsLoading(true);
    getArchiveData('active', 0)
      .then(res => {
        setActiveRecords(res.records || []);
        setExpiriesMeta(res.expiries_meta || []);
        setSummaryStats({
          total: res.total_signals || 0,
          active: res.active_signals || 0,
          expired: res.expired_signals || 0
        });
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load active archive:', err);
        setIsLoading(false);
      });
  }, []);

  // 2. On-demand loader for historical expired data (only called when user asks for past expiries)
  const loadExpiredRecordsIfNeeded = useCallback(async () => {
    if (hasLoadedExpired || isLoadingPast) return;
    setIsLoadingPast(true);
    try {
      const res = await getArchiveData('expired', 0);
      setExpiredRecords(res.records || []);
      setHasLoadedExpired(true);
    } catch (err) {
      console.error('Failed to load expired archive data:', err);
    } finally {
      setIsLoadingPast(false);
    }
  }, [hasLoadedExpired, isLoadingPast]);

  // Trigger on-demand past load when user selects 'expired' or 'all' status
  useEffect(() => {
    if (expiryStatus === 'expired' || expiryStatus === 'all') {
      loadExpiredRecordsIfNeeded();
    }
  }, [expiryStatus, loadExpiredRecordsIfNeeded]);

  // Trigger on-demand past load if user selects an expired expiry from dropdown
  useEffect(() => {
    if (selectedExpiries.length > 0) {
      const hasExpired = selectedExpiries.some(e => e < todayStr && e !== 'INDEX');
      if (hasExpired) {
        loadExpiredRecordsIfNeeded();
      }
    }
  }, [selectedExpiries, todayStr, loadExpiredRecordsIfNeeded]);

  // Combined records for current view scope
  const records = useMemo(() => {
    if (expiryStatus === 'active') {
      return activeRecords;
    } else if (expiryStatus === 'expired') {
      return expiredRecords;
    } else {
      return [...activeRecords, ...expiredRecords];
    }
  }, [activeRecords, expiredRecords, expiryStatus]);

  // Check if today is a weekday and current time >= 09:15 (market is live or has been live today)
  const isMarketLiveOrHasBeenLiveToday = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false; // Weekend (Sun = 0, Sat = 6)
    const hm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return hm >= '09:15';
  }, []);

  // Determine reference date: when market is live or has been live today, 'today' strictly refers to today's session
  const referenceDate = useMemo(() => {
    const now = new Date();
    if (isMarketLiveOrHasBeenLiveToday) {
      return now;
    }
    if (records.length === 0) return now;
    let maxTs = 0;
    records.forEach(r => {
      const ts = new Date(r.timestamp).getTime();
      if (!isNaN(ts) && ts > maxTs && ts <= Date.now() + 86400000) {
        maxTs = ts;
      }
    });
    return maxTs > 0 ? new Date(maxTs) : now;
  }, [records, isMarketLiveOrHasBeenLiveToday]);

  // Unique expiries for dropdown (includes both active and past expiries)
  const uniqueExpiries = useMemo(() => {
    if (expiriesMeta.length > 0) {
      return expiriesMeta.filter(m => m.expiry && m.expiry !== 'INDEX').map(m => m.expiry);
    }
    const set = new Set<string>();
    activeRecords.forEach(r => { if (r.expiry && r.expiry !== 'INDEX') set.add(r.expiry); });
    expiredRecords.forEach(r => { if (r.expiry && r.expiry !== 'INDEX') set.add(r.expiry); });
    return Array.from(set).sort();
  }, [expiriesMeta, activeRecords, expiredRecords]);

  // Comprehensive Filtering
  const filtered = useMemo(() => {
    const list = records.filter(r => {
      // 1. Recency / Date Filter
      if (recency !== 'all') {
        const rDate = new Date(r.timestamp);
        if (isNaN(rDate.getTime())) return false;
        
        // Days difference from referenceDate
        const refZero = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
        const rZero = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate()).getTime();
        const diffDays = Math.round((refZero - rZero) / (1000 * 60 * 60 * 24));

        if (recency === 'today') {
          if (diffDays !== 0) return false;
        } else if (recency === '1d') {
          const maxGap = referenceDate.getDay() === 1 ? 3 : 1;
          if (diffDays < 1 || diffDays > maxGap) return false;
        } else if (recency === '2d' && (diffDays < 0 || diffDays > 2)) return false;
        if (recency === '3d' && (diffDays < 0 || diffDays > 3)) return false;
        if (recency === '7d' && (diffDays < 0 || diffDays > 7)) return false;
      }

      // 2. Pattern Filter
      if (pattern !== 'all') {
        if (!r.pattern.toLowerCase().includes(pattern.toLowerCase())) return false;
      }

      // 3. Expiry Filter (Multi-Select Checkboxes)
      if (selectedExpiries.length > 0 && selectedExpiries.length < uniqueExpiries.length) {
        if (r.option_type === 'VIX') {
          if (optionType === 'CE' || optionType === 'PE') return false;
        } else if (!selectedExpiries.includes(r.expiry)) {
          return false;
        }
      }

      // 4. Expiry Status Filter (Active vs Past Expired)
      if (expiryStatus !== 'all' && r.expiry && r.expiry !== 'INDEX') {
        const isExpired = r.expiry < todayStr;
        if (expiryStatus === 'active' && isExpired) return false;
        if (expiryStatus === 'expired' && !isExpired) return false;
      }

      // 5. Option Type Filter
      if (optionType !== 'all') {
        if (r.option_type !== optionType) return false;
      }

      // 6. Timeframe Filter
      if (timeframe !== 'all') {
        if (r.timeframe.toLowerCase() !== timeframe.toLowerCase()) return false;
      }

      // 7. Text Search Filter
      if (filterQuery.trim()) {
        const q = filterQuery.toLowerCase();
        const match =
          r.symbol.toLowerCase().includes(q) ||
          r.pattern.toLowerCase().includes(q) ||
          r.expiry.toLowerCase().includes(q) ||
          r.timeframe.toLowerCase().includes(q) ||
          r.details.toLowerCase().includes(q) ||
          String(r.strike).includes(q);
        if (!match) return false;
      }

      return true;
    });

    // Default presentation order: Recent date to oldest date
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, recency, pattern, selectedExpiries, uniqueExpiries.length, expiryStatus, optionType, timeframe, filterQuery, referenceDate, todayStr]);

  // Statistics of filtered subset
  const stats = useMemo(() => {
    let ce = 0, pe = 0, vix = 0;
    filtered.forEach(r => {
      if (r.option_type === 'CE') ce++;
      else if (r.option_type === 'PE') pe++;
      else if (r.option_type === 'VIX') vix++;
    });
    return { ce, pe, vix, total: filtered.length };
  }, [filtered]);

  const hasActiveFilters =
    recency !== 'all' ||
    pattern !== 'all' ||
    selectedExpiries.length > 0 ||
    expiryStatus !== 'all' ||
    optionType !== 'all' ||
    timeframe !== 'all' ||
    filterQuery.trim() !== '';

  const resetFilters = () => {
    setRecency('all');
    setPattern('all');
    setSelectedExpiries([]);
    setExpiryStatus('all');
    setOptionType('all');
    setTimeframe('all');
    setFilterQuery('');
  };

  const exportCSV = () => {
    if (filtered.length === 0) return;
    const headers = Object.keys(filtered[0]).join(',');
    const rows = filtered.map(r => Object.values(r).map(v => `"${v}"`).join(','));
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `pattern_archive_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = useMemo(() => {
    if (pageSize === 0) return 1;
    return Math.max(1, Math.ceil(filtered.length / pageSize));
  }, [filtered.length, pageSize]);

  const paginatedList = useMemo(() => {
    if (pageSize === 0) return filtered;
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  const handleRowClick = (r: ArchiveRecord) => {
    if (onSelectStrike) {
      onSelectStrike({
        symbol: r.symbol,
        token: (r.token && r.token.trim()) ? r.token : r.symbol,
        strike: r.strike,
        expiry: r.expiry,
        option_type: r.option_type,
        timeframe: r.timeframe as any,
        pattern: r.pattern,
        direction: r.direction as any,
        date: r.timestamp,
        ltp: r.ltp
      });
    }
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header & Export Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className={`text-base font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Archive className="h-4 w-4 text-emerald-500" />
            <span>Historical Pattern Trigger Archive</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {summaryStats.total || records.length} Total Signals
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {summaryStats.active || activeRecords.length} Active
            </span>
            {summaryStats.expired > 0 && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                hasLoadedExpired
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {summaryStats.expired} Past Expired {hasLoadedExpired ? '(Loaded)' : '(On-Demand)'}
              </span>
            )}
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Persistent audit log of all option reversal signals triggered across past market sessions
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 border transition ${
                isDark
                  ? 'text-slate-300 bg-slate-800/80 hover:bg-slate-800 border-slate-700'
                  : 'text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-300'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Filters</span>
            </button>
          )}

          <button
            onClick={exportCSV}
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl px-3 py-1.5 border transition ${
              isDark
                ? 'text-slate-200 bg-slate-900 hover:bg-slate-800 border-slate-800'
                : 'text-slate-700 bg-white hover:bg-slate-100 border-slate-300'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span>Export Filtered ({filtered.length})</span>
          </button>
        </div>
      </div>

      {/* Logical Filter Toolbar */}
      <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        {/* Row 1: Recency Quick Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mr-1">
            <Calendar className="h-3 w-3 text-emerald-400" />
            Recency:
          </span>
          {[
            { id: 'all', label: 'All Time' },
            { id: 'today', label: 'Today' },
            { id: '1d', label: 'Last 1 Day' },
            { id: '2d', label: 'Last 2 Days' },
            { id: '3d', label: 'Last 3 Days' },
            { id: '7d', label: 'Last 1 Week' },
          ].map(chip => {
            const isActive = recency === chip.id;
            return (
              <button
                key={chip.id}
                onClick={() => setRecency(chip.id)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                    ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Dropdowns & Instrument Selector */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/40">
          {/* Instrument Type Buttons */}
          <div className="flex items-center gap-1">
            {[
              { id: 'all', label: 'All Instruments' },
              { id: 'CE', label: 'Calls (CE)' },
              { id: 'PE', label: 'Puts (PE)' },
              { id: 'VIX', label: 'India VIX' },
            ].map(btn => {
              const isActive = optionType === btn.id;
              return (
                <button
                  key={btn.id}
                  onClick={() => setOptionType(btn.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-bold transition ${
                    isActive
                      ? btn.id === 'CE'
                        ? 'bg-rose-600 text-white'
                        : btn.id === 'PE'
                        ? 'bg-emerald-600 text-white'
                        : btn.id === 'VIX'
                        ? 'bg-amber-600 text-white'
                        : 'bg-blue-600 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* Pattern Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Pattern:</span>
            <select
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">All Patterns</option>
              <option value="Dhurandar">Dhurandar Support Radar</option>
              <option value="Bollinger">Bollinger Band Reversals</option>
              <option value="RSI">RSI-Ichimoku</option>
              <option value="Tenkan">Tenkan Crossover</option>
            </select>
            {isLoadingPast && (
              <span className="text-[10px] text-amber-400 animate-pulse font-medium flex items-center gap-1">
                <Activity className="h-3 w-3 animate-spin" /> Loading past data...
              </span>
            )}
          </div>

          {/* Expiry Status Filter (All, Active, Expired) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">Status:</span>
            <select
              value={expiryStatus}
              onChange={e => setExpiryStatus(e.target.value as any)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="active">Active Contracts ({summaryStats.active || activeRecords.length})</option>
              <option value="expired">Past / Expired Contracts ({summaryStats.expired || (hasLoadedExpired ? expiredRecords.length : 'Load On-Demand')})</option>
              <option value="all">All Expiries ({summaryStats.total || (activeRecords.length + expiredRecords.length)})</option>
            </select>
            {isLoadingPast && (
              <span className="text-[10px] text-amber-400 animate-pulse font-medium flex items-center gap-1">
                <Activity className="h-3 w-3 animate-spin" /> Loading past data...
              </span>
            )}
          </div>

          {/* Expiry Multi-Select Checkboxes Dropdown */}
          <div className="relative" ref={expiryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsExpiryDropdownOpen(!isExpiryDropdownOpen)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border flex items-center gap-1.5 transition ${
                isExpiryDropdownOpen
                  ? isDark
                    ? 'bg-slate-800 border-emerald-500 text-emerald-400'
                    : 'bg-emerald-50 border-emerald-600 text-emerald-800'
                  : isDark
                  ? 'bg-slate-800 border-slate-700 text-white hover:border-slate-600'
                  : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-slate-400'
              }`}
            >
              <span className="text-[11px] font-normal text-slate-400">Expiry:</span>
              <span>
                {selectedExpiries.length === 0 || selectedExpiries.length === uniqueExpiries.length
                  ? `All Expiries (${uniqueExpiries.length})`
                  : selectedExpiries.length === 1
                  ? formatExpiryDate(selectedExpiries[0])
                  : `${selectedExpiries.length} Selected`}
              </span>
              <ChevronDown className={`h-3 w-3 transition-transform ${isExpiryDropdownOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`} />
            </button>

            {isExpiryDropdownOpen && (
              <div className={`absolute left-0 mt-2 w-64 rounded-xl border shadow-xl z-50 p-2 text-xs transition-all ${
                isDark ? 'bg-slate-900 border-slate-700 shadow-slate-950/80 text-slate-100' : 'bg-white border-slate-200 shadow-slate-400/30 text-slate-900'
              }`}>
                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-800/40 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Expiries</span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setSelectedExpiries([...uniqueExpiries])}
                      className="text-emerald-500 hover:underline font-semibold"
                    >
                      All
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedExpiries([])}
                      className="text-slate-400 hover:text-rose-400 font-semibold"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                  {uniqueExpiries.map(exp => {
                    const isChecked = selectedExpiries.length === 0 || selectedExpiries.includes(exp);
                    return (
                      <div
                        key={exp}
                        onClick={() => {
                          if (selectedExpiries.length === 0) {
                            // If all were active, unchecking one leaves the rest
                            setSelectedExpiries(uniqueExpiries.filter(e => e !== exp));
                          } else if (selectedExpiries.includes(exp)) {
                            setSelectedExpiries(selectedExpiries.filter(e => e !== exp));
                          } else {
                            setSelectedExpiries([...selectedExpiries, exp]);
                          }
                        }}
                        className={`group flex items-center justify-between px-2 py-1 rounded-md cursor-pointer transition ${
                          isChecked
                            ? isDark
                              ? 'bg-emerald-950/20 text-emerald-200'
                              : 'bg-emerald-50 text-emerald-900'
                            : isDark
                            ? 'hover:bg-slate-800/60 text-slate-400'
                            : 'hover:bg-slate-100 text-slate-600'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                            isChecked
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : isDark
                              ? 'border-slate-700 bg-slate-950'
                              : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span>{formatExpiryDate(exp)}</span>
                            {exp < todayStr && exp !== 'INDEX' && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                                Expired
                              </span>
                            )}
                            {(() => {
                              const m = expiriesMeta.find(meta => meta.expiry === exp);
                              return m ? (
                                <span className="text-[9px] font-mono text-slate-500">
                                  ({m.count})
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExpiries([exp]);
                          }}
                          className={`opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0.2 rounded font-semibold ${
                            isDark ? 'bg-slate-800 hover:bg-emerald-600 text-slate-300' : 'bg-slate-200 hover:bg-emerald-600 text-slate-700'
                          }`}
                        >
                          Only
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-400">TF:</span>
            <select
              value={timeframe}
              onChange={e => setTimeframe(e.target.value)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold border focus:outline-none focus:border-emerald-500 ${
                isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}
            >
              <option value="all">All Timeframes</option>
              <option value="75m">75m</option>
              <option value="1d">1D (Daily)</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            {isLoadingPast && (
              <span className="text-[10px] text-amber-400 animate-pulse font-medium flex items-center gap-1">
                <Activity className="h-3 w-3 animate-spin" /> Loading past data...
              </span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className={`absolute left-3 top-2.5 h-3.5 w-3.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              placeholder="Search strike, symbol..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500 border transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                  : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>
        </div>

        {/* Dynamic Filter Summary Counter */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800/40 text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className={isDark ? 'text-white' : 'text-slate-900'}>{stats.total}</strong> of{' '}
              {records.length} archived triggers
            </span>
            <span className="text-emerald-400 font-semibold">• {stats.pe} Puts (PE)</span>
            <span className="text-rose-400 font-semibold">• {stats.ce} Calls (CE)</span>
            {stats.vix > 0 && <span className="text-amber-400 font-semibold">• {stats.vix} India VIX</span>}
          </div>

          <span className="text-[10px] italic text-slate-500">
            Click any row to open the interactive candlestick chart with 21 WMA & RSI
          </span>
        </div>
      </div>

      {/* Table */}
      <div className={`border rounded-xl overflow-hidden transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-white shadow-sm'
      }`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b uppercase tracking-wider text-[10px] font-semibold transition-colors ${
                isDark ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}>
                <th className="py-2.5 px-4">Trigger Timestamp</th>
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Expiry</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">TF</th>
                <th className="py-2.5 px-4">Pattern</th>
                <th className="py-2.5 px-3">Direction</th>
                <th className="py-2.5 px-3 text-right">LTP (₹)</th>
                <th className="py-2.5 px-3 text-right">Trigger Lvl (₹)</th>
                <th className="py-2.5 px-4">Details</th>
                <th className="py-2.5 px-3 text-center">Chart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    Loading historical archive...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-500 font-sans">
                    No matching triggers found for current filter selection.
                  </td>
                </tr>
              ) : (
                paginatedList.map((r, i) => (
                  <tr
                    key={i}
                    onClick={() => handleRowClick(r)}
                    className={`cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100/80'
                    }`}
                  >
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                      {formatTimestamp(r.timestamp)}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">
                      {r.symbol}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {formatExpiryDate(r.expiry)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.option_type === 'CE'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : r.option_type === 'PE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {r.option_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold font-sans">
                        {r.timeframe}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-slate-200">
                      {r.pattern}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <span className={`font-semibold ${
                        r.direction === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {r.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      ₹{r.ltp.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      ₹{r.trigger_level.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-4 text-slate-400 font-sans text-[10px]">
                      {r.details || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          handleRowClick(r);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 p-1 rounded hover:bg-slate-800"
                        title="Open Interactive Chart"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filtered.length > 0 && (
          <div className={`px-4 py-3 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
            isDark ? 'border-slate-800 bg-slate-900/60 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}>
            <div className="flex items-center gap-2">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded text-xs focus:outline-none border font-sans ${
                  isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                }`}
              >
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
                <option value={0}>All ({filtered.length})</option>
              </select>
              <span className="ml-2 text-slate-500 font-mono">
                Showing {pageSize === 0 ? 1 : Math.min((currentPage - 1) * pageSize + 1, filtered.length)} - {pageSize === 0 ? filtered.length : Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} triggers
              </span>
            </div>

            {pageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-2 font-sans">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className={`px-3 py-1 rounded border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  Previous
                </button>
                <span className="font-mono text-xs px-2 text-slate-400">
                  Page <strong className={isDark ? 'text-white' : 'text-slate-900'}>{currentPage}</strong> of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className={`px-3 py-1 rounded border text-xs transition disabled:opacity-30 disabled:cursor-not-allowed ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatExpiryDate(expiryStr: string): string {
  if (!expiryStr || expiryStr === 'INDEX') return 'Index';
  try {
    const parts = expiryStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
    }
  } catch {
    // fallback
  }
  return expiryStr;
}

function formatTimestamp(ts: string): string {
  if (!ts) return '-';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return ts;
  }
}
