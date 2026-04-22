import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Globe, FileText, Loader2, Trash2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai/knowledge")({
  component: KnowledgePage,
});

interface KbDoc {
  id: string;
  title: string;
  source_type: "website" | "pdf" | "text" | "social";
  source_url: string | null;
  status: "pending" | "processing" | "ready" | "failed";
  chunks_count: number;
  error_message: string | null;
  created_at: string;
}

const sourceIcons = { website: Globe, pdf: FileText, text: FileText, social: Globe } as const;

function KnowledgePage() {
  const { t } = useI18n();
  const { current } = useWorkspace();
  const [docs, setDocs] = useState<KbDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"url" | "text">("url");
  const [url, setUrl] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("kb_documents")
      .select("id, title, source_type, source_url, status, chunks_count, error_message, created_at")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false });
    if (data) setDocs(data as KbDoc[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [current?.id]);

  // Poll while processing
  useEffect(() => {
    const hasProcessing = docs.some((d) => d.status === "processing" || d.status === "pending");
    if (!hasProcessing) return;
    const i = setInterval(load, 3000);
    return () => clearInterval(i);
    // eslint-disable-next-line
  }, [docs]);

  const callFunction = async (name: string, body: unknown) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  const submitUrl = async () => {
    if (!current || !url.trim()) return;
    setLoading(true);
    try {
      await callFunction("scan-website", { workspaceId: current.id, url: url.trim() });
      toast.success("Skanimi nisi");
      setUrl("");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const submitText = async () => {
    if (!current || !textTitle.trim() || !textContent.trim()) return;
    setLoading(true);
    try {
      await callFunction("kb-ingest", {
        workspaceId: current.id,
        title: textTitle.trim(),
        content: textContent.trim(),
        sourceType: "text",
      });
      toast.success("Burimi u shtua");
      setTextTitle("");
      setTextContent("");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("kb_documents").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("U fshi"); load(); }
  };

  const statusBadge = (s: KbDoc["status"]) => {
    const map = {
      ready: { icon: CheckCircle2, label: t("ai.kb.status.ready"), cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
      processing: { icon: Loader2, label: t("ai.kb.status.processing"), cls: "border-cyan-500/30 bg-cyan-500/10 text-cyan-400 animate-pulse" },
      pending: { icon: Clock, label: t("ai.kb.status.pending"), cls: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
      failed: { icon: AlertCircle, label: t("ai.kb.status.failed"), cls: "border-red-500/30 bg-red-500/10 text-red-400" },
    } as const;
    const cfg = map[s];
    const Icon = cfg.icon;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] ${cfg.cls}`}>
        <Icon className={`h-3 w-3 ${s === "processing" ? "animate-spin" : ""}`} />
        {cfg.label}
      </span>
    );
  };

  return (
    <>
      <PageHeader
        title={t("ai.kb.title")}
        description={t("ai.kb.desc")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="h-4 w-4" /> {t("ai.kb.add")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("ai.kb.add")}</DialogTitle>
              </DialogHeader>
              <Tabs value={tab} onValueChange={(v) => setTab(v as "url" | "text")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">
                    <Globe className="mr-1.5 h-3.5 w-3.5" /> {t("ai.kb.scanUrl")}
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> {t("ai.kb.addText")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="url" className="space-y-3">
                  <Label htmlFor="url">URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder={t("ai.kb.url.placeholder")}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Website do të skanohet me Firecrawl (ose fallback) dhe do të shndërrohet në copëza për AI.
                  </p>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                    <Button variant="hero" onClick={submitUrl} disabled={loading || !url.trim()}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ai.kb.scanUrl")}
                    </Button>
                  </DialogFooter>
                </TabsContent>
                <TabsContent value="text" className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="ttitle">{t("ai.kb.text.title")}</Label>
                    <Input id="ttitle" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="tcontent">{t("ai.kb.text.content")}</Label>
                    <Textarea
                      id="tcontent"
                      rows={8}
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                    <Button variant="hero" onClick={submitText} disabled={loading || !textTitle.trim() || !textContent.trim()}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.create")}
                    </Button>
                  </DialogFooter>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        }
      />
      {docs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t("ai.kb.empty")}
          action={
            <Button variant="hero" onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4" /> {t("ai.kb.add")}
            </Button>
          }
        />
      ) : (
        <div className="p-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => {
              const Icon = sourceIcons[d.source_type];
              return (
                <div
                  key={d.id}
                  className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-[var(--transition-smooth)] hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase">{d.source_type}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => remove(d.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="line-clamp-2 text-sm font-medium">{d.title}</div>
                  {d.source_url && (
                    <a
                      href={d.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-1 text-xs text-muted-foreground hover:text-primary"
                    >
                      {d.source_url}
                    </a>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-2">
                    {statusBadge(d.status)}
                    {d.status === "ready" && (
                      <span className="text-[10px] text-muted-foreground">
                        {d.chunks_count} {t("ai.kb.chunks")}
                      </span>
                    )}
                  </div>
                  {d.status === "failed" && d.error_message && (
                    <p className="line-clamp-2 text-[10px] text-red-400">{d.error_message}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}