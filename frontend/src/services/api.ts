import axios from 'axios';
import { AppStatus, ScreenerResponse, ChartDataResponse, ArchiveRecord, ArchiveResponse, IntelligenceReport, NewStrikesResponse, MicrostructurePayload, MicrostructureRunnerState } from '../types';

const client = axios.create({
  baseURL: '/api'
});

export const getStatus = async (): Promise<AppStatus> => {
  const res = await client.get('/status');
  return res.data;
};

export const loginWithTotp = async (totpCode?: string): Promise<{ success: boolean; message: string }> => {
  const res = await client.post('/auth/login', { totp_code: totpCode });
  return res.data;
};

export const getExpiries = async (): Promise<string[]> => {
  const res = await client.get('/expiries');
  return res.data.expiries || [];
};

export const runScreener = async (params?: {
  timeframe?: string;
  expiry?: string;
  pattern?: string;
  option_type?: string;
  proximity_only?: boolean;
  force?: boolean;
}): Promise<ScreenerResponse> => {
  const res = await client.get('/screener', { params });
  return res.data;
};

export const triggerScanNow = async (force: boolean = false, syncCandles: boolean = true): Promise<{ status: string; message: string }> => {
  const res = await client.post('/scan-now', { force, sync_candles: syncCandles });
  return res.data;
};


export const getChartData = async (token: string, timeframe: string): Promise<ChartDataResponse> => {
  const res = await client.get(`/chart/${token}`, { params: { timeframe } });
  return res.data;
};

export const getArchiveData = async (scope: string = 'active', limit: number = 0): Promise<ArchiveResponse> => {
  const res = await client.get('/archive', { params: { scope, limit } });
  return res.data;
};

export const getArchiveRecords = async (limit: number = 0): Promise<ArchiveRecord[]> => {
  const res = await client.get('/archive', { params: { scope: 'all', limit } });
  return res.data.records || [];
};

export const getIntelligenceReport = async (window: string = 'today'): Promise<IntelligenceReport> => {
  const res = await client.get('/report', { params: { window } });
  return res.data;
};

export const getNewStrikes = async (params?: {
  lookback?: string;
  expiry?: string;
  option_type?: string;
  moneyness?: string;
  search?: string;
}): Promise<NewStrikesResponse> => {
  const res = await client.get('/new-strikes', { params });
  return res.data;
};

export const syncNewStrikesBackup = async (): Promise<NewStrikesResponse> => {
  const res = await client.post('/new-strikes/sync');
  return res.data;
};

export const getMicrostructureData = async (cycleId?: string): Promise<MicrostructurePayload> => {
  const res = await client.get('/microstructure/data', { params: cycleId ? { cycle_id: cycleId } : {} });
  return res.data;
};

export const archiveMicrostructureCycle = async (cycleId: string, summary?: string): Promise<any> => {
  const res = await client.post('/microstructure/archive-cycle', null, { params: { cycle_id: cycleId, summary } });
  return res.data;
};

export const runMicrostructure = async (mode: string = 'radar'): Promise<{ status: string; message: string; state: MicrostructureRunnerState }> => {
  const res = await client.post('/microstructure/run', null, { params: { mode } });
  return res.data;
};

export const getMicrostructureStatus = async (): Promise<MicrostructureRunnerState> => {
  const res = await client.get('/microstructure/status');
  return res.data;
};

export const syncParticipantOI = async (): Promise<any> => {
  const res = await client.post('/microstructure/sync-participant-oi');
  return res.data;
};

export const getParticipantOI = async (): Promise<any> => {
  const res = await client.get('/microstructure/participant-oi');
  return res.data;
};


