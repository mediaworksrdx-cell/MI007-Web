// ─── Exact Opstra Definedge Option Chain Accordion ──────────────────────────
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
    <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-xs">
      {/* Centered Accordion Button (Exact Opstra Style) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 px-4 flex items-center justify-center relative hover:bg-slate-50 transition-colors cursor-pointer select-none"
      >
        <span className="text-[13px] font-bold text-slate-800">
          Option Chain
        </span>
        <span className="absolute right-4 text-slate-500 text-[12px]">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded Table */}
      {isOpen && (
        <div className="max-h-[380px] overflow-y-auto overflow-x-auto p-2 border-t border-slate-200 bg-white">
          <table className="w-full text-[11px] text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10.5px] font-bold text-slate-600 uppercase border-b border-slate-200 sticky top-0 z-10">
                <th colSpan={4} className="py-1.5 text-emerald-700 border-r border-slate-200">
                  CALLS (CE)
                </th>
                <th className="py-1.5 text-slate-800 px-3 bg-slate-100">STRIKE</th>
                <th colSpan={4} className="py-1.5 text-rose-700 border-l border-slate-200">
                  PUTS (PE)
                </th>
              </tr>
              <tr className="bg-white text-[10px] text-slate-500 border-b border-slate-200">
                <th className="py-1 px-1.5">Action</th>
                <th className="py-1 px-1.5">LTP</th>
                <th className="py-1 px-1.5">OI</th>
                <th className="py-1 px-1.5 border-r border-slate-200">IV %</th>
                <th className="py-1 px-3 font-bold text-slate-800 bg-slate-100">Strike</th>
                <th className="py-1 px-1.5 border-l border-slate-200">IV %</th>
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
                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      isATM ? 'bg-amber-50 font-bold' : ''
                    }`}
                  >
                    {/* Call Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded-2xs text-[9.5px] font-bold bg-[#DEF7EC] text-[#03543F] hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Add Buy Call"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'CE', row.strike, row.call.ltp, row.call.impliedVolatility, row.call.greeks)}
                          className="px-1.5 py-0.5 rounded-2xs text-[9.5px] font-bold bg-[#FDE8E8] text-[#9B1C1C] hover:bg-rose-200 transition-colors cursor-pointer"
                          title="Add Sell Call"
                        >
                          +S
                        </button>
                      </div>
                    </td>
                    <td className="py-1 px-1.5 font-bold text-emerald-700">
                      ₹{row.call.ltp.toFixed(1)}
                    </td>
                    <td className="py-1 px-1.5 text-slate-500">
                      {(row.call.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 text-slate-500 border-r border-slate-200">
                      {row.call.impliedVolatility.toFixed(1)}%
                    </td>

                    {/* Central Strike */}
                    <td
                      className={`py-1 px-3 font-bold text-center ${
                        isATM ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {row.strike} {isATM ? '★' : ''}
                    </td>

                    {/* Put Side */}
                    <td className="py-1 px-1.5 text-slate-500 border-l border-slate-200">
                      {row.put.impliedVolatility.toFixed(1)}%
                    </td>
                    <td className="py-1 px-1.5 text-slate-500">
                      {(row.put.openInterest / 1000).toFixed(0)}k
                    </td>
                    <td className="py-1 px-1.5 font-bold text-rose-700">
                      ₹{row.put.ltp.toFixed(1)}
                    </td>
                    {/* Put Actions */}
                    <td className="py-1 px-1.5">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAddContract('BUY', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded-2xs text-[9.5px] font-bold bg-[#DEF7EC] text-[#03543F] hover:bg-emerald-200 transition-colors cursor-pointer"
                          title="Add Buy Put"
                        >
                          +B
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddContract('SELL', 'PE', row.strike, row.put.ltp, row.put.impliedVolatility, row.put.greeks)}
                          className="px-1.5 py-0.5 rounded-2xs text-[9.5px] font-bold bg-[#FDE8E8] text-[#9B1C1C] hover:bg-rose-200 transition-colors cursor-pointer"
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
