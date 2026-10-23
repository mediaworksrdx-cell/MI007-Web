'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '@/lib/academy/academyData';
import { generateMentorResponse } from '@/lib/academy/financialDomainFilter';

interface AskMentorTabProps {
  initialQuery?: string;
  niftySpot?: number;
}

interface DomainCard {
  icon: string;
  title: string;
  desc: string;
  sampleQuery: string;
  badge: string;
}

const DOMAIN_CARDS: DomainCard[] = [
  {
    icon: '📈',
    title: 'Equities & Indices',
    desc: 'NIFTY 50, Bank NIFTY, Sensex, Midcap & US Large Caps structure',
    sampleQuery: 'Analyze NIFTY 50 trend and key support/resistance levels',
    badge: 'NSE / BSE / US',
  },
  {
    icon: '⚡',
    title: 'Futures & Options (F&O)',
    desc: 'Strike selection, Max Pain, PCR, IV & Greeks (Delta, Theta, Vega)',
    sampleQuery: 'Explain Option Greeks (Delta & Theta) simply for NIFTY options',
    badge: 'Derivatives',
  },
  {
    icon: '📐',
    title: 'Technical Analysis',
    desc: 'Chart patterns, price action, multi-timeframe & momentum indicators',
    sampleQuery: 'How do I identify high-probability breakout setups with volume?',
    badge: 'Price Action',
  },
  {
    icon: '⚖️',
    title: 'Fundamental Valuation',
    desc: 'Quarterly results, P/E multiples, balance sheet health & ROCE',
    sampleQuery: 'What key fundamental metrics should I check before investing?',
    badge: 'Valuation',
  },
  {
    icon: '🌍',
    title: 'Commodities & Macro',
    desc: 'Gold, Crude Oil, USD/INR forex & Bitcoin global macro flows',
    sampleQuery: 'How does Crude Oil and USD/INR affect Indian stock indices?',
    badge: 'Macro',
  },
  {
    icon: '🛡️',
    title: 'Risk & Capital Defense',
    desc: '1% capital rule, position sizing, risk-to-reward & stop-loss rules',
    sampleQuery: 'How to calculate position size using the 1% risk rule?',
    badge: 'Risk Control',
  },
];

const QUICK_PROMPTS = [
  { label: 'Option Greeks Explained', query: 'Explain Delta, Gamma, Theta, and Vega with practical NIFTY examples.' },
  { label: 'Max Pain & PCR Guide', query: 'How do Max Pain and Put-Call Ratio (PCR) predict index expiry levels?' },
  { label: '1% Risk Management', query: 'How does the 1% capital risk rule work and how do I calculate position size?' },
  { label: 'High-Probability Breakouts', query: 'What chart patterns and volume criteria confirm a genuine breakout?' },
  { label: 'Iron Condor Setup', query: 'When should I deploy an Iron Condor options strategy and how to manage risk?' },
  { label: 'Swing vs Intraday Trading', query: 'What are the main differences, rules, and mindsets between Swing and Intraday trading?' },
];

/**
 * Parses inline markdown elements (**bold** and `code`) safely
 */
function parseInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-emerald-400">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`c-${match.index}`}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/30"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

/**
 * Formatted message renderer with headers, bullets, numbers, and code blocks
 */
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="my-2 space-y-2 pl-0.5">
          {currentList}
        </ul>
      );
      currentList = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      elements.push(<div key={`blank-${idx}`} className="h-2" />);
      return;
    }

    // Markdown Header 3 or 2 (### Heading or ## Heading)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      flushList();
      const headerText = trimmed.replace(/^#{2,3}\s+/, '');
      elements.push(
        <div
          key={`h-${idx}`}
          className="font-mono text-xs uppercase tracking-wider font-extrabold text-emerald-400 mt-3 mb-1.5 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
          <span>{parseInlineMarkdown(headerText)}</span>
        </div>
      );
      return;
    }

    // Bullet items: •, -, *
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.replace(/^[•\-\*]\s+/, '');
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
          <span className="text-emerald-400 select-none text-[10px] mt-1 shrink-0">◆</span>
          <span className="flex-1 text-[var(--theme-card-text)]">{parseInlineMarkdown(itemText)}</span>
        </li>
      );
      return;
    }

    // Numbered list item: e.g. "1. " or "2. "
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      flushList();
      elements.push(
        <div key={`num-${idx}`} className="flex items-start gap-2.5 my-1.5 text-[13.5px] leading-relaxed">
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <span className="flex-1 text-[var(--theme-card-text)]">{parseInlineMarkdown(numMatch[2])}</span>
        </div>
      );
      return;
    }

    // Regular paragraph
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-[13.5px] leading-relaxed my-1 text-[var(--theme-card-text)]">
        {parseInlineMarkdown(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-0.5">{elements}</div>;
}

export function AskMentorTabView({ initialQuery, niftySpot = 22687.65 }: AskMentorTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'Aarka AI',
      message: '', // Rendered by the rich launchpad component
      isMentor: true,
      timestamp: 'Now',
    },
  ]);
  const [input, setInput] = useState(initialQuery ?? '');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
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

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const handleResetChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([
      {
        id: 'welcome',
        sender: 'Aarka AI',
        message: '',
        isMentor: true,
        timestamp: 'Now',
      },
    ]);
    setInput('');
  };

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
    <div className="flex flex-col h-[740px] rounded-2xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-hidden shadow-2xl">
      {/* Mentor Header */}
      <div className="px-4 py-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="absolute w-4 h-4 rounded-full bg-emerald-500/25 animate-ping" />
          </div>
          <span className="font-extrabold uppercase tracking-wider text-emerald-400 text-xs">
            AARKA AI FINANCIAL MENTOR
          </span>
          <span className="opacity-30">·</span>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25">
            Active Copilot
          </span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <button
              type="button"
              onClick={handleResetChat}
              className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:bg-emerald-500/10 hover:text-emerald-300 text-[10px] font-mono text-[var(--theme-card-text-muted)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>↺</span>
              <span>New Conversation</span>
            </button>
          )}
        </div>
      </div>

      {/* Chat Messages Body */}
      <div
        ref={chatBodyRef}
        className="flex-1 p-4 md:p-6 overflow-y-auto space-y-5 font-sans"
      >
        {messages.map(msg => {
          // If this is the welcome message, render the Institutional Copilot Launchpad
          if (msg.id === 'welcome') {
            return (
              <div
                key={msg.id}
                className="rounded-2xl border border-emerald-500/25 bg-gradient-to-b from-[var(--theme-card-bg)] via-[var(--theme-card-surface)] to-[var(--theme-card-bg)] p-5 md:p-6 shadow-xl space-y-6"
              >
                {/* Header banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--theme-card-border)] pb-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Institutional AI Financial Copilot
                    </div>
                    <h3 className="text-lg md:text-xl font-black text-slate-100 tracking-tight flex items-center gap-2">
                      <span>Welcome to Aarka AI Mentor</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                        Live Market Ready
                      </span>
                    </h3>
                    <p className="text-xs text-[var(--theme-card-text-muted)] max-w-2xl leading-relaxed">
                      Instant financial intelligence across equities, derivatives, macro factors, and risk controls. Ask any question in plain language to get institutional-grade answers.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 font-medium">
                      ⚡ Low-Latency Stream
                    </span>
                  </div>
                </div>

                {/* 6 Domain Capability Cards */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-[var(--theme-card-text-muted)]">
                    <span>Explore Covered Market Domains</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Click any card to ask</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {DOMAIN_CARDS.map((card, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSend(card.sampleQuery)}
                        className="text-left group p-3.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xl group-hover:scale-110 transition-transform">
                              {card.icon}
                            </span>
                            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                              {card.badge}
                            </span>
                          </div>
                          <div className="font-bold text-xs text-slate-100 group-hover:text-emerald-400 transition-colors">
                            {card.title}
                          </div>
                          <p className="text-[11px] text-[var(--theme-card-text-muted)] leading-relaxed">
                            {card.desc}
                          </p>
                        </div>
                        <div className="mt-3 pt-2.5 border-t border-[var(--theme-card-border)]/60 flex items-center justify-between text-[10px] font-mono text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
                          <span className="truncate pr-2">Try: &ldquo;{card.sampleQuery.slice(0, 30)}...&rdquo;</span>
                          <span className="shrink-0 font-bold">Ask →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Starter Prompts */}
                <div className="space-y-2 pt-2 border-t border-[var(--theme-card-border)]/60">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--theme-card-text-muted)] flex items-center gap-1.5">
                    <span>Popular Starter Questions</span>
                    <span className="text-xs">💡</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt, pIdx) => (
                      <button
                        key={pIdx}
                        type="button"
                        onClick={() => handleSend(prompt.query)}
                        className="px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/60 hover:bg-emerald-500/10 text-slate-200 hover:text-emerald-300 transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
                      >
                        <span className="text-emerald-400">✦</span>
                        <span>{prompt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          }

          // Hide empty placeholder bubble while waiting for first stream token
          if (!msg.message && msg.isMentor && isTyping) {
            return null;
          }

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.isMentor ? 'items-start' : 'items-end'} max-w-full`}
            >
              {/* Sender label & timestamp */}
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[11px] opacity-80 px-1">
                {msg.isMentor ? (
                  <>
                    <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400 font-bold">
                      AI
                    </div>
                    <span className="font-bold text-emerald-400">Aarka AI Mentor</span>
                    <span className="opacity-40">·</span>
                    <span className="text-[10px] text-[var(--theme-card-text-muted)]">{msg.timestamp}</span>
                  </>
                ) : (
                  <>
                    <span className="text-[10px] text-[var(--theme-card-text-muted)]">{msg.timestamp}</span>
                    <span className="opacity-40">·</span>
                    <span className="font-bold text-slate-200">You</span>
                    <div className="w-5 h-5 rounded-md bg-slate-700/60 border border-slate-600/40 flex items-center justify-center text-[10px] text-slate-200 font-bold">
                      U
                    </div>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              {msg.isMentor ? (
                <div className="w-full md:max-w-[92%] rounded-2xl rounded-tl-sm border-l-3 border-l-emerald-400 border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] p-4 md:p-5 shadow-lg space-y-3">
                  <FormattedMessage content={msg.message} />

                  {/* Footer actions */}
                  <div className="pt-3 border-t border-[var(--theme-card-border)]/50 flex items-center justify-between font-mono text-[10px] text-[var(--theme-card-text-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-emerald-400 font-medium">Aarka Financial Intelligence</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(msg.message, msg.id)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--theme-card-surface)] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition-colors cursor-pointer border border-[var(--theme-card-border)]"
                      title="Copy message"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <span className="text-emerald-400">✓</span>
                          <span className="text-emerald-400 font-bold">Copied</span>
                        </>
                      ) : (
                        <>
                          <span>📋</span>
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-950 font-semibold p-3.5 shadow-md text-[13.5px] leading-relaxed">
                  {msg.message}
                </div>
              )}
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[var(--theme-card-bg)] border border-emerald-500/30 w-fit text-xs font-mono text-emerald-400 shadow-sm animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Aarka AI is analyzing financial models...</span>
          </div>
        )}
      </div>

      {/* Query Input Footer */}
      <div className="p-3.5 border-t border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center gap-2.5">
        <div className="relative flex-1">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={isTyping}
            placeholder="Ask Aarka AI anything (e.g., Explain Option Delta, How to use Max Pain, 1% Risk Rule)..."
            className="w-full px-4 py-3 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] text-[13.5px] font-sans text-slate-100 placeholder-[var(--theme-card-text-muted)] focus:outline-emerald-500 focus:border-emerald-500 disabled:opacity-50 transition-all pr-8"
          />
          {input && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleSend()}
          disabled={isTyping || !input.trim()}
          className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-mono text-xs font-black transition-all cursor-pointer shadow-md active:scale-95 shrink-0 flex items-center gap-1.5"
        >
          {isTyping ? (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span>Ask Aarka</span>
              <span>→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
