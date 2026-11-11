import React, { useState, useMemo } from 'react';
import { BarChart2, ArrowUpRight, ArrowDownRight, Sparkles, ArrowDown, ArrowUp, ArrowUpDown, Clock } from 'lucide-react';
import { OptionMatch } from '../types';

interface ScreenerTableProps {
  matches: OptionMatch[];
  onSelectStrike: (match: OptionMatch) => void;
  theme: 'dark' | 'light';
}

export const ScreenerTable: React.FC<ScreenerTableProps> = ({ matches, onSelectStrike, theme }) => {
  const isDark = theme === 'dark';

  // Default pattern detected presentation is in the order of recent date to oldest date
  const [sortField, setSortField] = useState<'date' | 'strike' | 'expiry' | 'ltp'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'date' | 'strike' | 'expiry' | 'ltp') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('desc'); // Default to descending when changing sort
    }
  };

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        cmp = timeA - timeB;
      } else if (sortField === 'strike') {
        cmp = (a.strike || 0) - (b.strike || 0);
      } else if (sortField === 'expiry') {
        cmp = (a.expiry || '').localeCompare(b.expiry || '');
      } else if (sortField === 'ltp') {
        cmp = (a.ltp || 0) - (b.ltp || 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [matches, sortField, sortOrder]);

  if (matches.length === 0) {
    return (
      <div className="p-16 text-center">
        <div className={`h-12 w-12 rounded-full border flex items-center justify-center mx-auto mb-3 transition-colors ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-100 border-slate-200 text-slate-400'
        }`}>
          <BarChart2 className="h-6 w-6" />
        </div>
        <h3 className={`text-base font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
          No Option Patterns Found
        </h3>
        <p className={`text-xs max-w-sm mx-auto ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
          No OTM option contracts currently match the chosen timeframe or filter rules. Try selecting a different expiry or clicking Scan Now.
        </p>
      </div>
    );
  }

  const renderSortIndicator = (field: 'date' | 'strike' | 'expiry' | 'ltp') => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-30 group-hover:opacity-70 transition-opacity ml-1 inline" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3 w-3 text-emerald-400 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3 w-3 text-emerald-400 ml-1 inline" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className={`border-b uppercase tracking-wider text-[10px] font-semibold transition-colors ${
            isDark ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
          }`}>
            <th
              onClick={() => handleSort('strike')}
              className="py-3 px-4 cursor-pointer hover:text-white transition select-none group"
              title="Click to sort by Strike"
            >
              <div className="flex items-center gap-1">
                <span>Strike & Symbol</span>
                {renderSortIndicator('strike')}
              </div>
            </th>
            <th
              onClick={() => handleSort('expiry')}
              className="py-3 px-3 cursor-pointer hover:text-white transition select-none group"
              title="Click to sort by Expiry Date"
            >
              <div className="flex items-center gap-1">
                <span>Expiry</span>
                {renderSortIndicator('expiry')}
              </div>
            </th>
            <th className="py-3 px-3">Type</th>
            <th
              onClick={() => handleSort('date')}
              className="py-3 px-4 cursor-pointer hover:text-white transition select-none group"
              title="Click to sort by Pattern Detection Trigger Date (Default: Recent to Oldest)"
            >
              <div className="flex items-center gap-1.5">
                <span>Pattern Detected</span>
                <span className={`text-[9px] lowercase font-normal px-1.5 py-0.2 rounded border ${
                  sortField === 'date'
                    ? isDark
                      ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                      : 'border-emerald-600/30 text-emerald-700 bg-emerald-50'
                    : 'border-transparent text-slate-500'
                }`}>
                  {sortField === 'date' ? (sortOrder === 'desc' ? 'recent date' : 'oldest date') : 'sortable'}
                </span>
                {renderSortIndicator('date')}
              </div>
            </th>
            <th className="py-3 px-3">Direction</th>
            <th
              onClick={() => handleSort('ltp')}
              className="py-3 px-3 text-right cursor-pointer hover:text-white transition select-none group"
              title="Click to sort by LTP"
            >
              <div className="flex items-center justify-end gap-1">
                <span>LTP (₹)</span>
                {renderSortIndicator('ltp')}
              </div>
            </th>
            <th className="py-3 px-4">Key Levels / Support</th>
            <th className="py-3 px-3 text-center">Proximity Alert</th>
            <th className="py-3 px-3 text-center">Chart</th>
          </tr>
        </thead>
        <tbody className={`divide-y transition-colors ${isDark ? 'divide-slate-800/60' : 'divide-slate-200'}`}>
          {sortedMatches.map((m, idx) => {
            const isCall = m.option_type === 'CE';
            const isBullish = m.direction === 'BULLISH';
            const isNear = m.proximity === 'Near L1' || m.proximity === 'Near Disc1';

            return (
              <tr
                key={`${m.symbol}-${m.pattern}-${idx}`}
                className={`transition group cursor-pointer ${
                  isDark ? 'hover:bg-slate-900/40' : 'hover:bg-slate-50'
                }`}
                onClick={() => onSelectStrike(m)}
              >
                {/* Strike & Symbol */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {m.strike > 0 ? m.strike : 'VIX'}
                    </span>
                    <span className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{m.symbol}</span>
                  </div>
                </td>

                {/* Expiry */}
                <td className={`py-3 px-3 font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {m.expiry}
                </td>

                {/* Option Type Badge */}
                <td className="py-3 px-3">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      m.option_type === 'VIX'
                        ? isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-purple-100 text-purple-700 border border-purple-300'
                        : isCall
                        ? isDark ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : isDark ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-rose-100 text-rose-700 border border-rose-300'
                    }`}
                  >
                    {m.option_type}
                  </span>
                </td>


                {/* Pattern Name */}
                <td className="py-3 px-4">
                  <span className={`font-semibold block ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{m.pattern}</span>
                  <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    {m.timeframe.toUpperCase()} • Triggered: {m.c3_date || m.trigger_date || m.date?.slice(0, 16)}
                  </span>
                </td>

                {/* Direction */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-1 font-semibold">
                    {isBullish ? (
                      <>
                        <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Bullish</span>
                      </>
                    ) : (
                      <>
                        <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
                        <span className="text-rose-500">Bearish</span>
                      </>
                    )}
                  </div>
                </td>

                {/* LTP */}
                <td className={`py-3 px-3 text-right font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                  ₹{m.ltp?.toFixed(2)}
                </td>

                {/* Key Levels */}
                <td className="py-3 px-4">
                  {m.pattern === 'Dhurandar' ? (
                    <div className="space-y-0.5 text-[11px]">
                      <div>
                        <span className={`${isDark ? 'text-slate-500' : 'text-slate-600'} font-medium`}>L1: </span>
                        <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-semibold font-mono`}>₹{m.l1}</span>
                        <span className={`${isDark ? 'text-slate-500' : 'text-slate-600'} ml-2 font-medium`}>Disc1: </span>
                        <span className={`${isDark ? 'text-teal-300' : 'text-teal-700'} font-semibold font-mono`}>₹{m.disc1}</span>
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Dist L1: <span className={m.dist_l1_pct && m.dist_l1_pct <= 5 ? (isDark ? 'text-amber-300 font-semibold' : 'text-amber-700 font-semibold') : ''}>{m.dist_l1_pct}%</span>
                      </div>
                    </div>
                  ) : m.pattern === 'Bollinger Band Reversal' ? (
                    <div className="text-[11px]">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-600'}>Disc Entry: </span>
                      <span className={`${isDark ? 'text-amber-300' : 'text-amber-700'} font-mono font-semibold`}>₹{m.disc_level}</span>
                    </div>
                  ) : m.pattern === 'RSI-Ichimoku Reversal' ? (
                    <div className="text-[11px]">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-600'}>RSI(9): </span>
                      <span className={`${isDark ? 'text-sky-300' : 'text-sky-700'} font-mono`}>{m.rsi}</span>
                      <span className={`${isDark ? 'text-slate-500' : 'text-slate-600'} ml-2`}>Tenkan: </span>
                      <span className={`${isDark ? 'text-amber-300' : 'text-amber-700'} font-mono`}>₹{m.tenkan}</span>
                    </div>
                  ) : (
                    <div className="text-[11px]">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-600'}>Tenkan: </span>
                      <span className={`${isDark ? 'text-amber-300' : 'text-amber-700'} font-mono font-semibold`}>₹{m.tenkan}</span>
                    </div>
                  )}
                </td>

                {/* Proximity Alert Badge */}
                <td className="py-3 px-3 text-center">
                  {isNear ? (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse shadow-sm ${
                      isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/10' : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}>
                      <Sparkles className="h-3 w-3" />
                      {m.proximity}
                    </span>
                  ) : (
                    <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {m.pattern_type || '--'}
                    </span>
                  )}
                </td>

                {/* Chart Button */}
                <td className="py-3 px-3 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectStrike(m);
                    }}
                    className={`p-1.5 rounded-lg transition ${
                      isDark
                        ? 'bg-slate-800 hover:bg-emerald-600 hover:text-slate-950 text-slate-400'
                        : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-600 border border-slate-200'
                    }`}
                    title="Open Candlestick Chart"
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
