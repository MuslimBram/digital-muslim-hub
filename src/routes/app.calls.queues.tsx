import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Clock, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/calls/queues")({
  component: QueuesPage,
});

type Queue = Database["public"]["Tables"]["call_queues"]["Row"];
type Strategy = Database["public"]["Enums"]["queue_strategy"];

function QueuesPage() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [queues, setQueues] = useState<Queue[]>([]);
  const [waiting, setWaiting] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; strategy: Strategy; sla: number; ringSec: number }>({
    name: "",
    strategy: "round_robin",
    sla: 30,
    ringSec: 20,
  });

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("call_queues")
      .select("*")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: true });
    if (data) setQueues(data as Queue[]);

    const { data: waitingCalls } = await supabase
      .from("calls")
      .select("queue_id")
      .eq("workspace_id", current.id)
      .eq("status", "ringing")
      .not("queue_id", "is", null);
    const counts: Record<string, number> = {};
    waitingCalls?.forEach((c) => {
      if (c.queue_id) counts[c.queue_id] = (counts[c.queue_id] ?? 0) + 1;
    });
    setWaiting(counts);
  };

  useEffect(() => {
    load();
    if (!current) return;
    const ch = supabase
      .channel("queues-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `workspace_id=eq.${current.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "call_queues", filter: `workspace_id=eq.${current.id}` }, load)
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const create = async () => {
    if (!current || !form.name.trim()) return;
    const { error } = await supabase.from("call_queues").insert({
      workspace_id: current.id,
      name: form.name.trim(),
      strategy: form.strategy,
      sla_seconds: form.sla,
      ringing_seconds: form.ringSec,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("calls.queues.created"));
    setOpen(false);
    setForm({ name: "", strategy: "round_robin", sla: 30, ringSec: 20 });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.delete") + "?")) return;
    await supabase.from("call_queues").delete().eq("id", id);
    load();
  };

  const strategyLabel = (s: Strategy) =>
    s === "round_robin" ? t("calls.strategy.round_robin") : s === "longest_idle" ? t("calls.strategy.longest_idle") : t("calls.strategy.skills_based");

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("calls.queues.title")}
        description={t("calls.queues.desc")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t("calls.queues.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("calls.queues.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>{t("calls.queues.name")}</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sales / Support / VIP" />
                </div>
                <div className="space-y-2">
                  <Label>{t("calls.queues.strategy")}</Label>
                  <Select value={form.strategy} onValueChange={(v) => setForm({ ...form, strategy: v as Strategy })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round_robin">{t("calls.strategy.round_robin")}</SelectItem>
                      <SelectItem value="longest_idle">{t("calls.strategy.longest_idle")}</SelectItem>
                      <SelectItem value="skills_based">{t("calls.strategy.skills_based")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("calls.queues.sla")} (s)</Label>
                    <Input type="number" value={form.sla} onChange={(e) => setForm({ ...form, sla: parseInt(e.target.value) || 30 })} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("calls.queues.ring")} (s)</Label>
                    <Input type="number" value={form.ringSec} onChange={(e) => setForm({ ...form, ringSec: parseInt(e.target.value) || 20 })} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button onClick={create}>{t("common.create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {queues.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-sm text-muted-foreground">
            {t("calls.queues.empty")}
          </Card>
        ) : (
          queues.map((q) => (
            <Card key={q.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{q.name}</h3>
                  <Badge variant="secondary" className="mt-1 text-[10px]">{strategyLabel(q.strategy)}</Badge>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(q.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                  </div>
                  <div className="text-lg font-semibold">{waiting[q.id] ?? 0}</div>
                  <div className="text-[10px] text-muted-foreground">{t("calls.queues.waiting")}</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                  </div>
                  <div className="text-lg font-semibold">{q.sla_seconds}s</div>
                  <div className="text-[10px] text-muted-foreground">SLA</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Target className="h-3 w-3" />
                  </div>
                  <div className="text-lg font-semibold">{q.ringing_seconds}s</div>
                  <div className="text-[10px] text-muted-foreground">Ring</div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
