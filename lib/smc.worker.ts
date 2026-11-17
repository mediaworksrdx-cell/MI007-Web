// Web Worker for offloading Smart Money Concepts (SMC) calculation off the main UI thread.
import { calculateSMC, type SmcConfig, type SmcAnalysis } from './smcEngine';
import type { Candle } from './types';

export interface SmcWorkerRequest {
  requestId: number;
  candles: Candle[];
  config?: Partial<SmcConfig>;
  symbol?: string;
  timeframe?: string;
}

export interface SmcWorkerResponse {
  requestId: number;
  result: SmcAnalysis;
}

self.onmessage = (e: MessageEvent<SmcWorkerRequest>) => {
  const { requestId, candles, config, symbol, timeframe } = e.data;
  const result = calculateSMC(candles, config, symbol, timeframe);
  const response: SmcWorkerResponse = { requestId, result };
  self.postMessage(response);
};
