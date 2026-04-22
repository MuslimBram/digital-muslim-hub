import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, RefreshCw, Sparkles, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ENGINE_BY_KEY, type EngineKey, type EngineRunRow } from "@/lib/engines";

export const Route = createFileRoute("/app/ai/engines/$engine")({
  component: EngineDetail,
});

const SEVERITY_STYLES: Record<string, { icon: typeof Info; className: string; label: string }> = {
  positive: { icon: CheckCircle2, className: "text-emerald-500", label: "Pozitiv" },
  info:     { icon: Info,         className: "text-sky-500",     label: "Info" },
  warning:  { icon: AlertTriangle,className: "text-amber-500",   label: "Kujdes" },
  critical: { icon: AlertTriangle,className: "text-rose-500",    label: "Kritik" },
};

const IMPACT_STYLES: Record<string, string> = {
  high:   "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  medium: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  low:    "bg-muted text-muted-foreground",
};
const EFFORT_STYLES = IMPACT_STYLES;

function EngineDetail() {
  const { engine } = Route.useParams();
  const meta = ENGINE_BY_KEY[engine as EngineKey];
  const navigate = useNavigate();
  const { current } = useWorkspace();
  const [run, setRun] = useState<EngineRunRow | null>(null);
  const [history, setHistory] = useState<EngineRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!meta) navigate({ to: "/app/ai/engines" });
  }, [meta, navigate]);

  const load = async () => {
    if (!current || !meta) return;
    setLoading(true);
    const { data } = await supabase
      .from("engine_runs")
      .select("*")
      .eq("workspace_id", current.id)
      .eq("engine", meta.key)
      .order("created_at", { ascending: false })
      .limit(10);
    const rows = (data ?? []) as unknown as EngineRunRow[];
    setRun(rows.find((r) => r.status === "completed") ?? null);
    setHistory(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, meta?.key]);

  const refresh = async () => {
    if (!current || !meta) return;
    setRunning(true);
    toast.info(`Po analizon ${meta.name}...`);
    const { data, error } = await supabase.functions.invoke("run-engine", {
      body: { workspaceId: current.id, engine: meta.key },
    });
    setRunning(false);
    if (error) {
      toast.error(error.message ?? "Gabim");
      return;
    }
    const failed = (data?.results ?? []).find((r: { error?: string }) => r.error);
    if (failed) toast.error(failed.error ?? "Engine dështoi");
    else toast.success(`${meta.name} u përditësua!`);
    await load();
  };

  if (!meta) return null;
  const Icon = meta.icon;

  return (
    <div className="container py-8">
      <Button variant="ghost" size="sm" asChild className="mb-3 gap-2">
        <Link to="/app/ai/engines">
          <ArrowLeft className="h-3.5 w-3.5" /> Të gjitha engines
        </Link>
      </Button>

      <PageHeader
        title={meta.name}
        description={meta.description}
        actions={
          <Button onClick={refresh} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Rifresko
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !run ? (
        <Card className="mt-6">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className={`flex h-12 w-12 items-center justify-center rounded-full bg-muted ${meta.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium">Asnjë analizë akoma</p>
              <p className="text-sm text-muted-foreground">Kliko "Rifresko" për të nisur analizën e parë.</p>
            </div>
            <Button onClick={refresh} disabled={running} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Nis analizën
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Score</CardTitle>
              <CardDescription>Shëndeti aktual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-bold">{run.score ?? 0}<span className="text-2xl text-muted-foreground">/100</span></div>
              <Progress value={run.score ?? 0} className="mt-3 h-2" />
              <p className="mt-4 text-sm text-muted-foreground">{run.summary}</p>
              <Separator className="my-4" />
              <div className="space-y-1 text-xs text-muted-foreground">
                <div>Modeli: {run.model ?? "—"}</div>
                <div>Trigger: {run.triggered_by}</div>
                <div>Krijuar: {new Date(run.created_at).toLocaleString()}</div>
                {run.duration_ms != null && <div>Kohëzgjatja: {(run.duration_ms / 1000).toFixed(1)}s</div>}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Insights ({run.insights.length})</CardTitle>
                <CardDescription>Çfarë po ndodh në biznesin tënd</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {run.insights.map((it, i) => {
                  const sev = SEVERITY_STYLES[it.severity] ?? SEVERITY_STYLES.info;
                  const SIcon = sev.icon;
                  return (
                    <div key={i} className="flex gap-3 rounded-lg border border-border p-3">
                      <SIcon className={`mt-0.5 h-4 w-4 shrink-0 ${sev.className}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{it.title}</p>
                          <Badge variant="outline" className="text-[10px]">{sev.label}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{it.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Rekomandime ({run.recommendations.length})</CardTitle>
                <CardDescription>Veprime konkrete me ndikim/përpjekje</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {run.recommendations.map((rec, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{rec.title}</p>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className={IMPACT_STYLES[rec.impact]}>Ndikim: {rec.impact}</Badge>
                        <Badge variant="secondary" className={EFFORT_STYLES[rec.effort]}>Effort: {rec.effort}</Badge>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{rec.action}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {history.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Historiku</CardTitle>
                  <CardDescription>10 ekzekutimet e fundit</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={h.status === "completed" ? "secondary" : h.status === "failed" ? "destructive" : "outline"}>
                            {h.status}
                          </Badge>
                          <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {h.score != null && <span>Score: {h.score}</span>}
                          {h.error_message && <span className="max-w-[200px] truncate text-rose-500">{h.error_message}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}