'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SUGGESTED_MENTOR_QUESTIONS } from '@/lib/academy/academyData';
import {
  generateMentorResponse,
  completeOrRepairTruncatedAnswer,
} from '@/lib/academy/financialDomainFilter';

interface AskMentorTabProps {
  initialQuery?: string;
  niftySpot?: number;
}

/**
 * Copy to clipboard helper component for code blocks
 */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 active:scale-95 cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

/**
 * Parses inline formatting: bold (**), italic (*), inline code (`), and inline math ($)
 */
function formatInlineTokens(text: string): React.ReactNode {
  if (!text) return null;

  // Quick exit if no special markdown tokens exist
  if (!text.includes('**') && !text.includes('`') && !text.includes('$') && !text.includes('*')) {
    return text;
  }

  const parts: React.ReactNode[] = [];
  // Tokenizer regex matching bold, inline code, inline math, and italic
  const regex = /(\*\*.*?\*\*|`.*?`|\$[^\$\n]+?\$|\*[^*]+?\*)/g;
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
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('$') && token.endsWith('$')) {
      // Inline math formula
      const formula = token.slice(1, -1);
      parts.push(
        <span
          key={`m-${match.index}`}
          className="font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300/95 border border-emerald-500/20"
        >
          {formula}
        </span>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts;
}

/**
 * Rich, responsive Markdown & Institutional Formula renderer for Mentor responses
 */
function MentorMarkdown({ content }: { content: string }) {
  if (!content) return null;

  // 1. Unwrap accidental outer markdown block declaration if the model wrapped the whole message in ```markdown
  let processed = content.trim();
  if (processed.startsWith('```markdown') && processed.endsWith('```')) {
    processed = processed.slice(11, -3).trim();
  } else if (processed.startsWith('`markdown\n')) {
    processed = processed.slice(10).trim();
  }

  // Split into lines for structured block-level tokenization
  const rawLines = processed.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let blockKey = 0;

  while (i < rawLines.length) {
    const line = rawLines[i];
    const trimmed = line.trim();

    // ── 1. Code Block (```lang ... ```) ──
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'code';
      const codeLines: string[] = [];
      i++;
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i]);
        i++;
      }
      if (i < rawLines.length && rawLines[i].trim().startsWith('```')) {
        i++; // skip closing ```
      }
      const codeString = codeLines.join('\n');

      // If the code block is marked 'markdown' or starts with headers/bullets, render it directly as formatted markdown
      if (lang.toLowerCase() === 'markdown' && (codeString.includes('#') || codeString.includes('- '))) {
        blocks.push(
          <div key={`nested-md-${blockKey++}`} className="space-y-2 my-2 pl-2 border-l border-emerald-500/30">
            <MentorMarkdown content={codeString} />
          </div>
        );
      } else {
        blocks.push(
          <div
            key={`cb-${blockKey++}`}
            className="my-3 rounded-xl border border-emerald-500/30 bg-slate-950/90 overflow-hidden shadow-md"
          >
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-emerald-950/40 border-b border-emerald-500/20 text-[10px] font-mono">
              <span className="text-emerald-400 font-bold uppercase tracking-wider">{lang}</span>
              <CopyButton text={codeString} />
            </div>
            <pre className="p-3.5 overflow-x-auto font-mono text-xs text-emerald-300 leading-relaxed">
              <code>{codeString}</code>
            </pre>
          </div>
        );
      }
      continue;
    }

    // ── 2. Display Math Formula ($$...$$) ──
    if (trimmed.startsWith('$$')) {
      const mathLines: string[] = [];
      if (trimmed.endsWith('$$') && trimmed.length > 2) {
        mathLines.push(trimmed.slice(2, -2).trim());
        i++;
      } else {
        mathLines.push(trimmed.slice(2).trim());
        i++;
        while (i < rawLines.length && !rawLines[i].trim().endsWith('$$')) {
          mathLines.push(rawLines[i]);
          i++;
        }
        if (i < rawLines.length && rawLines[i].trim().endsWith('$$')) {
          const last = rawLines[i].trim();
          mathLines.push(last.slice(0, -2).trim());
          i++;
        }
      }
      const formula = mathLines.join(' ').replace(/\\\\/g, '\\');
      blocks.push(
        <div
          key={`math-${blockKey++}`}
          className="my-3 p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 font-mono text-xs sm:text-[13px] text-emerald-300 text-center overflow-x-auto shadow-inner"
        >
          {formula}
        </div>
      );
      continue;
    }

    // ── 3. Markdown Tables (| col1 | col2 |) ──
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        tableLines.push(rawLines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());
        // Skip index 1 if it's separator (|:---|:---|)
        const isSep = tableLines[1].replace(/[-|:\s]/g, '').length === 0;
        const bodyRows = (isSep ? tableLines.slice(2) : tableLines.slice(1)).map(r =>
          r
            .split('|')
            .slice(1, -1)
            .map(c => c.trim())
        );

        blocks.push(
          <div key={`tbl-${blockKey++}`} className="my-3 overflow-x-auto rounded-xl border border-[var(--theme-card-border)] shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-emerald-950/40 text-emerald-400 font-mono text-[11px] uppercase tracking-wider">
                  {headerRow.map((h, hIdx) => (
                    <th key={`th-${hIdx}`} className="p-2.5 font-bold border-b border-[var(--theme-card-border)]">
                      {formatInlineTokens(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-card-border)] bg-[var(--theme-card-bg)]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-emerald-500/5 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`td-${rIdx}-${cIdx}`} className="p-2.5 text-slate-200">
                        {formatInlineTokens(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // ── 4. Headings (#, ##, ###, ####) ──
    if (trimmed.startsWith('#')) {
      const hashMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (hashMatch) {
        const level = hashMatch[1].length;
        const headingText = hashMatch[2];
        i++;

        if (level === 1) {
          blocks.push(
            <h1
              key={`h1-${blockKey++}`}
              className="text-base sm:text-lg font-black text-emerald-400 mt-4 mb-2 pb-1.5 border-b border-emerald-500/20 tracking-tight"
            >
              {formatInlineTokens(headingText)}
            </h1>
          );
        } else if (level === 2) {
          blocks.push(
            <h2
              key={`h2-${blockKey++}`}
              className="text-sm sm:text-base font-bold text-emerald-300 mt-3.5 mb-1.5 tracking-tight flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{formatInlineTokens(headingText)}</span>
            </h2>
          );
        } else if (level === 3) {
          blocks.push(
            <h3
              key={`h3-${blockKey++}`}
              className="text-xs sm:text-sm font-bold text-emerald-400/90 mt-3 mb-1 font-mono tracking-tight"
            >
              {formatInlineTokens(headingText)}
            </h3>
          );
        } else {
          blocks.push(
            <h4
              key={`h4-${blockKey++}`}
              className="text-xs font-semibold text-slate-200 mt-2 mb-1"
            >
              {formatInlineTokens(headingText)}
            </h4>
          );
        }
        continue;
      }
    }

    // ── 5. Horizontal Dividers (--- or ***) ──
    if (trimmed === '---' || trimmed === '***') {
      blocks.push(
        <div key={`hr-${blockKey++}`} className="my-3.5 border-t border-emerald-500/20" />
      );
      i++;
      continue;
    }

    // ── 6. Blockquotes (> ...) ──
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.replace(/^>\s*/, '');
      blocks.push(
        <div
          key={`bq-${blockKey++}`}
          className="my-2 border-l-2 border-emerald-500/70 pl-3 py-1 bg-emerald-950/20 rounded-r text-emerald-200/90 text-xs italic"
        >
          {formatInlineTokens(quoteText)}
        </div>
      );
      i++;
      continue;
    }

    // ── 7. Lists (Unordered & Ordered) ──
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const numberMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);

    if (bulletMatch || numberMatch) {
      const listItems: React.ReactNode[] = [];
      while (i < rawLines.length) {
        const curTrim = rawLines[i].trim();
        const bM = curTrim.match(/^[-*•]\s+(.*)$/);
        const nM = curTrim.match(/^(\d+)\.\s+(.*)$/);

        if (bM) {
          listItems.push(
            <li key={`li-${blockKey++}`} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="text-emerald-400 font-bold select-none shrink-0">•</span>
              <div className="flex-1">{formatInlineTokens(bM[1])}</div>
            </li>
          );
          i++;
        } else if (nM) {
          listItems.push(
            <li key={`li-${blockKey++}`} className="flex items-start gap-2 text-[13px] leading-relaxed">
              <span className="text-emerald-400 font-mono font-bold text-xs select-none shrink-0">
                {nM[1]}.
              </span>
              <div className="flex-1">{formatInlineTokens(nM[2])}</div>
            </li>
          );
          i++;
        } else {
          break;
        }
      }

      blocks.push(
        <ul key={`list-${blockKey++}`} className="space-y-1.5 my-2 pl-1">
          {listItems}
        </ul>
      );
      continue;
    }

    // ── 8. Empty line / Paragraph spacing ──
    if (!trimmed) {
      i++;
      continue;
    }

    // ── 9. Normal Text Paragraph ──
    blocks.push(
      <p key={`p-${blockKey++}`} className="text-[13px] leading-relaxed my-1.5 text-slate-200">
        {formatInlineTokens(trimmed)}
      </p>
    );
    i++;
  }

  return <div className="space-y-1">{blocks}</div>;
}

export function AskMentorTabView({ initialQuery, niftySpot = 22687.65 }: AskMentorTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'Aarka AI',
      message:
        "Welcome to Aarka AI Mentor! I'm here to help you master financial markets, quantitative derivatives, and Smart Money Concepts (SMC) in simple terms.\n\nAsk me any question below or choose from the suggested institutional topics to get started!",
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

    const updateBotMessage = (text: string) => {
      setMessages(prev => {
        const next = [...prev];
        const targetIdx = next.findIndex(m => m.id === botMsgId);
        if (targetIdx !== -1) {
          next[targetIdx] = {
            ...next[targetIdx],
            message: text,
          };
        }
        return next;
      });
    };

    try {
      // Stream directly from Aarka AI with 4096 output token capability
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
          if (done) {
            // Stream complete, flush any pending decoded characters
            buffer += decoder.decode();
            break;
          }

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
                updateBotMessage(accumulatedText);
              }
            } catch {
              // Ignore partial stream frames
            }
          }
        }

        // Process any trailing lines in buffer after stream completes
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.slice(5).trim();
            if (!dataStr || dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'content' && typeof parsed.token === 'string') {
                accumulatedText += parsed.token;
              }
            } catch {
              // Ignore
            }
          }
        }

        // Validate completeness and repair any truncated answers (e.g. cut off at ## Overview)
        const repaired = completeOrRepairTruncatedAnswer(accumulatedText, query, { spot: niftySpot });
        if (repaired && repaired !== accumulatedText) {
          accumulatedText = repaired;
          updateBotMessage(accumulatedText);
        }
      } else {
        throw new Error('Streaming failed, trying prompt endpoint');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // If streaming encountered an issue or response is truncated (<200 chars), try prompt endpoint
      if (!accumulatedText.trim() || accumulatedText.length < 200) {
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
              const repaired = completeOrRepairTruncatedAnswer(data.response, query, { spot: niftySpot });
              accumulatedText = repaired;
              updateBotMessage(accumulatedText);
            } else {
              throw new Error('No response in data payload');
            }
          } else {
            throw new Error('Aarka AI prompt failed');
          }
        } catch {
          // Fallback to local dynamic knowledge generator
          const fallbackAnswer = generateMentorResponse(query, { spot: niftySpot });
          accumulatedText = fallbackAnswer;
          updateBotMessage(fallbackAnswer);
        }
      }
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] overflow-hidden shadow-xl">
      {/* Mentor Header */}
      <div className="p-3.5 border-b border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] flex items-center justify-between font-mono text-[11px]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold uppercase tracking-wider text-emerald-400">
            AARKA AI MENTOR
          </span>
          <span className="opacity-30">·</span>
          <span className="text-[10px] text-emerald-400/90 font-medium">Telemetry Online (4K Tokens)</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400">
          <span>Synthetix Aarka Intelligence Core</span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div
        ref={chatBodyRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm"
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
              <div className="flex items-center gap-2 mb-1.5 font-mono text-[10px] opacity-60">
                <span className="font-bold">{msg.sender}</span>
                <span>· {msg.timestamp}</span>
              </div>

              <div
                className={`p-4 rounded-2xl max-w-[92%] sm:max-w-[85%] leading-relaxed shadow-xs ${
                  msg.isMentor
                    ? 'bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] text-[var(--theme-card-text)]'
                    : 'bg-emerald-500 text-slate-950 font-medium'
                }`}
              >
                {msg.isMentor ? (
                  <div className="relative">
                    <MentorMarkdown content={msg.message} />
                    {msg.message && (
                      <div className="mt-3 pt-2 border-t border-[var(--theme-card-border)]/50 flex justify-end">
                        <CopyButton text={msg.message} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-[13px] leading-relaxed">
                    {msg.message}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[var(--theme-card-bg)] border border-[var(--theme-card-border)] w-fit text-xs font-sans text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Aarka AI is reasoning & streaming response...</span>
          </div>
        )}
      </div>

      {/* Quick Suggested Mentor Queries */}
      <div className="px-3.5 py-2 border-t border-[var(--theme-card-border)]/70 bg-[var(--theme-card-bg)] flex items-center gap-2 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <span className="text-emerald-400/80 font-bold shrink-0">💡 Quick:</span>
        {SUGGESTED_MENTOR_QUESTIONS.slice(0, 4).map((q, idx) => (
          <button
            key={`q-${idx}`}
            type="button"
            onClick={() => handleSend(q)}
            disabled={isTyping}
            className="px-2.5 py-1 rounded-lg border border-[var(--theme-card-border)] bg-[var(--theme-card-surface)] hover:border-emerald-500/50 hover:text-emerald-400 text-slate-300 transition-all shrink-0 cursor-pointer disabled:opacity-40"
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
          disabled={isTyping}
          placeholder="Ask Aarka AI a question (e.g. What is Smart Money Concepts?, Explain Order Blocks & FVG, How to calculate Delta)..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--theme-card-border)] bg-[var(--theme-card-bg)] text-[13px] font-sans focus:outline-emerald-500 disabled:opacity-50 text-[var(--theme-card-text)] placeholder:text-slate-500"
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
