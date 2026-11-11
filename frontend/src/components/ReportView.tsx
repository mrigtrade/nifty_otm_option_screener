import React, { useEffect, useState } from 'react';
import {
  Compass,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Radio,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Zap,
  Target
} from 'lucide-react';
import { IntelligenceReport, OptionMatch } from '../types';
import { getIntelligenceReport } from '../services/api';

interface ReportViewProps {
  theme: 'dark' | 'light';
  onSelectStrike: (match: OptionMatch) => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ theme, onSelectStrike }) => {
  const isDark = theme === 'dark';
  const [window, setWindow] = useState<string>('today');
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadReport = (horizon: string) => {
    setIsLoading(true);
    getIntelligenceReport(horizon)
      .then(data => {
        setReport(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching intelligence report:', err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadReport(window);
  }, [window]);

  const handleOpenChart = (item: {
    symbol: string;
    token?: string;
    strike: number;
    expiry: string;
    option_type: string;
    timeframe?: string;
    pattern?: string;
    ltp: number;
  }) => {
    onSelectStrike({
      symbol: item.symbol,
      token: item.token || item.symbol,
      strike: item.strike,
      expiry: item.expiry,
      option_type: item.option_type,
      timeframe: (item.timeframe as any) || '75m',
      pattern: item.pattern || 'Reversal Confluence',
      direction: item.option_type === 'PE' ? 'BULLISH' : 'BEARISH',
      date: new Date().toISOString(),
      ltp: item.ltp
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Bar with Horizon Switcher */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h1 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Market Intelligence & Trade Radar</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Institutional Theta Briefing
                </span>
              </h1>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Synthesized analysis of live pattern radar and historical reversal signals across key market regimes
              </p>
            </div>
          </div>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-2">
          <div className={`p-1 rounded-xl border flex items-center gap-1 transition-colors ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            {[
              { id: 'today', label: "Today's Session" },
              { id: 'yesterday', label: 'Day Before (Yesterday)' },
              { id: 'week', label: 'Past 1 Week' },
              { id: 'all', label: 'All-Time Records' },
            ].map(tab => {
              const isActive = window === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setWindow(tab.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    isActive
                      ? isDark
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-emerald-600 text-white shadow-sm'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => loadReport(window)}
            className={`p-2 rounded-xl border transition ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title="Refresh Report"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && !report ? (
        <div className="p-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-emerald-500 mx-auto mb-3" />
          <p className="text-sm font-semibold">Synthesizing institutional intelligence report...</p>
        </div>
      ) : report ? (
        <>
          {/* Executive Overview: 3 Pillar Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Pillar 1: Market Tone & Sentiment Gauge */}
            <div className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-emerald-400" />
                    Market Reversal Tone
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    report.sentiment.bias.includes('Bullish')
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : report.sentiment.bias.includes('Defensive')
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}>
                    {report.sentiment.bias}
                  </span>
                </div>

                {/* Sentiment Ratio Bar */}
                <div className="space-y-1.5 my-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-emerald-500 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> {report.sentiment.pe_count} Put Reversals (Floors)
                    </span>
                    <span className="text-rose-400 flex items-center gap-1">
                      {report.sentiment.ce_count} Call Reversals (Ceilings) <TrendingDown className="h-3 w-3" />
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden flex">
                    <div
                      style={{
                        width: `${
                          report.total_triggers > 0
                            ? (report.sentiment.pe_count / (report.sentiment.pe_count + report.sentiment.ce_count || 1)) * 100
                            : 50
                        }%`
                      }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
                    />
                    <div
                      style={{
                        width: `${
                          report.total_triggers > 0
                            ? (report.sentiment.ce_count / (report.sentiment.pe_count + report.sentiment.ce_count || 1)) * 100
                            : 50
                        }%`
                      }}
                      className="h-full bg-gradient-to-r from-rose-500 to-amber-500 transition-all duration-500"
                    />
                  </div>
                </div>

                <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {report.sentiment.tone}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>Total Triggers: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{report.total_triggers}</strong></span>
                <span>Session Date: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{report.selected_date}</strong></span>
              </div>
            </div>

            {/* Pillar 2: India VIX Volatility Radar */}
            <div className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    India VIX Volatility Regime
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    report.volatility.badge_color === 'emerald'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : report.volatility.badge_color === 'blue'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {report.volatility.regime}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {report.volatility.vix_price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400">India VIX Index Spot</span>
                </div>

                <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {report.volatility.guidance}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" /> Theta Strategy Active
                </span>
                <button
                  onClick={() =>
                    handleOpenChart({
                      symbol: 'India VIX',
                      token: '99926017',
                      strike: 0,
                      expiry: 'INDEX',
                      option_type: 'VIX',
                      timeframe: '75m',
                      pattern: 'Volatility Regime',
                      ltp: report.volatility.vix_price
                    })
                  }
                  className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
                >
                  <span>Open VIX Chart</span>
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Pillar 3: Nifty Spot & Key Metrics */}
            <div className={`p-5 rounded-2xl border transition-colors flex flex-col justify-between ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-blue-400" />
                    Nifty 50 Underlying Anchor
                  </span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    ATM: {roundAtm(report.spot_price)}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 my-2">
                  <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {report.spot_price > 0 ? report.spot_price.toFixed(1) : '25,350.0'}
                  </span>
                  <span className="text-xs text-slate-400">Nifty 50 Spot Level</span>
                </div>

                {/* Pattern Breakdown Badges */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Dhurandar Support</span>
                    <strong className="text-emerald-400 text-sm">{report.metrics.by_pattern['Dhurandar'] || 0}</strong>
                  </div>
                  <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Bollinger Reversals</span>
                    <strong className="text-blue-400 text-sm">{report.metrics.by_pattern['Bollinger Band Reversal'] || 0}</strong>
                  </div>
                  <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">RSI-Ichimoku</span>
                    <strong className="text-purple-400 text-sm">{report.metrics.by_pattern['RSI-Ichimoku Reversal'] || 0}</strong>
                  </div>
                  <div className={`p-2 rounded-lg border ${isDark ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <span className="text-[10px] text-slate-400 block">Tenkan Crossover</span>
                    <strong className="text-amber-400 text-sm">{report.metrics.by_pattern['Tenkan Crossover'] || 0}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>75m Signals: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{report.metrics.by_timeframe['75m'] || 0}</strong></span>
                <span>1D Signals: <strong className={isDark ? 'text-white' : 'text-slate-900'}>{report.metrics.by_timeframe['1d'] || 0}</strong></span>
              </div>
            </div>
          </div>

          {/* Section: High-Conviction Confluence Radar (Key Reversals) */}
          <div className={`p-5 rounded-2xl border transition-colors ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Key Reversals & High-Conviction Confluence Radar</span>
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Strikes triggering multiple patterns or appearing across multiple timeframes (75m + 1D confluence)
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {report.confluences.length} High-Conviction Setups
              </span>
            </div>

            {report.confluences.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No multi-timeframe confluences detected in the selected time window.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {report.confluences.map((c, i) => (
                  <div
                    key={i}
                    onClick={() => handleOpenChart({ ...c, ltp: c.latest_ltp })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      isDark
                        ? 'bg-slate-800/50 border-slate-700/80 hover:border-emerald-500/60 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            c.option_type === 'CE' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {c.option_type}
                          </span>
                          <span className="text-xs font-bold">{c.strike}</span>
                          <span className="text-[11px] text-slate-400">({formatExpiryDate(c.expiry)})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 font-mono">{c.symbol}</p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400">₹{c.latest_ltp.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Trig: ₹{c.trigger_level.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Timeframes & Patterns */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {c.timeframes.map((tf, idx) => (
                        <span key={idx} className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                          {tf}
                        </span>
                      ))}
                      {c.patterns.map((p, idx) => (
                        <span key={idx} className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/20">
                          {p.replace('Reversal', '').replace('Radar', '').trim()}
                        </span>
                      ))}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px]">
                      <span className="text-amber-400 font-semibold">{c.signal_count} Concurrent Signals</span>
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        Open Chart <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Proximity Alert Radar */}
          {report.proximity_watchlist.length > 0 && (
            <div className={`p-5 rounded-2xl border transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <AlertTriangle className="h-4 w-4 text-emerald-400" />
                    <span>Immediate Action Watchlist (Proximity Alert: ≤ 3% to Waterline)</span>
                  </h2>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Strikes currently trading right in the sweet spot near support (L1) or discount (Disc1) waterlines
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {report.proximity_watchlist.length} Prime Strike Setups
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {report.proximity_watchlist.map((p, i) => (
                  <div
                    key={i}
                    onClick={() => handleOpenChart(p)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                      isDark
                        ? 'bg-slate-800/40 border-slate-700 hover:border-emerald-500'
                        : 'bg-slate-50 border-slate-200 hover:border-emerald-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        p.option_type === 'CE' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {p.option_type} {p.strike}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {p.proximity}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-xs font-black text-white">₹{p.ltp.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400">{formatExpiryDate(p.expiry)}</span>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400 flex justify-between font-mono">
                      <span>L1: ₹{p.l1?.toFixed(2) || '-'}</span>
                      <span>Disc1: ₹{p.disc1?.toFixed(2) || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section: Actionable Trade Watchlists (Put Selling & Call Selling) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* OTM Put Selling Watchlist */}
            <div className={`p-5 rounded-2xl border transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span>High-Probability Put Selling Watchlist (Bullish Floor)</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    OTM Puts bouncing off multi-candle support bases (L1) or oversold levels
                  </p>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {report.trade_ideas.put_selling.length} Ideas
                </span>
              </div>

              <div className="space-y-2.5">
                {report.trade_ideas.put_selling.map((idea, i) => (
                  <div
                    key={i}
                    onClick={() => handleOpenChart(idea)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition hover:border-emerald-500 ${
                      isDark ? 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/60' : 'bg-slate-50 border-slate-200 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-400">PE {idea.strike}</span>
                        <span className="text-[11px] text-slate-400">{formatExpiryDate(idea.expiry)}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                          {idea.timeframe}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{idea.pattern}</span>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-xs font-black block">₹{idea.ltp.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Floor: ₹{idea.trigger_level.toFixed(2)}</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* OTM Call Selling Watchlist */}
            <div className={`p-5 rounded-2xl border transition-colors ${
              isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <TrendingDown className="h-4 w-4 text-rose-400" />
                    <span>High-Probability Call Selling Watchlist (Bearish Ceiling)</span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    OTM Calls reaching upper resistance bands or fading momentum
                  </p>
                </div>
                <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded">
                  {report.trade_ideas.call_selling.length} Ideas
                </span>
              </div>

              <div className="space-y-2.5">
                {report.trade_ideas.call_selling.map((idea, i) => (
                  <div
                    key={i}
                    onClick={() => handleOpenChart(idea)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition hover:border-rose-500 ${
                      isDark ? 'bg-slate-800/30 border-slate-800 hover:bg-slate-800/60' : 'bg-slate-50 border-slate-200 hover:bg-rose-50/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-rose-400">CE {idea.strike}</span>
                        <span className="text-[11px] text-slate-400">{formatExpiryDate(idea.expiry)}</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-300">
                          {idea.timeframe}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{idea.pattern}</span>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-xs font-black block">₹{idea.ltp.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Cap: ₹{idea.trigger_level.toFixed(2)}</span>
                      </div>
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500 hover:text-rose-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

function roundAtm(spot: number): number {
  if (spot <= 0) return 25350;
  return Math.round(spot / 50.0) * 50;
}

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
