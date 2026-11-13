export interface OptionMatch {
  symbol: string;
  token: string;
  expiry: string;
  strike: number;
  option_type: 'CE' | 'PE' | 'VIX' | string;
  timeframe: '75m' | '1d' | 'weekly' | 'monthly';
  pattern: string;
  direction: 'BULLISH' | 'BEARISH';
  date: string;
  trigger_date?: string;
  c3_date?: string;
  ltp: number;
  l1?: number;
  l2?: number;
  disc1?: number;
  px_ratio?: number;
  dist_l1_pct?: number;
  dist_disc1_pct?: number;
  proximity?: 'Normal' | 'Near L1' | 'Near Disc1';
  pattern_type?: 'Fresh' | 'Regular';
  band_level?: number;
  disc_level?: number;
  distance_to_disc_pct?: number;
  rsi?: number;
  wma?: number;
  tenkan?: number;
}

export interface SyncProgress {
  current: number;
  total: number;
  percent: number;
  message: string;
}

export interface AppStatus {
  is_connected: boolean;
  client_code: string;
  is_market_open: boolean;
  next_75m_close: string;
  spot_price: number;
  vix_price?: number;
  atm_strike: number;
  is_scanning: boolean;
  is_syncing?: boolean;
  last_sync_time?: string;
  last_scan_time?: string;
  sync_progress?: SyncProgress;
  auto_sync_enabled?: boolean;
}

export interface ScreenerResponse {
  spot_price: number;
  vix_price?: number;
  scan_time: string;
  total_matches: number;
  matches: OptionMatch[];
  is_scanning?: boolean;
  is_syncing?: boolean;
  last_sync_time?: string;
  last_scan_time?: string;
  sync_progress?: SyncProgress;
  error?: string;
}


export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartDataResponse {
  candles: ChartCandle[];
  overlays: {
    sma20?: { time: number; value: number }[];
    sma50?: { time: number; value: number }[];
    wma21?: { time: number; value: number }[];
    tenkan?: { time: number; value: number }[];
    upper_bb?: { time: number; value: number }[];
    lower_bb?: { time: number; value: number }[];
    rsi?: { time: number; value: number }[];
    rsi_wma21?: { time: number; value: number }[];
  };
}


export interface ArchiveRecord {
  timestamp: string;
  symbol: string;
  token?: string;
  expiry: string;
  strike: number;
  option_type: string;
  timeframe: string;
  pattern: string;
  direction: string;
  ltp: number;
  trigger_level: number;
  details: string;
}

export interface ArchiveExpiryMeta {
  expiry: string;
  status: 'active' | 'expired';
  count: number;
}

export interface ArchiveResponse {
  records: ArchiveRecord[];
  expiries_meta: ArchiveExpiryMeta[];
  total_signals: number;
  active_signals: number;
  expired_signals: number;
  scope: string;
}

export interface TradeIdea {
  symbol: string;
  token?: string;
  strike: number;
  expiry: string;
  option_type: string;
  timeframe: string;
  pattern: string;
  ltp: number;
  trigger_level: number;
  details: string;
  proximity?: string;
}

export interface ConfluenceItem {
  symbol: string;
  token?: string;
  strike: number;
  expiry: string;
  option_type: string;
  timeframes: string[];
  patterns: string[];
  signal_count: number;
  latest_ltp: number;
  trigger_level: number;
  confluence_type: string;
}

export interface ProximityItem {
  symbol: string;
  token?: string;
  strike: number;
  expiry: string;
  option_type: string;
  timeframe: string;
  pattern: string;
  ltp: number;
  l1?: number;
  disc1?: number;
  proximity: string;
  dist_pct?: number;
}

export interface IntelligenceReport {
  window: string;
  selected_date: string;
  today_date: string;
  yesterday_date: string;
  total_triggers: number;
  spot_price: number;
  vix_price: number;
  sentiment: {
    bias: string;
    tone: string;
    bias_score: number;
    ce_count: number;
    pe_count: number;
    vix_count: number;
  };
  volatility: {
    vix_price: number;
    regime: string;
    guidance: string;
    badge_color: 'emerald' | 'blue' | 'amber';
  };
  confluences: ConfluenceItem[];
  proximity_watchlist: ProximityItem[];
  trade_ideas: {
    put_selling: TradeIdea[];
    call_selling: TradeIdea[];
    vix_alerts: TradeIdea[];
  };
  metrics: {
    by_pattern: Record<string, number>;
    by_timeframe: Record<string, number>;
    by_expiry: Record<string, number>;
  };
}

export interface NewStrikeItem {
  key: string;
  expiry: string;
  expiry_code: string;
  expiry_date: string;
  month_year: string;
  days_to_exp: number;
  type: 'CE' | 'PE' | string;
  strike: number;
  symbol: string;
  token: string;
  lot_size: number;
  diff: number;
  abs_diff: number;
  diff_pct: number;
  moneyness: 'OTM' | 'ATM' | 'ITM' | string;
  first_seen: string;
  days_ago: number;
}

export interface NewStrikesSummary {
  spot_price: number;
  atm_strike: number;
  today_count: number;
  last_1d_count: number;
  last_3d_count: number;
  last_7d_count: number;
  last_30d_count: number;
  total_far_new: number;
  far_expiries_count: number;
  last_scanned: string;
  backup_source: string;
  backup_last_modified: string;
  current_month_dropped: string;
}

export interface NewStrikesExpiryGroup {
  code: string;
  label: string;
  formatted: string;
  month_year: string;
  days_to_exp: number;
  date: string;
  total_new_strikes: number;
}

export interface NewStrikesResponse {
  summary: NewStrikesSummary;
  expiries: NewStrikesExpiryGroup[];
  strikes: NewStrikeItem[];
  total_filtered: number;
}

export interface MicrostructureRunnerState {
  is_running: boolean;
  current_mode: string;
  last_status: string;
  last_run_time: string;
  last_duration_sec: number;
  last_output: string;
  last_error: string;
  message: string;
}

export interface CyclePillarCheck {
  id: string;
  name: string;
  required: string;
  current: string;
  status: 'PASS' | 'FAIL' | 'PENDING';
  passed: boolean;
  detail: string;
}

export interface CycleDeploymentReadiness {
  deployment_status: 'READY_TO_DEPLOY' | 'ON_HOLD' | 'WAITING_CALENDAR';
  title: string;
  badge: string;
  badge_color: string;
  action_verdict: string;
  target_expiry: string;
  target_dte: number;
  pass_count: number;
  total_count: number;
  pillars: CyclePillarCheck[];
  recommended_strikes: {
    ce_strike: number;
    ce_otm_pct: string;
    pe_strike: number;
    pe_otm_pct: string;
    target_expiry: string;
    est_combined_credit: string;
    target_50pct_decay: string;
    hard_stop_ce: string;
    hard_stop_pe: string;
  };
}

export interface ExpiryCycleMeta {
  id: string;
  name: string;
  status: 'archived' | 'active';
  badge: string;
  badge_color: string;
  expiry_date: string;
  dte_label: string;
  underlying_spot_at_entry: number;
  ce_symbol: string;
  ce_strike: number;
  ce_otm_pct: string;
  ce_token: string;
  ce_entry_price: number;
  ce_stop_loss: number;
  ce_stop_executed_date?: string | null;
  pe_symbol: string;
  pe_strike: number;
  pe_otm_pct: string;
  pe_token: string;
  pe_entry_price: number;
  pe_target_lock: number;
  pe_target_executed_date?: string | null;
  initial_credit: number;
  lot_size: number;
  csv_file: string;
  disciplined_pnl_str: string;
  unhedged_blowout_str: string;
  case_study_summary: string;
  archived_at?: string | null;
}

export interface MicrostructureReplayItem {
  date: string;
  spot: number;
  ret_5d: number;
  fut_ltp: number;
  basis_pts: number;
  basis_pct: number;
  fut_vol: number;
  ce_ltp: number;
  ce_vol: number;
  pe_ltp: number;
  regime: string;
  directive: string;
  trader_action: string;
  is_call_stopped?: boolean;
  is_put_locked?: boolean;
  ce_pnl_disciplined_pts: number;
  pe_pnl_disciplined_pts: number;
  net_pnl_disciplined_pts: number;
  net_pnl_disciplined_lot: number;
  net_pnl_blind_pts: number;
  net_pnl_blind_lot: number;
}

export interface BasisRegimeCheatCode {
  id: string;
  name: string;
  range: string;
  regime: string;
  meaning: string;
  directive: string;
  action: string;
  color: string;
  badge: string;
}

export interface CoreRuleCheatCode {
  rule: string;
  summary: string;
  execution: string;
  hope_trap: string;
  visual_cue: string;
}

export interface DecisionMatrixItem {
  indicators: string;
  regime: string;
  directive: string;
  action: string;
  status: string;
  type: string;
}

export interface MicrostructureCheatCodes {
  basis_regimes: BasisRegimeCheatCode[];
  core_rules: CoreRuleCheatCode[];
  decision_matrix: DecisionMatrixItem[];
}

export interface MicrostructureDirectiveBadge {
  type: 'APPROVED' | 'VETO_CALLS' | 'VETO_PUTS' | 'STAND_ASIDE' | string;
  title: string;
  color: 'emerald' | 'rose' | 'amber' | 'slate' | string;
  full_text: string;
}

export interface QuadrantDefinition {
  id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  subtitle: string;
  gex_state: string;
  ntsi_state: string;
  dealer_hedging: string;
  market_velocity: string;
  win_rate: string;
  action_verdict: string;
  action_summary: string;
  color: 'emerald' | 'amber' | 'cyan' | 'rose';
  border_color: string;
  bg_tint: string;
}

export interface NextDayScenario {
  id: string;
  name: string;
  label: string;
  spot_change_pct: number;
  spot_change_pts: number;
  projected_spot: number;
  projected_ntsi: number;
  projected_gex_crores: number;
  projected_x: number; // -100 to +100
  projected_y: number; // 0 to 100
  projected_quadrant_id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  quadrant_name: string;
  call_wall_impact: string;
  put_wall_impact: string;
  dealer_dynamic: string;
  directive: string;
  recommended_trades: string[];
}

export interface RecommendedTradePlaybook {
  primary_structure: string;
  structure_type: 'Strangle' | 'Iron Condor' | 'Credit Spread' | 'Cash';
  holding_period: string;
  expected_roc: string;
  call_strike: string;
  call_delta: string;
  call_cushion_pct: string;
  put_strike: string;
  put_delta: string;
  put_cushion_pct: string;
  stop_loss_rule: string;
  profit_target_rule: string;
  circuit_breaker: string;
  rationale: string;
}

export interface HistoricalTrailItem {
  date: string;
  spot: number;
  ntsi: number;
  x: number;
  y: number;
  quadrant_id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  directive: string;
}

export interface FiiParticipantData {
  future_index_long: number;
  future_index_short: number;
  net_futures_contracts: number;
  ls_ratio_pct: number;
  ls_regime: string;
  call_long: number;
  call_short: number;
  net_calls: number;
  put_long: number;
  put_short: number;
  net_puts: number;
  stock_futures_net?: number;
}

export interface ProParticipantData {
  future_index_long: number;
  future_index_short: number;
  net_futures_contracts: number;
  call_long: number;
  call_short: number;
  net_calls: number;
  put_long: number;
  put_short: number;
  net_puts: number;
}

export interface ClientParticipantData {
  net_futures_contracts: number;
  net_calls: number;
  net_puts: number;
}

export interface DiiParticipantData {
  net_futures_contracts: number;
  net_calls: number;
  net_puts: number;
}

export interface OvernightParticipantVerdict {
  verdict: string;
  badge: string;
  color: 'rose' | 'amber' | 'emerald' | 'cyan' | string;
  implication: string;
  fii_summary: string;
  pro_summary: string;
  client_summary: string;
}

export interface ParticipantAnalysis {
  date: string;
  sync_timestamp: string;
  source: string;
  fii: FiiParticipantData;
  pro: ProParticipantData;
  client: ClientParticipantData;
  dii: DiiParticipantData;
  overnight_verdict: OvernightParticipantVerdict;
}

export interface QuadrantAnalysis {
  session_date: string;
  spot: number;
  vix: number;
  ntsi_score: number;
  ntsi_regime: string;
  call_wall_strike: number;
  call_wall_dist_pct: number;
  put_wall_strike: number;
  put_wall_dist_pct: number;
  gamma_flip_strike: number;
  spot_vs_flip_pts: number;
  spot_vs_flip_pct: number;
  net_gex_crores: number;
  gex_regime: string;
  current_x: number; // -100 to +100
  current_y: number; // 0 to 100 (NTSI)
  prevailing_quadrant_id: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  prevailing_quadrant: QuadrantDefinition;
  trade_playbook: RecommendedTradePlaybook;
  next_day_scenarios: NextDayScenario[];
  historical_trail: HistoricalTrailItem[];
  participant_oi?: ParticipantAnalysis;
}

export interface MicrostructurePayload {
  latest: Record<string, string>;
  directive_badge: MicrostructureDirectiveBadge;
  replay: MicrostructureReplayItem[];
  cycles?: ExpiryCycleMeta[];
  selected_cycle_id?: string;
  selected_cycle_meta?: ExpiryCycleMeta;
  deployment_readiness?: CycleDeploymentReadiness;
  cheat_codes: MicrostructureCheatCodes;
  has_chart_image: boolean;
  runner_state: MicrostructureRunnerState;
  quadrant_analysis?: QuadrantAnalysis;
  participant_oi?: ParticipantAnalysis;
}

