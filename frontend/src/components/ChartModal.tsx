import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, LineSeries, IChartApi, CandlestickData } from 'lightweight-charts';
import { X, Layers, Sun, Moon, Activity } from 'lucide-react';
import { OptionMatch, ChartDataResponse, ChartCandle } from '../types';
import { getChartData } from '../services/api';

interface ChartModalProps {
  strikeMatch: OptionMatch | null;
  onClose: () => void;
  theme: 'dark' | 'light';
}

interface HoveredCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

const formatCandleTime = (timestamp: number, tf: string) => {
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  if (isNaN(date.getTime())) return '';

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-IN', { month: 'short' });
  const year = date.getFullYear();

  if (tf === '75m') {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${minutes}`;
  }
  return `${day} ${month} ${year}`;
};

export const ChartModal: React.FC<ChartModalProps> = ({ strikeMatch, onClose, theme: initialTheme }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const [timeframe, setTimeframe] = useState<string>('75m');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [chartData, setChartData] = useState<ChartDataResponse | null>(null);
  const [chartTheme, setChartTheme] = useState<'dark' | 'light'>(initialTheme);

  // Crosshair hover candle data
  const [hoverCandle, setHoverCandle] = useState<HoveredCandle | null>(null);
  const hoverCandleRef = useRef<HoveredCandle | null>(null);

  // Overlay toggles
  const [showSMA, setShowSMA] = useState<boolean>(true);
  const [showBB, setShowBB] = useState<boolean>(true);
  const [showTenkan, setShowTenkan] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(true);

  // Sync theme changes from parent if updated
  useEffect(() => {
    setChartTheme(initialTheme);
  }, [initialTheme]);

  // Reset hover state when timeframe or chart data changes
  useEffect(() => {
    hoverCandleRef.current = null;
    setHoverCandle(null);
  }, [timeframe, chartData]);

  useEffect(() => {
    if (!strikeMatch) return;

    let isMounted = true;
    setIsLoading(true);

    getChartData(strikeMatch.token, timeframe)
      .then(data => {
        if (isMounted) {
          setChartData(data);
          setIsLoading(false);
        }
      })
      .catch(err => {
        console.error('Failed to load chart data:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [strikeMatch, timeframe]);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData || chartData.candles.length === 0) return;

    // Clean previous instances
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }
    if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
    }

    const isDark = chartTheme === 'dark';
    const bgColor = isDark ? '#090d16' : '#ffffff';
    const textColor = isDark ? '#94a3b8' : '#334155';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const mainHeight = showRSI ? 330 : 480;

    // 1. Create Main Candlestick Chart
    const mainChart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: mainHeight,
      layout: {
        background: { color: bgColor },
        textColor: textColor,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        visible: !showRSI, // Show time scale labels on bottom pane if RSI active
      },
    });
    chartRef.current = mainChart;

    // Candlestick Series
    const candleSeries = mainChart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const formattedCandles: CandlestickData[] = chartData.candles.map(c => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(formattedCandles);

    // Map for fast candle lookup by timestamp
    const candleMap = new Map<number, ChartCandle>();
    chartData.candles.forEach(c => candleMap.set(Number(c.time), c));

    // Crosshair move handler to capture hovered candle OHLC
    const crosshairHandler = (param: any) => {
      if (!param || !param.time || !param.point || param.point.x < 0 || param.point.y < 0) {
        if (hoverCandleRef.current !== null) {
          hoverCandleRef.current = null;
          setHoverCandle(null);
        }
        return;
      }

      let candle: any = null;
      if (param.seriesData && typeof param.seriesData.get === 'function') {
        candle = param.seriesData.get(candleSeries);
      }
      if (!candle || candle.open === undefined) {
        candle = candleMap.get(Number(param.time));
      }

      if (candle && candle.open !== undefined) {
        const cTime = Number(candle.time);
        if (hoverCandleRef.current?.time !== cTime) {
          const item: HoveredCandle = {
            time: cTime,
            open: Number(candle.open),
            high: Number(candle.high),
            low: Number(candle.low),
            close: Number(candle.close),
            volume: candle.volume ?? candleMap.get(cTime)?.volume,
          };
          hoverCandleRef.current = item;
          setHoverCandle(item);
        }
      }
    };

    mainChart.subscribeCrosshairMove(crosshairHandler);

    // Overlays: SMA 20 & SMA 50
    if (showSMA) {
      if (chartData.overlays.sma20) {
        const sma20 = mainChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2, title: 'SMA 20' });
        sma20.setData(chartData.overlays.sma20.map(d => ({ time: d.time as any, value: d.value })));
      }
      if (chartData.overlays.sma50) {
        const sma50 = mainChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2, title: 'SMA 50' });
        sma50.setData(chartData.overlays.sma50.map(d => ({ time: d.time as any, value: d.value })));
      }
    }

    // Overlays: Bollinger Bands
    if (showBB) {
      if (chartData.overlays.upper_bb) {
        const ubb = mainChart.addSeries(LineSeries, { color: 'rgba(168, 85, 247, 0.6)', lineWidth: 1, title: 'Upper BB' });
        ubb.setData(chartData.overlays.upper_bb.map(d => ({ time: d.time as any, value: d.value })));
      }
      if (chartData.overlays.lower_bb) {
        const lbb = mainChart.addSeries(LineSeries, { color: 'rgba(168, 85, 247, 0.6)', lineWidth: 1, title: 'Lower BB' });
        lbb.setData(chartData.overlays.lower_bb.map(d => ({ time: d.time as any, value: d.value })));
      }
    }

    // Overlays: Tenkan-sen
    if (showTenkan && chartData.overlays.tenkan) {
      const tenkan = mainChart.addSeries(LineSeries, { color: '#14b8a6', lineWidth: 2, title: 'Tenkan' });
      tenkan.setData(chartData.overlays.tenkan.map(d => ({ time: d.time as any, value: d.value })));
    }

    // Horizontal Support Levels
    if (strikeMatch?.l1) {
      candleSeries.createPriceLine({
        price: strikeMatch.l1,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: `L1: ₹${strikeMatch.l1}`,
      });
    }
    if (strikeMatch?.disc1) {
      candleSeries.createPriceLine({
        price: strikeMatch.disc1,
        color: '#14b8a6',
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `Disc1: ₹${strikeMatch.disc1}`,
      });
    }

    // 2. Create Synchronized RSI Sub-Pane
    let rsiChart: IChartApi | null = null;
    if (showRSI && rsiContainerRef.current && chartData.overlays.rsi) {
      rsiChart = createChart(rsiContainerRef.current, {
        width: rsiContainerRef.current.clientWidth,
        height: 140,
        layout: {
          background: { color: bgColor },
          textColor: textColor,
        },
        grid: {
          vertLines: { color: gridColor },
          horzLines: { color: gridColor },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });
      rsiChartRef.current = rsiChart;

      // Subscribe crosshair move on RSI chart as well
      rsiChart.subscribeCrosshairMove(crosshairHandler);

      // RSI 9 line (Cyan)
      const rsiSeries = rsiChart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 2,
        title: 'RSI(9)',
      });

      // Align RSI data across ALL candle timestamps (whitespace for warmup bars) to eliminate chart lag
      const rsiMap = new Map<number, number>();
      chartData.overlays.rsi?.forEach(r => rsiMap.set(r.time, r.value));
      const rsiData = chartData.candles.map(c => {
        if (rsiMap.has(c.time)) {
          return { time: c.time as any, value: rsiMap.get(c.time)! };
        }
        return { time: c.time as any };
      });
      rsiSeries.setData(rsiData);

      // 21-Period WMA of RSI (Amber)
      if (chartData.overlays.rsi_wma21) {
        const rsiWmaSeries = rsiChart.addSeries(LineSeries, {
          color: '#f59e0b',
          lineWidth: 1,
          title: 'WMA(21)',
        });
        const wmaMap = new Map<number, number>();
        chartData.overlays.rsi_wma21.forEach(w => wmaMap.set(w.time, w.value));
        const rsiWmaData = chartData.candles.map(c => {
          if (wmaMap.has(c.time)) {
            return { time: c.time as any, value: wmaMap.get(c.time)! };
          }
          return { time: c.time as any };
        });
        rsiWmaSeries.setData(rsiWmaData);
      }

      // Overbought 70 line
      rsiSeries.createPriceLine({
        price: 70,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '70 OB',
      });

      // Fine dotted Neutral 50 line (Subtle so as not to overpower other elements)
      rsiSeries.createPriceLine({
        price: 50,
        color: isDark ? 'rgba(148, 163, 184, 0.45)' : 'rgba(100, 116, 139, 0.4)',
        lineWidth: 1,
        lineStyle: 1, // Dotted
        axisLabelVisible: true,
        title: '50',
      });

      // Oversold 30 line
      rsiSeries.createPriceLine({
        price: 30,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: '30 OS',
      });

      // Synchronize time scales
      let isSyncing = false;
      mainChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (isSyncing || !range || !rsiChartRef.current) return;
        isSyncing = true;
        rsiChartRef.current.timeScale().setVisibleLogicalRange(range);
        isSyncing = false;
      });
      rsiChart.timeScale().subscribeVisibleLogicalRangeChange(range => {
        if (isSyncing || !range || !chartRef.current) return;
        isSyncing = true;
        chartRef.current.timeScale().setVisibleLogicalRange(range);
        isSyncing = false;
      });

      rsiChart.timeScale().fitContent();
    }

    mainChart.timeScale().fitContent();

    const handleResize = () => {
      const w = chartContainerRef.current?.clientWidth || 800;
      if (chartRef.current) {
        chartRef.current.applyOptions({ width: w });
      }
      if (rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: w });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mainChart.unsubscribeCrosshairMove(crosshairHandler);
      if (rsiChart) {
        rsiChart.unsubscribeCrosshairMove(crosshairHandler);
      }
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
      if (rsiChartRef.current) {
        rsiChartRef.current.remove();
        rsiChartRef.current = null;
      }
    };
  }, [chartData, showSMA, showBB, showTenkan, showRSI, chartTheme, strikeMatch]);

  if (!strikeMatch) return null;

  const isDark = chartTheme === 'dark';

  // Compute OHLC to display: crosshair candle if hovered, otherwise latest candle
  const latestCandle = chartData?.candles && chartData.candles.length > 0
    ? chartData.candles[chartData.candles.length - 1]
    : null;
  const displayCandle = hoverCandle || latestCandle;
  const currencyPrefix = strikeMatch.option_type === 'VIX' ? '' : '₹';

  const candleDiff = displayCandle ? displayCandle.close - displayCandle.open : 0;
  const candleDiffPct = displayCandle && displayCandle.open > 0 ? (candleDiff / displayCandle.open) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`border rounded-2xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Header */}
        <div className={`px-6 py-3.5 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-50/90'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg border flex items-center justify-center font-bold text-xs ${
              strikeMatch.option_type === 'VIX'
                ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                : strikeMatch.option_type === 'CE'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {strikeMatch.option_type}
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>{strikeMatch.symbol}</span>
                <span className={`text-xs px-2 py-0.5 rounded font-normal ${
                  isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {strikeMatch.strike > 0 ? `Strike: ${strikeMatch.strike} • ` : ''}Expiry: {strikeMatch.expiry}
                </span>
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                LTP: <strong className="text-emerald-500">₹{strikeMatch.ltp}</strong> | Pattern:{' '}
                <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{strikeMatch.pattern}</strong> ({strikeMatch.direction})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Chart Theme Toggle (Black / White) */}
            <button
              onClick={() => setChartTheme(isDark ? 'light' : 'dark')}
              className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm'
              }`}
              title="Toggle Chart Background (Black / White)"
            >
              {isDark ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
              <span>{isDark ? 'White' : 'Black'}</span>
            </button>

            {/* Timeframe Switcher */}
            <div className={`flex items-center gap-1 p-1 rounded-lg border text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}>
              {['75m', '1d', 'weekly'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1 rounded font-semibold transition ${
                    timeframe === tf
                      ? 'bg-emerald-500 text-slate-950'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tf.toUpperCase()}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-lg transition ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Indicators Overlay Bar */}
        <div className={`px-6 py-2 border-b flex flex-wrap items-center justify-between text-xs gap-3 ${
          isDark ? 'bg-slate-950/80 border-slate-800/80 text-slate-400' : 'bg-slate-100/70 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-4 flex-wrap">
            <span className={`flex items-center gap-1 text-[11px] font-semibold uppercase ${
              isDark ? 'text-slate-500' : 'text-slate-600'
            }`}>
              <Layers className="h-3 w-3" /> Indicators:
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showSMA} onChange={e => setShowSMA(e.target.checked)} className="rounded" />
              <span className="text-amber-500 font-medium">SMA 20/50</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showBB} onChange={e => setShowBB(e.target.checked)} className="rounded" />
              <span className="text-purple-500 font-medium">Bollinger Bands</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showTenkan} onChange={e => setShowTenkan(e.target.checked)} className="rounded" />
              <span className="text-teal-500 font-medium">Tenkan-sen</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={showRSI} onChange={e => setShowRSI(e.target.checked)} className="rounded" />
              <span className="text-cyan-500 font-bold flex items-center gap-0.5">
                <Activity className="h-3 w-3" /> RSI(9) + 21 WMA
              </span>
            </label>
          </div>

          {strikeMatch.l1 ? (
            <div className="flex items-center gap-3 text-xs">
              <span className="text-emerald-500 font-semibold font-mono">L1: ₹{strikeMatch.l1}</span>
              <span className="text-teal-400 font-semibold font-mono">Disc1: ₹{strikeMatch.disc1}</span>
            </div>
          ) : null}
        </div>

        {/* Chart Canvas Area */}
        <div 
          className={`p-4 relative min-h-[480px] ${
            isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'
          }`}
          onMouseLeave={() => {
            if (hoverCandleRef.current !== null) {
              hoverCandleRef.current = null;
              setHoverCandle(null);
            }
          }}
        >
          {isLoading && (
            <div className={`absolute inset-0 flex items-center justify-center z-10 ${
              isDark ? 'bg-slate-950/80' : 'bg-white/80'
            }`}>
              <div className="text-xs text-emerald-500 font-semibold animate-pulse">
                Loading candlesticks for {strikeMatch.symbol}...
              </div>
            </div>
          )}

          {/* Interactive Crosshair OHLC Display on Chart */}
          {displayCandle && (
            <div className={`absolute top-6 left-6 z-20 pointer-events-none px-3.5 py-1.5 rounded-xl border backdrop-blur-md shadow-lg text-xs font-mono flex flex-wrap items-center gap-x-4 gap-y-1.5 transition-all duration-150 ${
              isDark
                ? 'bg-slate-900/85 border-slate-700/60 text-slate-200'
                : 'bg-white/95 border-slate-200 text-slate-800 shadow-md'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-sans font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  hoverCandle
                    ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                    : (isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200')
                }`}>
                  {hoverCandle ? '● Crosshair' : 'Latest'}
                </span>
                <span className={`font-sans text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatCandleTime(displayCandle.time, timeframe)}
                </span>
              </div>

              <div className="flex items-center gap-3 font-semibold">
                <span className="flex items-center gap-1">
                  <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>O:</span>
                  <span className={isDark ? 'text-white' : 'text-slate-900'}>{currencyPrefix}{displayCandle.open.toFixed(2)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>H:</span>
                  <span className="text-emerald-500">{currencyPrefix}{displayCandle.high.toFixed(2)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>L:</span>
                  <span className="text-rose-500">{currencyPrefix}{displayCandle.low.toFixed(2)}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-500 font-normal'}>C:</span>
                  <span className={candleDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}>{currencyPrefix}{displayCandle.close.toFixed(2)}</span>
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <span className={`font-bold ${candleDiff >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {candleDiff >= 0 ? '+' : ''}{candleDiff.toFixed(2)} ({candleDiffPct >= 0 ? '+' : ''}{candleDiffPct.toFixed(2)}%)
                </span>
                {displayCandle.volume ? (
                  <span className={`text-[11px] hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Vol: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{displayCandle.volume.toLocaleString('en-IN')}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          )}
          
          {/* Main Price Chart */}
          <div ref={chartContainerRef} className="w-full" />

          {/* Dedicated RSI Sub-Pane */}
          {showRSI && (
            <div className="mt-2 pt-2 border-t border-slate-800/40">
              <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 mb-1 px-1">
                <span>RSI(9) Sub-Pane (Overbought: 70 • Oversold: 30)</span>
                <span className="text-amber-400">Amber Line: 21-Period WMA of RSI</span>
              </div>
              <div ref={rsiContainerRef} className="w-full h-[140px]" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
