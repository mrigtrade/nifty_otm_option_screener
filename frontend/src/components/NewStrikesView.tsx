import React, { useEffect, useState, useMemo } from 'react';
import {
  Sparkles,
  Search,
  Download,
  Calendar,
  Layers,
  Filter,
  RefreshCw,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Info
} from 'lucide-react';
import { NewStrikeItem, NewStrikesResponse, OptionMatch } from '../types';
import { getNewStrikes, syncNewStrikesBackup } from '../services/api';

interface NewStrikesViewProps {
  theme: 'dark' | 'light';
  onSelectStrike?: (match: OptionMatch) => void;
}

export const NewStrikesView: React.FC<NewStrikesViewProps> = ({ theme, onSelectStrike }) => {
  const isDark = theme === 'dark';

  const [data, setData] = useState<NewStrikesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string>('');
  const [copiedSymbol, setCopiedSymbol] = useState<string | null>(null);

  // Filters
  const [lookback, setLookback] = useState<string>('today'); // today, 1d, 3d, 7d, 30d, all
  const [selectedExpiry, setSelectedExpiry] = useState<string>('all');
  const [optionType, setOptionType] = useState<string>('all'); // all, CE, PE
  const [moneyness, setMoneyness] = useState<string>('all'); // all, OTM, FAR_OTM
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch data
  const fetchData = async (overrideLookback?: string) => {
    setIsLoading(true);
    try {
      const res = await getNewStrikes({
        lookback: overrideLookback ?? lookback,
        expiry: selectedExpiry,
        option_type: optionType,
        moneyness: moneyness,
        search: searchQuery
      });
      setData(res);
    } catch (err) {
      console.error('Failed to fetch new strikes data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [lookback, selectedExpiry, optionType, moneyness, searchQuery]);

  // Handle re-import/sync from daily scanner backup
  const handleSyncBackup = async () => {
    setIsSyncing(true);
    setSyncMessage('');
    try {
      const res = await syncNewStrikesBackup();
      setData(res);
      setSyncMessage('Ledger backup imported & synced!');
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncMessage('Sync failed. Check connection.');
      setTimeout(() => setSyncMessage(''), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopySymbol = (symbol: string) => {
    navigator.clipboard.writeText(symbol);
    setCopiedSymbol(symbol);
    setTimeout(() => setCopiedSymbol(null), 2000);
  };

  const handleExportCSV = () => {
    if (!data || !data.strikes || data.strikes.length === 0) return;
    const headers = [
      'Expiry',
      'Expiry Code',
      'Option Type',
      'Strike',
      'Symbol',
      'Lot Size',
      'First Seen Date',
      'Days Ago',
      'Moneyness',
      'Diff From ATM',
      'Diff Pct',
      'Token'
    ];
    const rows = data.strikes.map(s => [
      `"${s.expiry}"`,
      `"${s.expiry_code}"`,
      s.type,
      s.strike,
      `"${s.symbol}"`,
      s.lot_size,
      s.first_seen,
      s.days_ago,
      s.moneyness,
      s.diff,
      s.diff_pct,
      `"${s.token}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `New_Strikes_${lookback}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary;
  const strikes = data?.strikes || [];
  const expiries = data?.expiries || [];

  return (
    <div className={`flex-1 flex flex-col overflow-hidden transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Banner / KPIs */}
      <div className={`px-6 py-4 border-b transition-colors ${
        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold tracking-tight">Newly Added Option Strikes</h2>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                Far Months Only
              </span>
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Current Month ({summary?.current_month_dropped || 'Sep 2026'}) Dropped
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Tracks newly introduced strikes from daily broker scrip master updates across all future monthly contracts.
            </p>
          </div>

          {/* Spot, ATM & Sync Button */}
          <div className="flex items-center flex-wrap gap-2.5">
            <div className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
              isDark ? 'bg-slate-800/60 border-slate-700/60 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}>
              <span className="text-slate-400 font-medium">NIFTY Spot:</span>
              <span className="font-bold text-emerald-400">
                {summary?.spot_price ? summary.spot_price.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '--'}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400 font-medium">ATM:</span>
              <span className="font-bold text-sky-400">
                {summary?.atm_strike ? summary.atm_strike.toLocaleString('en-IN') : '--'}
              </span>
            </div>

            <button
              onClick={handleSyncBackup}
              disabled={isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-sm'
              }`}
              title="Scan Angel One instrument master and update newly launched strikes"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{isSyncing ? 'Scanning...' : 'Scan / Sync'}</span>
            </button>

            {syncMessage && (
              <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                {syncMessage}
              </span>
            )}
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 mt-3.5">
          <div
            onClick={() => setLookback('today')}
            className={`p-2.5 rounded-lg border cursor-pointer transition ${
              lookback === 'today'
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-500/50 ring-1 ring-emerald-500/30'
                  : 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500/20'
                : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">Added Today</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {summary?.today_count ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">First seen today (0d)</div>
          </div>

          <div
            onClick={() => setLookback('1d')}
            className={`p-2.5 rounded-lg border cursor-pointer transition ${
              lookback === '1d'
                ? isDark
                  ? 'bg-sky-950/40 border-sky-500/50 ring-1 ring-sky-500/30'
                  : 'bg-sky-50/80 border-sky-500 ring-1 ring-sky-500/20'
                : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400">Last 1 Day</span>
            <div className="text-lg font-bold text-sky-400 mt-0.5">
              {summary?.last_1d_count ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Within 24-48 hrs</div>
          </div>

          <div
            onClick={() => setLookback('3d')}
            className={`p-2.5 rounded-lg border cursor-pointer transition ${
              lookback === '3d'
                ? isDark
                  ? 'bg-indigo-950/40 border-indigo-500/50 ring-1 ring-indigo-500/30'
                  : 'bg-indigo-50/80 border-indigo-500 ring-1 ring-indigo-500/20'
                : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400">Last 3 Days</span>
            <div className="text-lg font-bold text-indigo-400 mt-0.5">
              {summary?.last_3d_count ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Recent 3-day additions</div>
          </div>

          <div
            onClick={() => setLookback('7d')}
            className={`p-2.5 rounded-lg border cursor-pointer transition ${
              lookback === '7d'
                ? isDark
                  ? 'bg-purple-950/40 border-purple-500/50 ring-1 ring-purple-500/30'
                  : 'bg-purple-50/80 border-purple-500 ring-1 ring-purple-500/20'
                : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400">Last 7 Days</span>
            <div className="text-lg font-bold text-purple-400 mt-0.5">
              {summary?.last_7d_count ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">Past week cycle</div>
          </div>

          <div
            onClick={() => setLookback('all')}
            className={`p-2.5 rounded-lg border cursor-pointer transition ${
              lookback === 'all'
                ? isDark
                  ? 'bg-amber-950/40 border-amber-500/50 ring-1 ring-amber-500/30'
                  : 'bg-amber-50/80 border-amber-500 ring-1 ring-amber-500/20'
                : isDark
                ? 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700'
                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
            }`}
          >
            <span className="text-[11px] font-semibold text-slate-400">Total Far New</span>
            <div className="text-lg font-bold text-amber-400 mt-0.5">
              {summary?.total_far_new ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">All recorded new strikes</div>
          </div>

          <div className={`p-2.5 rounded-lg border ${
            isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[11px] font-semibold text-slate-400">Far Expiries</span>
            <div className="text-lg font-bold text-slate-200 mt-0.5">
              {summary?.far_expiries_count ?? 0}
            </div>
            <div className="text-[10px] text-slate-400">
              Backup: {summary?.backup_last_modified ? summary.backup_last_modified.split(' ')[0] : 'Active'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className={`px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-100/70 border-slate-200'
      }`}>
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lookback Filter Pills */}
          <div className={`flex items-center p-1 rounded-lg border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            {[
              { id: 'today', label: 'Today (0d)' },
              { id: '1d', label: 'Last 1 Day' },
              { id: '3d', label: 'Last 3 Days' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All New' },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setLookback(item.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  lookback === item.id
                    ? isDark
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-600 text-white shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Expiry Selector (Far Months Only) */}
          <div className="relative">
            <select
              value={selectedExpiry}
              onChange={e => setSelectedExpiry(e.target.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border appearance-none pr-8 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-300 text-slate-800 shadow-xs'
              }`}
            >
              <option value="all">All Far Expiries ({expiries.length} Months)</option>
              {expiries.map(exp => (
                <option key={exp.code} value={exp.code}>
                  {exp.formatted} ({exp.month_year}) • {exp.total_new_strikes} New
                </option>
              ))}
            </select>
          </div>

          {/* Option Type Filter */}
          <div className={`flex items-center p-1 rounded-lg border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            {[
              { id: 'all', label: 'All Types' },
              { id: 'CE', label: 'Calls (CE)' },
              { id: 'PE', label: 'Puts (PE)' },
            ].map(type => (
              <button
                key={type.id}
                onClick={() => setOptionType(type.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  optionType === type.id
                    ? type.id === 'CE'
                      ? 'bg-emerald-600 text-white'
                      : type.id === 'PE'
                      ? 'bg-rose-600 text-white'
                      : isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>

          {/* Moneyness Filter */}
          <div className={`flex items-center p-1 rounded-lg border ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-300 shadow-xs'
          }`}>
            {[
              { id: 'all', label: 'All Strikes' },
              { id: 'OTM', label: 'OTM Only' },
              { id: 'FAR_OTM', label: 'Deep OTM (≥1,000 pts)' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setMoneyness(m.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                  moneyness === m.id
                    ? isDark ? 'bg-slate-700 text-white' : 'bg-slate-800 text-white'
                    : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Export */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search strike or symbol..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={`pl-8 pr-3 py-1.5 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 w-48 sm:w-56 ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-200 placeholder-slate-500'
                  : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400 shadow-xs'
              }`}
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={strikes.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 disabled:opacity-50'
                : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs disabled:opacity-50'
            }`}
          >
            <Download className="h-3.5 w-3.5 text-slate-400" />
            <span>CSV ({strikes.length})</span>
          </button>
        </div>
      </div>

      {/* Main Results Table */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
            <span className="text-xs text-slate-400 font-medium">Scanning far-month new option strikes...</span>
          </div>
        ) : strikes.length === 0 ? (
          <div className={`h-64 rounded-xl border flex flex-col items-center justify-center p-6 text-center ${
            isDark ? 'bg-slate-900/30 border-slate-800/80' : 'bg-white border-slate-200'
          }`}>
            <Zap className="h-8 w-8 text-slate-500 mb-2 opacity-50" />
            <h3 className="text-sm font-bold text-slate-300">No Newly Added Strikes Found</h3>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              No far-month strikes match the current lookback ({lookback}) and filters. Try selecting "Last 30 Days" or "All New" to view earlier incremental discoveries.
            </p>
            <button
              onClick={() => {
                setLookback('all');
                setSelectedExpiry('all');
                setOptionType('all');
                setMoneyness('all');
                setSearchQuery('');
              }}
              className="mt-3 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-500 transition"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className={`rounded-xl border overflow-hidden shadow-xs ${
            isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className={`border-b font-semibold uppercase tracking-wider text-[11px] ${
                    isDark ? 'bg-slate-900/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    <th className="py-3 px-4">Expiry Cycle</th>
                    <th className="py-3 px-4">Strike Price</th>
                    <th className="py-3 px-4 text-center">Type</th>
                    <th className="py-3 px-4">Discovery Date</th>
                    <th className="py-3 px-4 text-center">Moneyness</th>
                    <th className="py-3 px-4 text-right">Distance from ATM</th>
                    <th className="py-3 px-4 text-right">Distance from Spot</th>
                    <th className="py-3 px-4">Trading Symbol</th>
                    <th className="py-3 px-4 text-center">Lot Size</th>
                    {onSelectStrike && <th className="py-3 px-4 text-center">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {strikes.map((s, idx) => {
                    const isCall = s.type === 'CE';
                    const isToday = s.days_ago === 0;
                    return (
                      <tr
                        key={s.key || idx}
                        className={`transition hover:bg-slate-800/30 ${
                          isDark
                            ? idx % 2 === 0 ? 'bg-slate-950/40' : 'bg-slate-900/20'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                        }`}
                      >
                        {/* Expiry */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-200">{s.expiry}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {s.days_to_exp}d
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">{s.month_year}</div>
                        </td>

                        {/* Strike */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-sm font-bold tracking-tight text-white">
                            {s.strike.toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Type */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isCall
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}>
                            {s.type}
                          </span>
                        </td>

                        {/* Discovery Date */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {isToday && (
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            )}
                            <span className={`font-semibold ${
                              isToday ? 'text-emerald-400' : s.days_ago <= 3 ? 'text-sky-400' : 'text-slate-300'
                            }`}>
                              {isToday ? 'Today' : s.first_seen}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {isToday ? '0 days ago' : `${s.days_ago} days ago`}
                          </div>
                        </td>

                        {/* Moneyness */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.moneyness === 'OTM'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : s.moneyness === 'ATM'
                              ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}>
                            {s.moneyness}
                          </span>
                        </td>

                        {/* Distance from ATM */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                          <span className={s.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {s.diff > 0 ? `+${s.diff.toLocaleString()}` : s.diff.toLocaleString()} pts
                          </span>
                        </td>

                        {/* Distance from Spot (%) */}
                        <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                          <span className={s.diff_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {s.diff_pct > 0 ? `+${s.diff_pct}%` : `${s.diff_pct}%`}
                          </span>
                        </td>

                        {/* Trading Symbol */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-300">{s.symbol}</span>
                            <button
                              onClick={() => handleCopySymbol(s.symbol)}
                              className="text-slate-500 hover:text-slate-300 p-0.5 rounded transition"
                              title="Copy symbol to clipboard"
                            >
                              {copiedSymbol === s.symbol ? (
                                <Check className="h-3.5 w-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Lot Size */}
                        <td className="py-3 px-4 text-center whitespace-nowrap text-slate-400">
                          {s.lot_size}
                        </td>

                        {/* Chart Action */}
                        {onSelectStrike && (
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => onSelectStrike({
                                symbol: s.symbol,
                                token: s.token,
                                expiry: s.expiry,
                                strike: s.strike,
                                option_type: s.type,
                                timeframe: '1d',
                                pattern: 'New Strike',
                                direction: isCall ? 'BULLISH' : 'BEARISH',
                                date: s.first_seen,
                                ltp: 0
                              })}
                              className={`p-1.5 rounded-lg border transition ${
                                isDark
                                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                              }`}
                              title="Open strike chart / analytics"
                            >
                              <Activity className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer info */}
            <div className={`px-4 py-2.5 border-t flex items-center justify-between text-[11px] ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <span>
                Showing <strong>{strikes.length}</strong> new strikes across {expiries.length} far-month cycles (Current month excluded).
              </span>
              <span>
                Source: {summary?.backup_source === 'external_scanner' ? 'Live Daily Scanner Ledger' : 'Local Backup'} • Updated {summary?.last_scanned || 'today'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
