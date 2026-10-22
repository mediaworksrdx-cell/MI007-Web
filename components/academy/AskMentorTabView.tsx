'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SUGGESTED_MENTOR_QUESTIONS } from '@/lib/academy/academyData';
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
        'Welcome to **Aarka AI Cognitive Mentor**. I specialize strictly in institutional market structure, order book liquidity, Option Greeks, Smart Money Concepts (SMC), and quantitative risk discipline. Ask me anything about trading strategy or fundamentals.',
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
        sender: 'Aarka AI 7B',
        message: mentorAnswer,
        isMentor: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="flex flex-col h-[650px] rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-hidden">
      {/* Mentor Header Telemetry */}
      <div className="p-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-black uppercase tracking-wider text-emerald-400">
            AARKA AI 7B NEURAL ENGINE
          </span>
          <span className="opacity-40">|</span>
          <span className="opacity-70">COGNITIVE MENTOR ACTIVE</span>
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
              {/* Render formatting simply with markdown whitespace */}
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

      {/* Suggested Questions Pills */}
      <div className="px-4 py-2 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center gap-2 overflow-x-auto whitespace-nowrap font-mono text-[10.5px]">
        <span className="opacity-50 shrink-0 uppercase font-bold">Suggested:</span>
        {SUGGESTED_MENTOR_QUESTIONS.map(q => (
          <button
            key={q}
            type="button"
            onClick={() => handleSend(q)}
            className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] hover:border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-400 transition-colors cursor-pointer shrink-0"
          >
            {q}
          </button>
        ))}
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
          placeholder="Ask Aarka AI (e.g. NIFTY 50 structure, F&O Greeks, SMC Order Blocks, Risk discipline)..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-sans focus:outline-emerald-500"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          Ask Mentor →
        </button>
      </div>
    </div>
  );
}
