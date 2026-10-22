// ─── 2026 Collapsible Option Chain Accordion ─────────────────────────────────
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
    <div className="bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Accordion Toggle Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between bg-slate-900/60 hover:bg-slate-900/90 transition-colors cursor-pointer select-none border-b border-white/[0.06]"
      >
        <div className="flex items-center gap-2.5">
          <span className="mono text-[12px] font-black tracking-wider uppercase text-white flex items-center gap-1.5">
            <span>⛓️</span>
            <span>OPTION CHAIN</span>
            <span className="text-emerald-400">({chainData.underlyingSymbol} · {chainData.expiry})</span>
          </span>
          <span className="mono text-[10.5px] text-slate-400 hidden sm:inline">
            · Spot ₹{chainData.spotPrice.toLocaleString('en-IN')} · PCR <span className="font-bold text-amber-400">{chainData.pcr.toFixed(2)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 mono text-[11px] font-bold text-emerald-400">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            {isOpen ? 'Collapse Chain ▲' : 'Expand Live Chain ▼'}
          </span>
        </div>
      </button>

      {/* Expanded Table */}
      {isOpen && (
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto p-2 border-t border-white/[0.06] bg-slate-950/90">
          <table className="w-full mono text-[11px] text-center border-collapse">
            <thead>
              <tr className="bg-slate-900/95 text-[10px] font-bold text-slate-400 uppercase border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
                <th colSpan={4} className="py-2 text-emerald-400 border-r border-white/10">
                  CALLS (CE)
                </th>
                <th className="py-2 text-cyan-400 px-3 bg-cyan-500/5">STRIKE</th>
                <th colSpan={4} className="py-2 text-rose-400 border-l border-white/10">
                  PUTS (PE)
                </th>
              </tr>
              <tr className="bg-slate-900/60 text-[9.5px] text-slate-400 border-b border-white/10">
                <th className="py-1.5 px-2">Action</th>
                <th className="py-1.5 px-2">LTP</th>
                <th className="py-1.5 px-2">OI</th>
                <th className="py-1.5 px-2 border-r border-white/10">IV %</th>
                <th className="py-1.5 px-3 font-black text-white bg-cyan-500/5">Price</th>
                <th className="py-1.5 px-2 border-l border-white/10">IV %</th>
                <th className="py-1.5 px-2">OI</th>
                <th className="py-1.5 px-2">LTP</th>
                <th className="py-1.5 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {chainData.strikes.map((row) => {
                const isATM = row.isATM;
                return (
                  <tr
                    key={row.strike}
                    className={`border-b border-white/[0.04] hover:bg-white/5 transition-colors ${
                      isATM ? 'bg-amber-400/10 font-black' : ''
                    }`}
                  >
                    {/* Call Actions */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer shadow-xs"
                          title="Add Buy Call"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all cursor-pointer shadow-xs"
                          title="Add Sell Call"
                        >
                          +S
                        </button>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 font-black text-emerald-400">
                      ₹{row.call.ltp.toFixed(1)}
                    </td>
                    <td className="py-1.5 px-2 text-slate-400">
                      {(row.call.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1.5 px-2 text-slate-400 border-r border-white/10">
                      {row.call.impliedVolatility.toFixed(1)}%
                    </td>

                    {/* Central Strike */}
                    <td
                      className={`py-1.5 px-3 font-black text-center ${
                        isATM
                          ? 'text-amber-400 bg-amber-500/20 rounded shadow-[0_0_10px_rgba(251,191,36,0.3)]'
                          : 'text-white bg-cyan-500/5'
                      }`}
                    >
                      ₹{row.strike} {isATM ? '★' : ''}
                    </td>

                    {/* Put Side */}
                    <td className="py-1.5 px-2 text-slate-400 border-l border-white/10">
                      {row.put.impliedVolatility.toFixed(1)}%
                    </td>
                    <td className="py-1.5 px-2 text-slate-400">
                      {(row.put.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1.5 px-2 font-black text-rose-400">
                      ₹{row.put.ltp.toFixed(1)}
                    </td>
                    {/* Put Actions */}
                    <td className="py-1.5 px-2">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 transition-all cursor-pointer shadow-xs"
                          title="Add Buy Put"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all cursor-pointer shadow-xs"
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
