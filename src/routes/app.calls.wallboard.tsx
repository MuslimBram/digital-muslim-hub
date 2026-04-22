import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PhoneIncoming, PhoneMissed, PhoneCall, Headphones, Clock, Activity, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/app/calls/wallboard")({
  component: Wallboard,
});

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function Wallboard() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [snap, setSnap] = useState({
    waiting: 0,
    longestWait: 0,
    inProgress: 0,
    answeredToday: 0,
    missedToday: 0,
    avgHandle: 0,
    sla: 100,
    agentsAvailable: 0,
    agentsOnCall: 0,
  });
  const [topAgents, setTopAgents] = useState<{ email?: string; calls: number }[]>([]);
  const [now, setNow] = useState(new Date());

  const load = async () => {
    if (!current) return;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const [{ data: ringing }, { data: inProg }, { data: today }, { data: agents }] = await Promise.all([
      supabase.from("calls").select("started_at").eq("workspace_id", current.id).eq("status", "ringing"),
      supabase.from("calls").select("id").eq("workspace_id", current.id).in("status", ["answered", "on_hold"]),
      supabase
        .from("calls")
        .select("status, duration_seconds, wait_seconds, agent_id, profiles:agent_id(email)")
        .eq("workspace_id", current.id)
        .gte("started_at", dayStart.toISOString()),
      supabase.from("agent_status").select("status").eq("workspace_id", current.id).neq("status", "offline"),
    ]);

    const longest = ringing?.length
      ? Math.max(...ringing.map((c) => Math.floor((Date.now() - Date.parse(c.started_at)) / 1000)))
      : 0;
    const answered = today?.filter((c) => c.status === "ended" || c.status === "answered").length ?? 0;
    const missed = today?.filter((c) => c.status === "missed" || c.status === "voicemail").length ?? 0;
    const handled = today?.filter((c) => c.duration_seconds && c.duration_seconds > 0) ?? [];
    const avgHandle = handled.length ? Math.round(handled.reduce((a, c) => a + (c.duration_seconds ?? 0), 0) / handled.length) : 0;
    const slaHits = today?.filter((c) => (c.wait_seconds ?? 0) <= 30 && (c.status === "ended" || c.status === "answered")).length ?? 0;
    const sla = answered ? Math.round((slaHits / answered) * 100) : 100;

    // Top agents
    const agentMap: Record<string, { email?: string; calls: number }> = {};
    today?.forEach((c) => {
      if (!c.agent_id) return;
      const email = (c as { profiles?: { email?: string } }).profiles?.email;
      const key = c.agent_id;
      if (!agentMap[key]) agentMap[key] = { email, calls: 0 };
      agentMap[key].calls += 1;
    });
    setTopAgents(Object.values(agentMap).sort((a, b) => b.calls - a.calls).slice(0, 5));

    setSnap({
      waiting: ringing?.length ?? 0,
      longestWait: longest,
      inProgress: inProg?.length ?? 0,
      answeredToday: answered,
      missedToday: missed,
      avgHandle,
      sla,
      agentsAvailable: agents?.filter((a) => a.status === "available").length ?? 0,
      agentsOnCall: agents?.filter((a) => a.status === "on_call").length ?? 0,
    });
  };

  useEffect(() => {
    load();
    const ch = current
      ? supabase
          .channel("wallboard")
          .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `workspace_id=eq.${current.id}` }, load)
          .on("postgres_changes", { event: "*", schema: "public", table: "agent_status", filter: `workspace_id=eq.${current.id}` }, load)
          .subscribe()
      : null;
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => {
      clearInterval(t);
      void ch?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const tiles = [
    { label: t("calls.wb.waiting"), value: snap.waiting, icon: PhoneIncoming, color: "from-amber-500 to-orange-500", urgent: snap.waiting > 0 },
    { label: t("calls.wb.longest"), value: fmt(snap.longestWait), icon: Clock, color: "from-red-500 to-rose-500", urgent: snap.longestWait > 60 },
    { label: t("calls.wb.inProgress"), value: snap.inProgress, icon: PhoneCall, color: "from-blue-500 to-cyan-500" },
    { label: t("calls.wb.answered"), value: snap.answeredToday, icon: PhoneIncoming, color: "from-emerald-500 to-green-500" },
    { label: t("calls.wb.missed"), value: snap.missedToday, icon: PhoneMissed, color: "from-rose-500 to-pink-500" },
    { label: t("calls.wb.avgHandle"), value: fmt(snap.avgHandle), icon: Activity, color: "from-violet-500 to-purple-500" },
    { label: t("calls.wb.sla"), value: `${snap.sla}%`, icon: TrendingUp, color: snap.sla >= 80 ? "from-emerald-500 to-green-500" : "from-amber-500 to-red-500" },
    { label: t("calls.wb.agents"), value: `${snap.agentsAvailable}/${snap.agentsAvailable + snap.agentsOnCall}`, icon: Headphones, color: "from-indigo-500 to-blue-500" },
  ];

  return (
    <div className="min-h-full space-y-6 bg-gradient-to-br from-background via-background to-primary/5 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("calls.wb.title")}</h1>
          <p className="text-sm text-muted-foreground">{current?.name} · LIVE</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(142_76%_46%)] opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-[hsl(142_76%_46%)]" />
          </span>
          <span className="font-mono text-2xl">{now.toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {tiles.map((tile) => (
          <Card
            key={tile.label}
            className={`relative overflow-hidden border-0 p-6 ${tile.urgent ? "animate-pulse" : ""}`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br opacity-20 ${tile.color}`} />
            <div className="relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{tile.label}</span>
                <tile.icon className="h-5 w-5 text-foreground/70" />
              </div>
              <div className="text-5xl font-bold tracking-tight">{tile.value}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("calls.wb.topAgents")}
        </h2>
        {topAgents.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">{t("calls.wb.noData")}</div>
        ) : (
          <div className="space-y-2">
            {topAgents.map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {i + 1}
                </div>
                <div className="flex-1 truncate">{a.email ?? "Unknown"}</div>
                <Badge variant="secondary" className="font-mono">{a.calls} calls</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
