import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Filter, Sparkles, ChevronDown, Check, CheckSquare, Square, X } from 'lucide-react';

interface FiltersBarProps {
  timeframe: string;
  setTimeframe: (tf: string) => void;
  selectedExpiries: string[];
  setSelectedExpiries: React.Dispatch<React.SetStateAction<string[]>>;
  expiries: string[];
  optionType: string;
  setOptionType: (type: string) => void;
  proximityOnly: boolean;
  setProximityOnly: (val: boolean) => void;
  totalMatches: number;
  theme: 'dark' | 'light';
}

export const FiltersBar: React.FC<FiltersBarProps> = ({
  timeframe,
  setTimeframe,
  selectedExpiries,
  setSelectedExpiries,
  expiries,
  optionType,
  setOptionType,
  proximityOnly,
  setProximityOnly,
  totalMatches,
  theme
}) => {
  const isDark = theme === 'dark';
  const [isExpiryDropdownOpen, setIsExpiryDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpiryDropdownOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatExpiry = (exp: string) => {
    const d = new Date(exp + 'T00:00:00');
    if (isNaN(d.getTime())) return exp;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatExpiryShort = (exp: string) => {
    const d = new Date(exp + 'T00:00:00');
    if (isNaN(d.getTime())) return exp;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  const isAllSelected = expiries.length > 0 && selectedExpiries.length === expiries.length;
  const isNoneSelected = selectedExpiries.length === 0;

  const toggleExpiry = (exp: string) => {
    if (selectedExpiries.includes(exp)) {
      setSelectedExpiries(selectedExpiries.filter(e => e !== exp));
    } else {
      setSelectedExpiries([...selectedExpiries, exp]);
    }
  };

  const handleSelectAll = () => {
    setSelectedExpiries([...expiries]);
  };

  const handleClearAll = () => {
    setSelectedExpiries([]);
  };

  const handleSelectOnly = (exp: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedExpiries([exp]);
  };

  const getSummaryLabel = () => {
    if (expiries.length === 0) return 'Loading Expiries...';
    if (isAllSelected) return `All Expiries (${expiries.length})`;
    if (isNoneSelected) return 'No Expiry Selected';
    if (selectedExpiries.length === 1) return formatExpiry(selectedExpiries[0]);
    if (selectedExpiries.length === 2) return selectedExpiries.map(formatExpiryShort).join(', ');
    return `${selectedExpiries.length} Expiries Selected`;
  };

  return (
    <div className={`px-6 py-3 flex flex-wrap items-center justify-between gap-4 border-b transition-colors relative z-20 ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
    }`}>
      {/* Timeframe Buttons */}
      <div className={`flex items-center gap-1 p-1 rounded-xl border transition-colors ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        {[
          { id: '75m', label: '75-Minute (Live)' },
          { id: '1d', label: 'Daily (1D)' },
          { id: 'weekly', label: 'Weekly' },
          { id: 'monthly', label: 'Monthly' },
        ].map(tf => (
          <button
            key={tf.id}
            onClick={() => setTimeframe(tf.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              timeframe === tf.id
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : isDark
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {tf.label}
          </button>
        ))}
      </div>

      {/* Expiry & Option Type Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Multi-Select Expiry Checkboxes Popover */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsExpiryDropdownOpen(!isExpiryDropdownOpen)}
            className={`flex items-center gap-2 text-xs border rounded-lg px-3 py-1.5 font-semibold transition ${
              isExpiryDropdownOpen
                ? isDark
                  ? 'border-emerald-500 bg-slate-900 text-emerald-400'
                  : 'border-emerald-600 bg-emerald-50 text-emerald-800'
                : isDark
                ? 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
            }`}
            title="Filter by one or more option expiration dates"
          >
            <Calendar className={`h-3.5 w-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
            <span className={`${isDark ? 'text-slate-400' : 'text-slate-500'} font-normal`}>Expiry:</span>
            <span className="font-semibold max-w-[200px] truncate">{getSummaryLabel()}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isExpiryDropdownOpen ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`} />
          </button>

          {/* Floating Dropdown Panel with Checkboxes */}
          {isExpiryDropdownOpen && (
            <div className={`absolute left-0 mt-2 w-72 rounded-xl border shadow-2xl z-50 p-2 text-xs transition-all ${
              isDark ? 'bg-slate-900 border-slate-700 shadow-slate-950/80 text-slate-100' : 'bg-white border-slate-200 shadow-slate-400/30 text-slate-900'
            }`}>
              {/* Header & Quick Action Buttons */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-slate-800/40 mb-1">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select Expiries
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                      isAllSelected
                        ? 'text-emerald-500 font-bold'
                        : isDark
                        ? 'text-slate-300 hover:text-emerald-400 hover:bg-slate-800'
                        : 'text-slate-600 hover:text-emerald-700 hover:bg-slate-100'
                    }`}
                  >
                    Select All
                  </button>
                  <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded transition ${
                      isDark
                        ? 'text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                        : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Master Checkbox: All Expiries */}
              <div
                onClick={() => {
                  if (isAllSelected) handleClearAll();
                  else handleSelectAll();
                }}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition mb-1 ${
                  isDark ? 'hover:bg-slate-800/70' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                    isAllSelected
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                      : !isNoneSelected
                      ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                      : isDark
                      ? 'border-slate-700 bg-slate-950'
                      : 'border-slate-300 bg-white'
                  }`}>
                    {isAllSelected ? (
                      <Check className="h-3 w-3 stroke-[3]" />
                    ) : !isNoneSelected ? (
                      <div className="w-2 h-0.5 bg-emerald-400 rounded" />
                    ) : null}
                  </div>
                  <span className="font-bold">All Expiries</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                }`}>
                  {expiries.length} dates
                </span>
              </div>

              <div className={`h-[1px] my-1 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />

              {/* Individual Expiry Checkboxes */}
              <div className="max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
                {expiries.map(exp => {
                  const isChecked = selectedExpiries.includes(exp);
                  return (
                    <div
                      key={exp}
                      onClick={() => toggleExpiry(exp)}
                      className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition ${
                        isChecked
                          ? isDark
                            ? 'bg-emerald-950/20 text-emerald-200'
                            : 'bg-emerald-50/70 text-emerald-900'
                          : isDark
                          ? 'hover:bg-slate-800/60 text-slate-300'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                            : isDark
                            ? 'border-slate-700 bg-slate-950 group-hover:border-slate-500'
                            : 'border-slate-300 bg-white group-hover:border-slate-400'
                        }`}>
                          {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                        <div>
                          <span className="font-semibold">{formatExpiry(exp)}</span>
                          <span className={`ml-1.5 text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                            (Monthly)
                          </span>
                        </div>
                      </div>

                      {/* Quick "Only" action button */}
                      <button
                        type="button"
                        onClick={(e) => handleSelectOnly(exp, e)}
                        className={`opacity-0 group-hover:opacity-100 text-[10px] font-semibold px-1.5 py-0.5 rounded transition ${
                          isDark
                            ? 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-400'
                            : 'bg-slate-200 hover:bg-emerald-600 hover:text-white text-slate-600'
                        }`}
                        title={`Select only ${formatExpiry(exp)}`}
                      >
                        Only
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Footer Indicator */}
              <div className={`mt-2 pt-1.5 border-t text-[10px] text-center flex items-center justify-between px-1 ${
                isDark ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'
              }`}>
                <span>{selectedExpiries.length} of {expiries.length} selected</span>
                <button
                  type="button"
                  onClick={() => setIsExpiryDropdownOpen(false)}
                  className={`font-semibold hover:underline ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Option Type Select */}
        <div className={`flex items-center gap-1.5 text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
        }`}>
          <Filter className={`h-3.5 w-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className={`${isDark ? 'text-slate-500' : 'text-slate-600'} font-medium`}>Type:</span>
          <select
            value={optionType}
            onChange={e => setOptionType(e.target.value)}
            className={`bg-transparent font-semibold focus:outline-none cursor-pointer ${
              isDark ? 'text-slate-200' : 'text-slate-800'
            }`}
          >
            <option value="all" className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
              All Instruments (CE, PE & VIX)
            </option>
            <option value="CE" className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
              Calls (CE) Only
            </option>
            <option value="PE" className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
              Puts (PE) Only
            </option>
            <option value="VIX" className={isDark ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}>
              India VIX (VIX) Only
            </option>
          </select>
        </div>

        {/* Dhurandar Proximity Toggle */}
        <button
          onClick={() => setProximityOnly(!proximityOnly)}
          className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
            proximityOnly
              ? isDark
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-md shadow-amber-500/10'
                : 'bg-amber-100 border-amber-400 text-amber-800 shadow-sm'
              : isDark
              ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Near L1 / Disc1 (≤3%)</span>
        </button>
      </div>

      {/* Match Count Badge */}
      <div className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-colors ${
        isDark ? 'text-slate-400 bg-slate-950 border-slate-800' : 'text-slate-600 bg-slate-100 border-slate-200'
      }`}>
        Showing <span className={isDark ? 'text-emerald-400 font-bold' : 'text-emerald-600 font-bold'}>{totalMatches}</span> candidate strikes
      </div>
    </div>
  );
};
