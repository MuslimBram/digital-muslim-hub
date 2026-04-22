import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { ENGINES, ENGINE_BY_KEY, type EngineKey, type EngineRunRow } from "@/lib/engines";

export const Route = createFileRoute("/app/ai/engines/")({
  component: EnginesHub,
});

function scoreColor(score: number | null) {
  if (score == null) return "bg-muted text-muted-foreground";
  if (score >= 75) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 dark:text-amber-400";
  return "bg-rose-500/15 text-rose-600 dark:text-rose-400";
}

function EnginesHub() {
  const { current } = useWorkspace();
  const [latest, setLatest] = useState<Record<EngineKey, EngineRunRow | null>>(
    () => Object.fromEntries(ENGINES.map((e) => [e.key, null])) as Record<EngineKey, EngineRunRow | null>,
  );
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("engine_runs")
      .select("*")
      .eq("workspace_id", current.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200);
    const next: Record<EngineKey, EngineRunRow | null> = Object.fromEntries(
      ENGINES.map((e) => [e.key, null]),
    ) as Record<EngineKey, EngineRunRow | null>;
    for (const row of (data ?? []) as unknown as EngineRunRow[]) {
      if (!next[row.engine]) next[row.engine] = row;
    }
    setLatest(next);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const refreshAll = async () => {
    if (!current) return;
    setRunning(true);
    toast.info("Po nisin 9 engines... mund të zgjasë 1-2 minuta.");
    const { data, error } = await supabase.functions.invoke("run-engine", {
      body: { workspaceId: current.id, all: true },
    });
    setRunning(false);
    if (error) {
      toast.error(error.message ?? "Gabim gjatë ekzekutimit");
      return;
    }
    const failed = (data?.results ?? []).filter((r: { error?: string }) => r.error).length;
    if (failed > 0) toast.warning(`${9 - failed}/9 engines u ekzekutuan me sukses.`);
    else toast.success("Të 9 engines u ekzekutuan me sukses!");
    await load();
  };

  return (
    <div className="container py-8">
      <PageHeader
        title="AI Engines"
        description="9 engines që analizojnë biznesin tënd në kohë reale"
        actions={
          <Button onClick={refreshAll} disabled={running || !current} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Përditëso të gjitha
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENGINES.map((meta) => {
            const row = latest[meta.key];
            const Icon = meta.icon;
            return (
              <Link
                key={meta.key}
                to="/app/ai/engines/$engine"
                params={{ engine: meta.key }}
                className="block transition-transform hover:-translate-y-0.5"
              >
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted ${meta.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      {row?.score != null && (
                        <Badge variant="secondary" className={scoreColor(row.score)}>
                          {row.score}/100
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="mt-3 text-lg">{meta.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{meta.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {row ? (
                      <>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {row.summary ?? "Analiza është gati."}
                        </p>
                        <Progress value={row.score ?? 0} className="mt-3 h-1.5" />
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{(row.recommendations ?? []).length} rekomandime</span>
                          <span>{new Date(row.created_at).toLocaleDateString()}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sparkles className="h-3.5 w-3.5" />
                        Asnjë analizë akoma — kliko "Përditëso të gjitha".
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!loading && Object.values(latest).every((v) => v === null) && (
        <div className="mt-6 text-center text-sm text-muted-foreground">
          Asnjë engine nuk është ekzekutuar akoma. Hapi i parë: kliko butonin lart për të analizuar workspace-in.
        </div>
      )}
      <p className="mt-8 text-xs text-muted-foreground">
        Të dhënat: {ENGINE_BY_KEY.growth.name} dhe të tjerët analizojnë subscription, wallet, CRM, calls dhe inbox.
      </p>
    </div>
  );
}