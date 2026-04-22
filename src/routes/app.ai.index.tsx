import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Loader2, Plus, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai/")({
  component: AIChatPage,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  citations?: { id: string; title: string }[];
}

interface ConversationItem {
  id: string;
  title: string;
  updated_at: string;
}

function AIChatPage() {
  const { t } = useI18n();
  const { current } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .eq("workspace_id", current.id)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (data) setConversations(data);
  };

  useEffect(() => { loadConversations(); /* eslint-disable-next-line */ }, [current?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadConversation = async (id: string) => {
    setConversationId(id);
    const { data } = await supabase
      .from("ai_messages")
      .select("role, content, citations")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    if (data) {
      setMessages(data.filter((m) => m.role === "user" || m.role === "assistant").map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
        citations: (m.citations as { id: string; title: string }[]) ?? [],
      })));
    }
  };

  const startNew = () => {
    setConversationId(null);
    setMessages([]);
  };

  const send = async () => {
    if (!input.trim() || !current || streaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", content: userMsg }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Not authenticated");

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: current.id,
          conversationId,
          message: userMsg,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";
      let citations: { id: string; title: string }[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n\n")) !== -1) {
          const event = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 2);
          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6).trim();
            if (!json) continue;
            try {
              const parsed = JSON.parse(json);
              if (parsed.type === "conv") {
                setConversationId(parsed.id);
                citations = parsed.citations ?? [];
              } else if (parsed.type === "delta") {
                assistantText += parsed.content;
                setMessages((m) => {
                  const copy = [...m];
                  copy[copy.length - 1] = { role: "assistant", content: assistantText, citations };
                  return copy;
                });
              } else if (parsed.type === "error") {
                throw new Error(parsed.message);
              }
            } catch (err) {
              if (err instanceof SyntaxError) continue;
              throw err;
            }
          }
        }
      }
      loadConversations();
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "AI error");
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t("ai.chat.title")}
        actions={
          <Button variant="outline" size="sm" onClick={startNew}>
            <Plus className="h-4 w-4" /> {t("ai.chat.new")}
          </Button>
        }
      />
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 gap-0 lg:grid-cols-[260px_1fr]">
        {/* Sidebar — conversations */}
        <aside className="hidden border-r border-border bg-muted/20 lg:flex lg:flex-col">
          <div className="border-b border-border p-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("ai.chat.history")}
          </div>
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversation(c.id)}
                  className={`flex items-start gap-2 rounded-lg p-2 text-left text-sm transition-colors hover:bg-muted ${
                    conversationId === c.id ? "bg-muted font-medium" : ""
                  }`}
                >
                  <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2 flex-1">{c.title}</span>
                </button>
              ))}
              {conversations.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground">No chats yet</div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat */}
        <div className="flex h-full flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div
                  className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]"
                  style={{ backgroundImage: "var(--gradient-primary)" }}
                >
                  <Sparkles className="h-8 w-8 text-primary-foreground" />
                </div>
                <h3 className="text-lg font-semibold">{t("ai.chat.empty.title")}</h3>
                <p className="mt-1 max-w-md text-sm text-muted-foreground">{t("ai.chat.empty.desc")}</p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-6">
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${
                        m.role === "user" ? "bg-secondary text-secondary-foreground" : "text-primary-foreground"
                      }`}
                      style={m.role === "assistant" ? { backgroundImage: "var(--gradient-primary)" } : undefined}
                    >
                      {m.role === "user" ? "Ti" : <Sparkles className="h-4 w-4" />}
                    </div>
                    <div className={`flex max-w-[80%] flex-col gap-2 ${m.role === "user" ? "items-end" : ""}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm ${
                          m.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "border border-border bg-card"
                        }`}
                      >
                        {m.role === "assistant" && !m.content && streaming ? (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{t("ai.chat.thinking")}</span>
                          </div>
                        ) : m.role === "assistant" ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-pre:my-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{m.content}</div>
                        )}
                      </div>
                      {m.citations && m.citations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {m.citations.map((c, idx) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              <span className="font-mono">[{idx + 1}]</span> {c.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border bg-background/80 p-4 backdrop-blur-xl">
            <div className="mx-auto flex max-w-3xl items-end gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={t("ai.chat.placeholder")}
                rows={1}
                className="min-h-[44px] resize-none"
                disabled={streaming}
              />
              <Button onClick={send} disabled={!input.trim() || streaming} variant="hero" size="icon" className="h-11 w-11 shrink-0">
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}