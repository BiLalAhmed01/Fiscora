"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import RequireAuth from "@/components/RequireAuth";
import { streamChat, type ChatChunk } from "@/lib/api";
import { track } from "@/lib/analytics";

interface Segment {
  /** Specialist agent name, or null for the coordinator's own synthesis. */
  agent: string | null;
  content: string;
}

type Message = { role: "user"; content: string } | { role: "assistant"; segments: Segment[] };

const SUGGESTIONS = [
  "Should I invest in AAPL or pay off my credit card debt first?",
  "Break down my spending and suggest where I can cut back.",
  "What's a good emergency fund size for my situation?",
  "Compare NVDA and AMD fundamentals.",
];

const DISCLAIMER =
  "Fiscora gives informational insights based on your data and public market data -- it's not a licensed financial advisor, and nothing here should replace advice from one for major decisions.";

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-hidden="true">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
    </span>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1">
        <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-white/50">You</span>
        <div className="max-w-[85%] rounded-2xl bg-white px-4 py-2.5 text-sm text-black">
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="max-w-[85%] rounded-2xl bg-white/5 px-4 py-2.5 text-sm text-white">
        {message.segments.map((seg, i) => (
          <div key={i} className={i > 0 ? "mt-3 border-t border-white/10 pt-3" : ""}>
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/50">
              {seg.agent ?? "Fiscora"}
            </span>
            <div className="chat-markdown">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{seg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChatPageInner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", segments: [] }]);
    setIsStreaming(true);
    track("chat_message_sent");
    if (!localStorage.getItem("fiscora_first_message_sent")) {
      localStorage.setItem("fiscora_first_message_sent", "1");
      track("first_chat_message_sent");
    }

    const appendChunk = (chunk: ChatChunk) => {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last.role !== "assistant") return prev;

        const segments = [...last.segments];
        const lastSeg = segments[segments.length - 1];
        if (lastSeg && lastSeg.agent === chunk.agent) {
          segments[segments.length - 1] = { agent: lastSeg.agent, content: lastSeg.content + chunk.content };
        } else {
          segments.push({ agent: chunk.agent, content: chunk.content });
        }
        next[next.length - 1] = { role: "assistant", segments };
        return next;
      });
    };

    try {
      const sessionId = await streamChat(text, sessionIdRef.current, appendChunk);
      sessionIdRef.current = sessionId;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong -- please try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    send(input);
  };

  const lastMessage = messages[messages.length - 1];
  const isWaitingForFirstToken =
    isStreaming && lastMessage?.role === "assistant" && lastMessage.segments.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100vh-57px)] max-w-3xl flex-col px-4">
      <div className="flex-1 overflow-y-auto py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-6 text-center">
            <div>
              <p className="text-white/70">
                Ask Fiscora anything about investing, markets, budgeting, savings, or debt.
              </p>
              <p className="mt-2 text-xs text-white/50">{DISCLAIMER}</p>
            </div>
            <div className="grid w-full gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-lg border border-white/10 px-4 py-3 text-left text-sm text-white/70 hover:border-white/40 hover:text-white"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} />
            ))}
            {isWaitingForFirstToken && (
              <div className="flex flex-col items-start gap-1">
                <span className="px-1 text-[11px] font-medium uppercase tracking-wide text-white/50">
                  Fiscora
                </span>
                <div className="rounded-2xl bg-white/5 px-4 py-3">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-white/10 py-4">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a stock, your budget, savings, or debt..."
            aria-label="Message Fiscora"
            className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-white/40"
          />
          <button type="submit" disabled={isStreaming || !input.trim()} className="btn btn-solid">
            <span>Send</span>
          </button>
        </div>
        {messages.length > 0 && <p className="px-1 text-[11px] text-white/50">{DISCLAIMER}</p>}
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <RequireAuth>
      <ChatPageInner />
    </RequireAuth>
  );
}
