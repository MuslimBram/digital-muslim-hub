import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Headphones, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { mockVoipProvider } from "@/calls/mockVoip";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/calls/")({
  component: CallsOverview,
});

interface CallRow {
  id: string;
  direction: string;
  from_number: string;
  to_number: string;
  status: string;
  duration_seconds: number | null;
  wait_seconds: number | null;
  started_at: string;
  agent_id: string | null;
}

function fmt(seconds: number | null) {
  if (!seconds) return "-";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function CallsOverview() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [stats, setStats] = useState({ total: 0, answered: 0, missed: 0, avgDuration: 0, avgWait: 0 });
  const [agentsOnline, setAgentsOnline] = useState(0);

  const load = async () => {
    if (!current) return;
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("calls")
      .select("id, direction, from_number, to_number, status, duration_seconds, wait_seconds, started_at, agent_id")
      .eq("workspace_id", current.id)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(50);
    if (data) {
      setCalls(data as CallRow[]);
      const answered = data.filter((c) => c.status === "answered" || c.status === "ended").length;
      const missed = data.filter((c) => c.status === "missed" || c.status === "voicemail").length;
      const dur = data.filter((c) => c.duration_seconds && c.duration_seconds > 0);
      const waits = data.filter((c) => c.wait_seconds && c.wait_seconds > 0);
      setStats({
        total: data.length,
        answered,
        missed,
        avgDuration: dur.length ? Math.round(dur.reduce((a, c) => a + (c.duration_seconds ?? 0), 0) / dur.length) : 0,
        avgWait: waits.length ? Math.round(waits.reduce((a, c) => a + (c.wait_seconds ?? 0), 0) / waits.length) : 0,
      });
    }

    const { data: agents } = await supabase
      .from("agent_status")
      .select("id, status")
      .eq("workspace_id", current.id)
      .neq("status", "offline");
    setAgentsOnline(agents?.length ?? 0);
  };

  useEffect(() => {
    load();
    if (!current) return;
    const ch = supabase
      .channel("calls-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `workspace_id=eq.${current.id}` }, load)
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const simulateInbound = async () => {
    if (!current) return;
    const numbers = ["+38344123456", "+38349987654", "+38345111222", "+38348333444"];
    await mockVoipProvider.simulateInbound({
      workspaceId: current.id,
      fromNumber: numbers[Math.floor(Math.random() * numbers.length)],
      toNumber: "+38344000000",
    });
    toast.success(t("calls.simulated"));
  };

  const kpis = [
    { label: t("calls.kpi.total"), value: stats.total, icon: Phone, color: "text-primary" },
    { label: t("calls.kpi.answered"), value: stats.answered, icon: PhoneIncoming, color: "text-[hsl(142_76%_46%)]" },
    { label: t("calls.kpi.missed"), value: stats.missed, icon: PhoneMissed, color: "text-destructive" },
    { label: t("calls.kpi.avgDuration"), value: fmt(stats.avgDuration), icon: Clock, color: "text-amber-500" },
    { label: t("calls.kpi.avgWait"), value: fmt(stats.avgWait), icon: Activity, color: "text-blue-500" },
    { label: t("calls.kpi.agentsOnline"), value: agentsOnline, icon: Headphones, color: "text-purple-500" },
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("calls.overview.title")}
        description={t("calls.overview.desc")}
        action={
          <Button onClick={simulateInbound} variant="outline">
            <PhoneIncoming className="mr-2 h-4 w-4" /> {t("calls.simulateInbound")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</span>
              <k.icon className={`h-4 w-4 ${k.color}`} />
            </div>
            <div className="text-2xl font-semibold">{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">{t("calls.recent")}</h3>
        </div>
        <div className="divide-y divide-border">
          {calls.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">{t("calls.empty")}</div>
          ) : (
            calls.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                  {c.direction === "inbound" ? (
                    <PhoneIncoming className="h-4 w-4 text-primary" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4 text-blue-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm">{c.direction === "inbound" ? c.from_number : c.to_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(c.started_at).toLocaleString()}
                  </div>
                </div>
                <Badge variant={c.status === "missed" ? "destructive" : c.status === "ringing" ? "default" : "secondary"}>
                  {c.status}
                </Badge>
                <div className="font-mono text-xs text-muted-foreground">{fmt(c.duration_seconds)}</div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
