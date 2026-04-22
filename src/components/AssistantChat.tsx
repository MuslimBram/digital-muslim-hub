import { useEffect, useRef, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { Bot, Send, Sparkles, ShieldAlert, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  refused?: boolean;
}

const STORAGE_KEY = "lovi-assistant-history-v1";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export function AssistantChat() {
  const { user, session } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Msg[]) : [];
    } catch {
      return [];
    }
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-30)));
    } catch {
      /* quota */
    }
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  if (!user) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${SUPABASE_URL}/functions/v1/assistant-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          messages: history,
          currentRoute: location.pathname,
        }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || ct.includes("application/json")) {
        const data = await res.json().catch(() => ({ error: "Gabim" }));
        const refused = !!data.refused;
        setMessages((m) =>
          m.map((x) =>
            x.id === assistantId
              ? { ...x, content: data.message ?? data.error ?? "Gabim", refused }
              : x,
          ),
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const delta: string | undefined = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              acc += delta;
              setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: acc } : x)));
            }
          } catch {
            /* partial */
          }
        }
      }
    } catch (e) {
      setMessages((m) =>
        m.map((x) =>
          x.id === assistantId
            ? { ...x, content: `Gabim: ${e instanceof Error ? e.message : "i panjohur"}` }
            : x,
        ),
      );
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Hap Lovi asistent"
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:-translate-y-0.5"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Lovi</p>
                <p className="text-[11px] text-muted-foreground">Asistenti yt AI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMessages([]);
                    localStorage.removeItem(STORAGE_KEY);
                  }}
                  className="text-xs"
                >
                  Pastro
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Mbyll">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
            <div className="flex flex-col gap-3 py-4">
              {messages.length === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Përshëndetje! 👋</p>
                  <p className="mt-1">
                    Më pyet për çdo gjë rreth platformës: lidhjen e kanaleve, planifikim postimesh,
                    AI Engines, faturim, ose si të rritësh biznesin.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      "Si lidhem me Instagram?",
                      "Çfarë janë AI Engines?",
                      "Si funksionon trial?",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                    m.refused && "border border-destructive/40 bg-destructive/10 text-foreground",
                  )}
                >
                  {m.refused && (
                    <Badge variant="destructive" className="mb-1 gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Bllokuar
                    </Badge>
                  )}
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-li:my-0">
                      <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2 border-t border-border p-3"
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder="Shkruaj pyetjen…"
              rows={1}
              className="min-h-[40px] flex-1 resize-none"
              disabled={streaming}
            />
            <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}