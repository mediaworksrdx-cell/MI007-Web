// ─── Exact Opstra Definedge Option Chain Accordion ──────────────────────────
'use client';

import React, { useState } from 'react';
import { OptionChainData, StrategyLeg, TradeAction } from '@/lib/fno/fnoTypes';
import { findFnoInstrument } from '@/lib/fno/fnoDataService';

interface CollapsibleOptionChainProps {
  chainData: OptionChainData;
  onAddLeg: (leg: StrategyLeg) => void;
}

export function CollapsibleOptionChain({
  chainData,
  onAddLeg,
}: CollapsibleOptionChainProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const inst = findFnoInstrument(chainData.underlyingSymbol);
  const curr = inst.market === 'USA' ? '$' : inst.market === 'UAE' ? 'AED ' : '₹';

  const handleAddContract = (
    action: TradeAction,
    type: 'CE' | 'PE',
    strike: number,
    ltp: number,
    iv: number,
    greeks: any
  ) => {
    const newLeg: StrategyLeg = {
      id: `chain-leg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      instrument: type,
      strike,
      expiry: chainData.expiry,
      lots: 1,
      lotSize: chainData.lotSize,
      entryPrice: ltp,
      currentPrice: ltp,
      iv,
      greeks,
      disabled: false,
    };
    onAddLeg(newLeg);
  };

  return (
    <div className="bg-[var(--theme-card-bg)] text-[var(--theme-card-text)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-xs">
      {/* Centered Accordion Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-4 flex items-center justify-center relative hover:bg-[var(--theme-card-surface)] transition-colors cursor-pointer select-none"
      >
        <span className="text-[13px] font-bold text-[var(--theme-card-text)]">
          Option Chain ({chainData.expiry})
        </span>
        <span className="absolute right-4 text-slate-400 text-[12px]">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded Table */}
      {isOpen && (
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto p-2 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
          <table className="w-full text-[11px] text-center border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-[var(--theme-card-surface)] text-[10.5px] font-sans font-bold text-slate-400 uppercase border-b border-[var(--theme-card-border)] sticky top-0 z-10">
                <th colSpan={4} className="py-1.5 text-emerald-500 border-r border-[var(--theme-card-border)]">
                  CALLS (CE)
                </th>
                <th className="py-1.5 text-[var(--theme-card-text)] px-3 bg-[var(--theme-card-surface)]">STRIKE</th>
                <th colSpan={4} className="py-1.5 text-rose-500 border-l border-[var(--theme-card-border)]">
                  PUTS (PE)
                </th>
              </tr>
              <tr className="bg-[var(--theme-card-bg)] text-[10px] font-sans text-slate-400 border-b border-[var(--theme-card-border)]">
                <th className="py-1 px-1.5">Action</th>
                <th className="py-1 px-1.5">LTP</th>
                <th className="py-1 px-1.5">OI</th>
                <th className="py-1 px-1.5 border-r border-[var(--theme-card-border)]">IV %</th>
                <th className="py-1 px-3 font-bold text-[var(--theme-card-text)] bg-[var(--theme-card-surface)]">Strike</th>
                <th className="py-1 px-1.5 border-l border-[var(--theme-card-border)]">IV %</th>
                <th className="py-1 px-1.5">OI</th>
                <th className="py-1 px-1.5">LTP</th>
                <th className="py-1 px-1.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {chainData.strikes.map((row) => {
                const liveSpot = chainData.spotPrice;
                const minStrikeDiff = Math.min(...chainData.strikes.map(s => Math.abs(s.strike - liveSpot)));
                const isATM = row.isATM || (Math.abs(row.strike - liveSpot) === minStrikeDiff);
                const callMoneyness: 'ITM' | 'ATM' | 'OTM' = isATM ? 'ATM' : row.strike < liveSpot ? 'ITM' : 'OTM';
                const putMoneyness: 'ITM' | 'ATM' | 'OTM' = isATM ? 'ATM' : row.strike > liveSpot ? 'ITM' : 'OTM';

                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-[var(--theme-card-border)]/50 hover:bg-[var(--theme-card-surface)] transition-colors ${
                      isATM ? 'bg-amber-500/10 font-bold' : ''
                    }`}
                  >
                    {/* Call Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          title="Add Buy Call"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors cursor-pointer"
                          title="Add Sell Call"
                        >
                          +S
                        </button>
                      </div>
                    </td>
                    <td className="py-1 px-1.5 font-bold text-emerald-500">
                      {curr}{row.call.ltp.toFixed(1)}
                    </td>
                    <td className="py-1 px-1.5 text-slate-400">
                      {(row.call.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 text-slate-400 border-r border-[var(--theme-card-border)]">
                      {row.call.impliedVolatility.toFixed(1)}%
                    </td>

                    {/* Central Strike with Adjacent Moneyness Labels */}
                    <td
                      className={`py-1 px-2 font-bold text-center ${
                        isATM ? 'bg-amber-500/20 text-amber-500' : 'bg-[var(--theme-card-surface)] text-[var(--theme-card-text)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                            callMoneyness === 'ITM'
                              ? 'bg-amber-500/20 text-amber-500'
                              : callMoneyness === 'ATM'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400'
                          }`}
                        >
                          {callMoneyness}
                        </span>
                        <span className="font-mono">{row.strike}</span>
                        <span
                          className={`text-[8px] px-1 py-0.2 rounded font-bold uppercase ${
                            putMoneyness === 'ITM'
                              ? 'bg-amber-500/20 text-amber-500'
                              : putMoneyness === 'ATM'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400'
                          }`}
                        >
                          {putMoneyness}
                        </span>
                      </div>
                    </td>

                    {/* Put Side */}
                    <td className="py-1 px-1.5 text-slate-400 border-l border-[var(--theme-card-border)]">
                      {row.put.impliedVolatility.toFixed(1)}%
                    </td>
                    <td className="py-1 px-1.5 text-slate-400">
                      {(row.put.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 font-bold text-rose-500">
                      {curr}{row.put.ltp.toFixed(1)}
                    </td>
                    {/* Put Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 transition-colors cursor-pointer"
                          title="Add Buy Put"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-sans font-bold bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 transition-colors cursor-pointer"
                          title="Add Sell Put"
                        >
                          +S
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
