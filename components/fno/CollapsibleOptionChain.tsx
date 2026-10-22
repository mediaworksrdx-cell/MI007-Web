// ─── Collapsible Option Chain Accordion (Opstra Definedge Compatible) ────────
'use client';

import React, { useState } from 'react';
import { OptionChainData, StrategyLeg, TradeAction } from '@/lib/fno/fnoTypes';

interface CollapsibleOptionChainProps {
  chainData: OptionChainData;
  onAddLeg: (leg: StrategyLeg) => void;
}

export function CollapsibleOptionChain({
  chainData,
  onAddLeg,
}: CollapsibleOptionChainProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

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
    <div className="bg-[var(--theme-card-surface)] border border-[var(--theme-card-border)] rounded-xl overflow-hidden shadow-sm">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 flex items-center justify-between bg-[var(--theme-card-subsurface)] hover:bg-[var(--theme-card-surface)] transition-colors cursor-pointer select-none"
      >
        <div className="flex items-center gap-2">
          <span className="mono text-[12px] font-black tracking-wider uppercase text-[var(--theme-card-text)]">
            ⛓️ OPTION CHAIN ({chainData.underlyingSymbol} · {chainData.expiry})
          </span>
          <span className="mono text-[10px] text-[var(--theme-card-subtitle)]">
            · Spot ₹{chainData.spotPrice.toLocaleString('en-IN')} · PCR {chainData.pcr.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-2 mono text-[11px] font-bold text-emerald-400">
          <span>{isOpen ? 'Collapse Chain ▲' : 'Expand Chain ▼'}</span>
        </div>
      </button>

      {/* Expanded Table */}
      {isOpen && (
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto p-2 border-t border-[var(--theme-card-border)]">
          <table className="w-full mono text-[11px] text-center border-collapse">
            <thead>
              <tr className="bg-[var(--theme-card-subsurface)] text-[10px] font-bold text-[var(--theme-card-subtitle)] uppercase border-b border-[var(--theme-card-border)] sticky top-0 z-10 backdrop-blur-md">
                <th colSpan={4} className="py-1.5 text-emerald-400 border-r border-[var(--theme-card-border)]">
                  CALLS (CE)
                </th>
                <th className="py-1.5 text-cyan-400 px-3">STRIKE</th>
                <th colSpan={4} className="py-1.5 text-rose-400 border-l border-[var(--theme-card-border)]">
                  PUTS (PE)
                </th>
              </tr>
              <tr className="bg-[var(--theme-card-surface)] text-[9.5px] text-[var(--theme-card-subtitle)] border-b border-[var(--theme-card-border)]">
                <th className="py-1 px-1.5">Action</th>
                <th className="py-1 px-1.5">LTP</th>
                <th className="py-1 px-1.5">OI</th>
                <th className="py-1 px-1.5 border-r border-[var(--theme-card-border)]">IV %</th>
                <th className="py-1 px-3 font-black text-[var(--theme-card-text)]">Price</th>
                <th className="py-1 px-1.5 border-l border-[var(--theme-card-border)]">IV %</th>
                <th className="py-1 px-1.5">OI</th>
                <th className="py-1 px-1.5">LTP</th>
                <th className="py-1 px-1.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {chainData.strikes.map((row) => {
                const isATM = row.isATM;
                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-[var(--theme-card-border)]/40 hover:bg-white/5 transition-colors ${
                      isATM ? 'bg-amber-400/10 font-black' : ''
                    }`}
                  >
                    {/* Call Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Add Buy Call"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Add Sell Call"
                        >
                          +S
                        </button>
                      </div>
                    </td>
                    <td className="py-1 px-1.5 font-bold text-emerald-400">
                      ₹{row.call.ltp.toFixed(1)}
                    </td>
                    <td className="py-1 px-1.5 text-[var(--theme-card-subtitle)]">
                      {(row.call.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 text-[var(--theme-card-subtitle)] border-r border-[var(--theme-card-border)]">
                      {row.call.impliedVolatility.toFixed(1)}%
                    </td>

                    {/* Central Strike */}
                    <td
                      className={`py-1 px-3 font-black text-center ${
                        isATM
                          ? 'text-amber-400 bg-amber-500/20 rounded'
                          : 'text-[var(--theme-card-text)]'
                      }`}
                    >
                      ₹{row.strike} {isATM ? '★' : ''}
                    </td>

                    {/* Put Side */}
                    <td className="py-1 px-1.5 text-[var(--theme-card-subtitle)] border-l border-[var(--theme-card-border)]">
                      {row.put.impliedVolatility.toFixed(1)}%
                    </td>
                    <td className="py-1 px-1.5 text-[var(--theme-card-subtitle)]">
                      {(row.put.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 font-bold text-rose-400">
                      ₹{row.put.ltp.toFixed(1)}
                    </td>
                    {/* Put Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-colors cursor-pointer"
                          title="Add Buy Put"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-colors cursor-pointer"
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
