import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, KanbanSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/crm/pipeline")({
  component: PipelinePage,
});

interface Stage { id: string; name: string; position: number; color: string | null }
interface Deal { id: string; title: string; value: number | null; currency: string | null; stage_id: string }

function PipelinePage() {
  const { t } = useI18n();
  const { current } = useWorkspace();
  const [stages, setStages] = useState<Stage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelineId, setPipelineId] = useState<string | null>(null);

  useEffect(() => {
    if (!current) return;
    const load = async () => {
      const { data: pipes } = await supabase
        .from("pipelines")
        .select("id")
        .eq("workspace_id", current.id)
        .order("created_at", { ascending: true })
        .limit(1);
      const pid = pipes?.[0]?.id ?? null;
      setPipelineId(pid);
      if (!pid) return;
      const [stagesRes, dealsRes] = await Promise.all([
        supabase.from("pipeline_stages").select("id, name, position, color").eq("pipeline_id", pid).order("position"),
        supabase.from("deals").select("id, title, value, currency, stage_id").eq("pipeline_id", pid).eq("status", "open"),
      ]);
      if (stagesRes.data) setStages(stagesRes.data as Stage[]);
      if (dealsRes.data) setDeals(dealsRes.data as Deal[]);
    };
    load();
  }, [current]);

  const addDemoDeal = async (stageId: string) => {
    if (!current || !pipelineId) return;
    const { data } = await supabase.from("deals").insert({
      workspace_id: current.id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      title: "New Deal",
      value: 0,
    }).select().single();
    if (data) setDeals((d) => [...d, data as Deal]);
  };

  if (!pipelineId) {
    return (
      <>
        <PageHeader title={t("crm.pipeline.title")} />
        <EmptyState icon={KanbanSquare} title="No pipeline" description="Default pipeline missing." />
      </>
    );
  }

  return (
    <>
      <PageHeader title={t("crm.pipeline.title")} />
      <div className="overflow-x-auto p-6">
        <div className="flex gap-4">
          {stages.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage_id === stage.id);
            return (
              <div key={stage.id} className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-between border-b border-border p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: stage.color ?? "#4f46e5" }} />
                    <span className="text-sm font-semibold">{stage.name}</span>
                    <span className="text-xs text-muted-foreground">({stageDeals.length})</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => addDemoDeal(stage.id)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-col gap-2 p-2">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="rounded-lg border border-border bg-card p-3 shadow-sm transition-[var(--transition-smooth)] hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]">
                      <div className="text-sm font-medium">{deal.title}</div>
                      {deal.value != null && deal.value > 0 && (
                        <div className="mt-1 text-xs text-muted-foreground">
                          {deal.value} {deal.currency ?? "EUR"}
                        </div>
                      )}
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}