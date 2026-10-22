'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/academy/academyData';
import { generateMentorResponse } from '@/lib/academy/financialDomainFilter';

interface AskMentorTabProps {
  initialQuery?: string;
  niftySpot?: number;
}

export function AskMentorTabView({ initialQuery, niftySpot = 23824.50 }: AskMentorTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'Aarka AI',
      message:
        'Welcome to **Aarka AI Mentor**. I provide real-time institutional analysis across **Finance**, **Technical Analysis**, **Fundamental Valuation**, **Stock Markets**, **Forex**, **Commodities**, and **Crypto**.\n\nAsk me anything regarding trade setups, market microstructure, valuation models, option Greeks, or quantitative risk discipline.',
      isMentor: true,
      timestamp: 'Now',
    },
  ]);
  const [input, setInput] = useState(initialQuery ?? '');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'You',
      message: query,
      isMentor: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const mentorAnswer = generateMentorResponse(query, { spot: niftySpot });
      const botMsg: ChatMessage = {
        id: `mentor-${Date.now()}`,
        sender: 'Aarka AI',
        message: mentorAnswer,
        isMentor: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="flex flex-col h-[650px] rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-hidden">
      {/* Mentor Header Telemetry */}
      <div className="p-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-black uppercase tracking-wider text-emerald-400">
            AARKA AI MENTOR
          </span>
        </div>
        <div className="text-right text-[10.5px]">
          <span className="opacity-60">Spot Telemetry: </span>
          <span className="font-black text-emerald-400">₹{niftySpot.toLocaleString()}</span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-sm">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.isMentor ? 'items-start' : 'items-end'}`}
          >
            <div className="flex items-center gap-1.5 mb-1 font-mono text-[10px] opacity-60">
              <span className="font-bold">{msg.sender}</span>
              <span>· {msg.timestamp}</span>
            </div>

            <div
              className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                msg.isMentor
                  ? 'bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)]'
                  : 'bg-emerald-500 text-slate-950 font-medium'
              }`}
            >
              <div className="whitespace-pre-wrap text-[13px]">{msg.message}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] max-w-[200px] text-xs font-mono text-emerald-400">
            <span className="animate-spin text-sm">🔄</span>
            <span>Aarka AI reasoning...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Query Input Footer */}
      <div className="p-3 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder="Ask Aarka AI (Finance, Technicals, Fundamentals, Stocks, Forex, Commodities, Crypto)..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-sans focus:outline-emerald-500"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          Ask Aarka Mentor →
        </button>
      </div>
    </div>
  );
}
