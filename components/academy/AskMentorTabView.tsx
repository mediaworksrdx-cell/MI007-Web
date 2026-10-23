'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/academy/academyData';
import { generateMentorResponse } from '@/lib/academy/financialDomainFilter';

interface AskMentorTabProps {
  initialQuery?: string;
  niftySpot?: number;
}

export function AskMentorTabView({ initialQuery, niftySpot = 22687.65 }: AskMentorTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'Aarka AI',
      message:
        'Welcome to **Aarka AI Mentor**!\n\nI can help you understand and trade the financial markets in simple terms:\n\n• **Stock Market**: Indian stocks, NIFTY 50, Bank NIFTY & US stocks\n• **Technical Analysis**: Charts, support/resistance, price action & indicators\n• **Fundamentals**: Company results, P/E ratio, valuation & balance sheets\n• **Futures & Options**: Calls, puts, strike prices & option Greeks\n• **Forex, Commodities & Crypto**: Currencies, gold, crude oil & Bitcoin\n• **Risk Management**: Position sizing and how to protect your capital\n\nAsk me any question to get started!',
      isMentor: true,
      timestamp: 'Now',
    },
  ]);
  const [input, setInput] = useState(initialQuery ?? '');
  const [isTyping, setIsTyping] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialQuery) {
      handleSend(initialQuery);
    }
  }, [initialQuery]);

  // Keep internal chat scrolled to latest message without scrolling the window/page
  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || isTyping) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'You',
      message: query,
      isMentor: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const botMsgId = `mentor-${Date.now()}`;
    const initialBotMsg: ChatMessage = {
      id: botMsgId,
      sender: 'Aarka AI',
      message: '',
      isMentor: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg, initialBotMsg]);
    setInput('');
    setIsTyping(true);

    let accumulatedText = '';

    try {
      // Stream directly from Aarka AI
      const res = await fetch('/api/aarkaai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'content' && typeof parsed.token === 'string') {
                accumulatedText += parsed.token;
                setMessages(prev => {
                  const next = [...prev];
                  const targetIdx = next.findIndex(m => m.id === botMsgId);
                  if (targetIdx !== -1) {
                    next[targetIdx] = {
                      ...next[targetIdx],
                      message: accumulatedText,
                    };
                  }
                  return next;
                });
              }
            } catch {
              // Ignore partial stream frames
            }
          }
        }
      } else {
        throw new Error('Streaming failed, trying prompt endpoint');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // If streaming encountered an issue or didn't accumulate text, try prompt endpoint
      if (!accumulatedText.trim()) {
        try {
          const promptRes = await fetch('/api/aarkaai/prompt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
            signal: controller.signal,
          });

          if (promptRes.ok) {
            const data = await promptRes.json();
            if (data.response) {
              accumulatedText = data.response;
              setMessages(prev => {
                const next = [...prev];
                const targetIdx = next.findIndex(m => m.id === botMsgId);
                if (targetIdx !== -1) {
                  next[targetIdx] = {
                    ...next[targetIdx],
                    message: accumulatedText,
                  };
                }
                return next;
              });
            }
          } else {
            throw new Error('Aarka AI prompt failed');
          }
        } catch {
          // Fallback to local dynamic knowledge generator
          const fallbackAnswer = generateMentorResponse(query, { spot: niftySpot });
          accumulatedText = fallbackAnswer;
          setMessages(prev => {
            const next = [...prev];
            const targetIdx = next.findIndex(m => m.id === botMsgId);
            if (targetIdx !== -1) {
              next[targetIdx] = {
                ...next[targetIdx],
                message: fallbackAnswer,
              };
            }
            return next;
          });
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-hidden">
      {/* Mentor Header */}
      <div className="p-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-emerald-400">
            AARKA AI MENTOR
          </span>
          <span className="opacity-30">·</span>
          <span className="text-[10px] text-emerald-400/90 font-medium">Online</span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div
        ref={chatBodyRef}
        className="flex-1 p-4 overflow-y-auto space-y-3.5 font-sans text-sm"
      >
        {messages.map(msg => {
          // Hide placeholder bubble while thinking and no text received yet
          if (!msg.message && msg.isMentor && isTyping) {
            return null;
          }

          return (
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
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] w-fit text-xs font-sans text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aarka AI is thinking...</span>
          </div>
        )}
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
          disabled={isTyping}
          placeholder="Ask Aarka AI a question in simple words (e.g. What is RSI?, How to trade Gold?, Explain NIFTY)..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-sans focus:outline-emerald-500 disabled:opacity-50"
        />

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isTyping || !input.trim()}
          className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
        >
          {isTyping ? 'Thinking...' : 'Ask Aarka →'}
        </button>
      </div>
    </div>
  );
}
