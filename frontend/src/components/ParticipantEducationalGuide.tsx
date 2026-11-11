import React, { useState } from 'react';
import {
  BookOpen,
  HelpCircle,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle2,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  DollarSign
} from 'lucide-react';

interface ParticipantEducationalGuideProps {
  theme: 'dark' | 'light';
  defaultExpandedSection?: string | null;
}

export const ParticipantEducationalGuide: React.FC<ParticipantEducationalGuideProps> = ({
  theme,
  defaultExpandedSection = null
}) => {
  const isDark = theme === 'dark';
  const [openSection, setOpenSection] = useState<string | null>(defaultExpandedSection);

  const toggleSection = (id: string) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <div className={`rounded-2xl border transition-all ${
      isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
    }`}>
      {/* Guide Header */}
      <div className="p-5 border-b border-slate-800/60">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold tracking-tight">Institutional Participant Telemetry Field Guide</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Beginner to Pro Manual
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              How to decode the daily 7:00 PM NSE Derivatives report (FII, PRO, Client, DII) into concrete, non-negotiable option selling directives until it becomes second nature.
            </p>
          </div>
        </div>

        {/* Core Mental Model Card */}
        <div className={`mt-4 p-3.5 rounded-xl border flex items-start gap-3 ${
          isDark ? 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'
        }`}>
          <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold">The Core Option Seller Axiom:</div>
            <div className="opacity-90 leading-relaxed">
              Standard strike Open Interest shows <em>where</em> contracts are placed, but it hides <em>who is trapped</em>. Option buyers operate on emotion; institutional option sellers operate on inventory hedging. The daily 7:00 PM NSE report exposes who holds the risk, revealing whether an overnight gap will fizzle out or explode into an uncontrollable short-squeeze.
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* ============================================================= */}
        {/* 1. MASTER QUICK-REFERENCE DECISION MATRIX                     */}
        {/* ============================================================= */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                1. Master Quick-Reference Matrix (The Cheat Sheet)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">Scan this table every evening at 19:00 IST</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className={isDark ? 'bg-slate-950/60 text-slate-400 border-b border-slate-800' : 'bg-slate-100 text-slate-600 border-b border-slate-200'}>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Participant Metric</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">What It Measures</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Behavioral Trap / Mechanism</th>
                  <th className="py-2.5 px-3 font-semibold uppercase tracking-wider">Concrete Option Seller Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {/* Row 1: FII L/S <= 25% */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-rose-400 whitespace-nowrap">
                    FII Futures L/S &le; 25%
                    <div className="text-[10px] text-rose-400/80 font-normal">(-100k+ Short Futures)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-rose-300">Extreme Short Saturation</span>
                    <div className="text-[11px] text-slate-400">Institutional funds holding heavy short leverage</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Short-Squeeze Fuel:</strong> Minor gap-up triggers algorithmic stop-losses. FIIs forced to buy futures at market, blasting through resistance.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block mb-1">
                      VETO NAKED CALLS
                    </span>
                    <div className="text-[11px] text-slate-400">Never sell naked Calls into an FII short trap. Shift calls to &ge; +14.5% OTM or sell Puts only.</div>
                  </td>
                </tr>

                {/* Row 2: FII L/S >= 75% */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                    FII Futures L/S &ge; 75%
                    <div className="text-[10px] text-amber-400/80 font-normal">(Extreme Long Inventory)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-amber-300">Exhaustion Top</span>
                    <div className="text-[11px] text-slate-400">FII long capacity exhausted; no marginal buyers left</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Long Liquidation Cascade:</strong> FIIs book profits or hedge equity; selling cascades trigger sharp, sudden drops.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block mb-1">
                      VETO NAKED PUTS
                    </span>
                    <div className="text-[11px] text-slate-400">Naked Puts are highly vulnerable. Call selling is safe; widen put wings to &ge; -14.5% OTM.</div>
                  </td>
                </tr>

                {/* Row 3: FII L/S 40% - 60% */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                    FII Futures L/S 40% – 60%
                    <div className="text-[10px] text-emerald-400/80 font-normal">(Balanced Symmetrical Book)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-emerald-300">Balanced Equilibrium</span>
                    <div className="text-[11px] text-slate-400">No institutional inventory overhang or squeeze bias</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Mean Reverting Pin:</strong> Market oscillates between dominant Call and Put walls without runaway institutional momentum.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-block mb-1">
                      APPROVE FULL STRANGLES
                    </span>
                    <div className="text-[11px] text-slate-400">Deploy symmetrical 40–55 DTE month-end strangles (+10.5% CE / -10.0% PE) with 2x stops.</div>
                  </td>
                </tr>

                {/* Row 4: PRO Net Calls > 0 & Net Puts < 0 */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400 whitespace-nowrap">
                    PRO Net Calls &gt; 0<br/>&amp; Net Puts &lt; 0
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-cyan-300">Market Maker Floor Defense</span>
                    <div className="text-[11px] text-slate-400">PROs long calls &amp; short puts to retail</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Delta-Neutral Dip Buying:</strong> Market makers must buy underlying futures on declines to re-hedge delta, providing an invisible floor.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-block mb-1">
                      BULL PUT SPREADS SAFE
                    </span>
                    <div className="text-[11px] text-slate-400">Dips are absorbed; put strikes below PRO defended strikes enjoy institutional shielding.</div>
                  </td>
                </tr>

                {/* Row 5: PRO Net Calls < 0 & Net Puts > 0 */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-rose-400 whitespace-nowrap">
                    PRO Net Calls &lt; 0<br/>&amp; Net Puts &gt; 0
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-rose-300">Dealer Negative Gamma Flow</span>
                    <div className="text-[11px] text-slate-400">Market makers short calls &amp; long puts</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Volatility Accelerator:</strong> PROs forced to sell futures as spot drops and buy futures as spot rises. Amplifies market swings.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 inline-block mb-1">
                      WIDEN ALL WINGS
                    </span>
                    <div className="text-[11px] text-slate-400">Widen strikes to &ge; &plusmn;14.5% OTM or switch to defined-risk Credit Spreads. Avoid naked short strangles.</div>
                  </td>
                </tr>

                {/* Row 6: CLIENT Net Puts << 0 */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                    CLIENT Net Puts &lt;&lt; 0
                    <div className="text-[10px] text-amber-400/80 font-normal">(-300k+ Short Puts)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-amber-300">Retail Put Writing Trap</span>
                    <div className="text-[11px] text-slate-400">Retail writing huge naked put volume to capture small premium</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Forced Margin Liquidation:</strong> On sharp gap-downs, retail broker RMS systems auto-square off puts, triggering a massive market drop.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block mb-1">
                      DO NOT CATCH FALLING KNIVES
                    </span>
                    <div className="text-[11px] text-slate-400">When retail is heavily short puts, wait for the cascade to finish before selling OTM puts.</div>
                  </td>
                </tr>

                {/* Row 7: DII Net Puts > 0 */}
                <tr className={isDark ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50'}>
                  <td className="py-3 px-3 font-mono font-bold text-purple-400 whitespace-nowrap">
                    DII Net Puts &gt; 0
                    <div className="text-[10px] text-purple-400/80 font-normal">(Systematic Put Buying)</div>
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-semibold text-purple-300">Structural Equity Portfolio Insurance</span>
                    <div className="text-[11px] text-slate-400">Mutual funds hedging physical stock holdings</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <strong>Permanent Baseline Noise:</strong> Mutual funds buy puts continuously as mandate insurance. It is NOT a directional bearish bet.
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 inline-block mb-1">
                      FILTER OUT AS NOISE
                    </span>
                    <div className="text-[11px] text-slate-400">Do not panic when DII long puts increase. Focus exclusively on FII futures and PRO options.</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================= */}
        {/* 2. THE 4 DETAILED DEEP-DIVE MODULES (ACCORDION)               */}
        {/* ============================================================= */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300">
              2. In-Depth Operational Mechanics (Click Any Topic to Expand)
            </h4>
          </div>

          {/* Deep Dive 1: FII Futures L/S Ratio */}
          <div className={`rounded-xl border transition ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => toggleSection('fii_ls')}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Deep Dive 1: FII Futures Long/Short Ratio — Squeeze Fuel &amp; Exhaustion Top
                  </div>
                  <div className="text-[11px] text-slate-400">
                    How institutional basket trading turns a quiet market into a violent Call wing blowout
                  </div>
                </div>
              </div>
              {openSection === 'fii_ls' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {openSection === 'fii_ls' && (
              <div className={`p-4 pt-0 text-xs border-t space-y-3 ${isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <div className="space-y-2 mt-3">
                  <p>
                    <strong>The Math:</strong> The FII Long/Short ratio is calculated as:
                  </p>
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-cyan-300">
                    FII L/S Ratio (%) = [ FII Index Futures Long / (FII Index Futures Long + FII Index Futures Short) ] &times; 100
                  </div>
                  <p>
                    <strong>The Institutional Reality:</strong> Unlike retail traders who trade 1 or 2 lots, Foreign Portfolio Investors (FIIs) trade tens of thousands of contracts across global macro desks. They cannot enter or exit positions in a few seconds. When FIIs hold over 100,000 net short futures contracts (L/S ratio &lt; 25%), their positions become <em>short saturated</em>.
                  </p>
                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 text-rose-200 space-y-1">
                    <div className="font-bold">The Short-Squeeze Hazard (The 24,850 CE Case Study):</div>
                    <p className="text-[11px] leading-relaxed">
                      In late October 2026, FIIs built up an extreme short futures position. When global sentiment turned slightly positive overnight, FII execution algorithms automatically triggered stop-loss buy programs at 9:15 AM. FIIs had to buy thousands of futures contracts at market price, creating a vertical +400 pt gap-up. Retail call sellers who held naked 24,850 CE watched their premium explode from <strong>₹6.30 to ₹52.40</strong> in days, suffering an 8.3x blowout.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-emerald-300 font-medium">
                    <strong>Rule of Thumb:</strong> When FII L/S &le; 25%, never sell naked calls. If you must trade, sell put credit spreads only, or widen call wings to at least +14.5% OTM.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deep Dive 2: PRO Net Option Inventory */}
          <div className={`rounded-xl border transition ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => toggleSection('pro_inv')}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Activity className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Deep Dive 2: PRO (Market Maker) Net Option Inventory — Verifying the True GEX Sign
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Why market makers are forced to buy dips or accelerate selloffs to stay delta neutral
                  </div>
                </div>
              </div>
              {openSection === 'pro_inv' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {openSection === 'pro_inv' && (
              <div className={`p-4 pt-0 text-xs border-t space-y-3 ${isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <div className="space-y-2 mt-3">
                  <p>
                    <strong>Who are PROs?</strong> Proprietary trading desks (PRO) and algorithmic market makers are professional arbitrageurs. They do not hold directional opinions. Their mandate is to capture the bid-ask spread and collect the Volatility Risk Premium (VRP).
                  </p>
                  <p>
                    <strong>The Delta-Hedging Imperative:</strong> Because PROs are delta-neutral, every option contract they hold requires an opposite position in underlying futures:
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-slate-300">
                    <li>
                      <strong>PRO Net Calls &gt; 0 &amp; Net Puts &lt; 0 (Floor Defense):</strong> PROs are net long calls and net short puts (bought calls and sold puts to clients). When Nifty drops, their delta becomes too short, forcing PRO algorithms to <strong>buy futures on dips</strong>. This creates an invisible floor that cushions the market. This verifies <strong>Positive Dealer Gamma (+GEX)</strong>.
                    </li>
                    <li>
                      <strong>PRO Net Calls &lt; 0 &amp; Net Puts &gt; 0 (Runaway Cascade):</strong> PROs are net short calls and long puts. When Nifty drops, their delta becomes longer, forcing PRO algorithms to <strong>sell futures as prices fall</strong>. This accelerates drops and triggers flash crashes. This verifies <strong>Negative Dealer Gamma (-GEX)</strong>.
                    </li>
                  </ul>
                  <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-cyan-300">
                    <strong>Option Seller Application:</strong> Before deploying an OTM strangle, check PRO Net Options. If PRO Net Puts are negative and Net Calls are positive, put boundary walls will hold with high statistical probability.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deep Dive 3: Client / Retail Positioning */}
          <div className={`rounded-xl border transition ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => toggleSection('client_trap')}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Deep Dive 3: CLIENT (Retail) Positioning — Spotting the Liquidation Traps
                  </div>
                  <div className="text-[11px] text-slate-400">
                    How retail traders writing naked puts create powder kegs for morning cascades
                  </div>
                </div>
              </div>
              {openSection === 'client_trap' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {openSection === 'client_trap' && (
              <div className={`p-4 pt-0 text-xs border-t space-y-3 ${isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <div className="space-y-2 mt-3">
                  <p>
                    <strong>The Retail Mindset:</strong> In Indian equity options, retail clients ("CLIENT" category in NSE reports) have a strong psychological bias toward writing out-of-the-money puts during slow grinds to collect small premiums.
                  </p>
                  <p>
                    <strong>The Powder Keg Effect:</strong> When Client Net Put inventory balloons to <strong>-300,000 to -500,000 contracts short</strong>, retail is completely over-leveraged. If the market opens down by -0.8% or -1.2%:
                  </p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-300">
                    <li>Retail option writers receive immediate margin shortfall notices from their brokers.</li>
                    <li>When funds are not added by 10:00 AM, broker Risk Management Systems (RMS) forcefully square off retail short puts by buying back puts at market price.</li>
                    <li>This massive buying spike in puts drives implied volatility higher and forces market makers to dump futures to re-hedge delta, causing a secondary waterfall drop.</li>
                  </ol>
                  <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300">
                    <strong>Rule:</strong> When Client Net Puts are heavily negative (-300k+), never attempt to catch a falling knife by selling fresh puts on Day 1 of a gap down. Wait for RMS forced selling to exhaust (usually after 10:30 AM).
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deep Dive 4: DII Positioning */}
          <div className={`rounded-xl border transition ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => toggleSection('dii_hedge')}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Deep Dive 4: DII Positioning — Filtering Out Structural Equity Portfolio Hedges
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Why domestic mutual fund put holdings are portfolio insurance, not a bearish directional call
                  </div>
                </div>
              </div>
              {openSection === 'dii_hedge' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {openSection === 'dii_hedge' && (
              <div className={`p-4 pt-0 text-xs border-t space-y-3 ${isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <div className="space-y-2 mt-3">
                  <p>
                    <strong>Who are DIIs?</strong> Domestic Institutional Investors consist of mutual funds (SBI, HDFC, ICICI Prudential), insurance companies (LIC), and pension funds. Under SEBI regulations, Indian mutual funds are strictly prohibited from taking speculative short directional bets on index futures or options.
                  </p>
                  <p>
                    <strong>Mandated Tail-Risk Protection:</strong> Because mutual funds manage over ₹50 lakh crore in long equities, fund managers buy out-of-the-money Index Puts as systematic catastrophe insurance.
                  </p>
                  <p>
                    <strong>The Common Beginner Mistake:</strong> An uninitiated trader checks the NSE 7:00 PM report, notices that DIIs hold +100,000 net puts, and panics thinking domestic institutions are bearish. In reality, this is permanent baseline portfolio hedging.
                  </p>
                  <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-800/40 text-purple-300">
                    <strong>Rule:</strong> Treat DII Net Options as neutral background noise. Base 100% of your tactical decisions on FII Futures (macro liquidity) and PRO Options (dealer delta hedging).
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Deep Dive 5: 4-Quadrant Matrix Integration */}
          <div className={`rounded-xl border transition ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <button
              onClick={() => toggleSection('matrix_syn')}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    Deep Dive 5: Cross-Validating Participant Telemetry with the 4-Quadrant Volatility Matrix
                  </div>
                  <div className="text-[11px] text-slate-400">
                    How participant inventory provides the final confirmation or veto for tomorrow's quadrant setup
                  </div>
                </div>
              </div>
              {openSection === 'matrix_syn' ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {openSection === 'matrix_syn' && (
              <div className={`p-4 pt-0 text-xs border-t space-y-3 ${isDark ? 'border-slate-800/80 text-slate-300' : 'border-slate-200 text-slate-700'}`}>
                <div className="space-y-2.5 mt-3">
                  <p>
                    The 4-Quadrant Volatility Decision Matrix charts Nifty's macro position using Dealer Gamma (X-axis) and the Macro NTSI Score (Y-axis). The 7:00 PM NSE participant report is the <strong>sanity filter</strong>:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40">
                      <div className="font-bold text-emerald-400">Quadrant 1 (Prime Setup) + FII L/S 40%–60%</div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        <strong>Perfect Confluence (Green Light):</strong> Positive gamma cushions intraday moves, NTSI &ge; 60 confirms low macro trendiness, and FIIs have no inventory overhang. Deploy full symmetrical strangles with maximum statistical edge.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40">
                      <div className="font-bold text-rose-400">Quadrant 1 (Prime Setup) + FII L/S &le; 25%</div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        <strong>The Squeeze Trap (Asymmetric Override):</strong> Even though Dealer GEX is positive, FII short saturation can override dealer gamma on a global gap-up. <strong>Veto the Call wing</strong>; sell Put credit spreads only.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-800/40">
                      <div className="font-bold text-cyan-400">Quadrant 3 (Mean Reversion Dip) + PRO Long Calls</div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        <strong>Institutional Dip Absorption:</strong> NTSI is low (trend active) but GEX is positive and PROs are net long calls. Market makers will defend the put wall. Sell Bull Put Spreads with high win rates (&gt;85%).
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40">
                      <div className="font-bold text-rose-400">Quadrant 4 (Danger Zone) + Client Short Puts</div>
                      <p className="text-[11px] text-slate-300 mt-1">
                        <strong>Double Powder Keg (Full Stop):</strong> Negative GEX accelerates momentum, and retail is trapped short puts. Expect violent cascading liquidation. <strong>100% Cash / Veto all option sales.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ============================================================= */}
        {/* 3. THE OPTION SELLER'S 5-STEP EOD 7:00 PM CHECKLIST           */}
        {/* ============================================================= */}
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              3. The Option Seller's 5-Step EOD 7:00 PM Sanity Checklist
            </h4>
          </div>

          <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Run through these 5 questions every evening at 19:00 IST before leaving overnight short options:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5 text-xs">
            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="font-bold text-cyan-400 mb-1">Step 1: FII L/S</div>
              <p className="text-[11px] text-slate-400">Is FII L/S &le; 25%? If yes, close/hedge naked calls. Is it &ge; 75%? If yes, close/hedge naked puts.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="font-bold text-cyan-400 mb-1">Step 2: PRO Book</div>
              <p className="text-[11px] text-slate-400">Are PROs net long calls and short puts? If yes, dealers will buy dips to defend the market floor.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="font-bold text-cyan-400 mb-1">Step 3: Client Trap</div>
              <p className="text-[11px] text-slate-400">Are retail clients short &gt; 300k puts? If yes, prepare for RMS forced margin liquidation on any gap-down.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="font-bold text-cyan-400 mb-1">Step 4: Prevailing Q</div>
              <p className="text-[11px] text-slate-400">Check today's quadrant. Are we in Quadrant 1 (Green) or Quadrant 4 (Red)? Trade only when Q1 or Q3 prevails.</p>
            </div>

            <div className={`p-3 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="font-bold text-cyan-400 mb-1">Step 5: 2x Hard Stop</div>
              <p className="text-[11px] text-slate-400">Never hold naked options overnight without an automated GTT stop order placed at exactly 2.0x entry premium.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

