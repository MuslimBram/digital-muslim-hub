import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, Headphones, MessageSquare, PhoneOff, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";

export const Route = createFileRoute("/app/calls/supervisor")({
  component: SupervisorPage,
});

interface Agent {
  user_id: string;
  status: string;
  since: string;
  current_call_id: string | null;
  email?: string;
}
interface ActiveCall {
  id: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  agent_id: string | null;
  started_at: string;
  answered_at: string | null;
}

const statusColor: Record<string, string> = {
  available: "bg-[hsl(142_76%_46%)]",
  on_call: "bg-blue-500",
  busy: "bg-amber-500",
  away: "bg-muted",
  wrap_up: "bg-purple-500",
  offline: "bg-muted-foreground/30",
};

export function SupervisorPage() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [active, setActive] = useState<ActiveCall[]>([]);

  const load = async () => {
    if (!current) return;
    const [{ data: ag }, { data: ac }] = await Promise.all([
      supabase
        .from("agent_status")
        .select("user_id, status, since, current_call_id, profiles:user_id(email)")
        .eq("workspace_id", current.id)
        .order("since"),
      supabase
        .from("calls")
        .select("id, from_number, to_number, direction, status, agent_id, started_at, answered_at")
        .eq("workspace_id", current.id)
        .in("status", ["ringing", "answered", "on_hold"])
        .order("started_at", { ascending: false }),
    ]);
    if (ag) {
      setAgents(
        ag.map((a) => ({
          user_id: a.user_id,
          status: a.status,
          since: a.since,
          current_call_id: a.current_call_id,
          email: (a as { profiles?: { email?: string } }).profiles?.email,
        }))
      );
    }
    if (ac) setActive(ac as ActiveCall[]);
  };

  useEffect(() => {
    load();
    if (!current) return;
    const ch = supabase
      .channel("supervisor")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_status", filter: `workspace_id=eq.${current.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "calls", filter: `workspace_id=eq.${current.id}` }, load)
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const mockAction = (action: string) => toast.info(`${action} (mock — kërkon VoIP real)`);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("calls.sup.title")} description={t("calls.sup.desc")} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            {t("calls.sup.activeCalls")} <Badge variant="secondary" className="ml-2">{active.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {active.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">{t("calls.sup.noActive")}</div>
            ) : (
              active.map((c) => (
                <div key={c.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-sm">
                      {c.direction === "inbound" ? `${c.from_number} → IN` : `OUT → ${c.to_number}`}
                    </div>
                    <Badge variant={c.status === "ringing" ? "default" : "secondary"}>{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => mockAction("Listen")}>
                      <Eye className="mr-1 h-3 w-3" /> {t("calls.sup.listen")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => mockAction("Whisper")}>
                      <MessageSquare className="mr-1 h-3 w-3" /> {t("calls.sup.whisper")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => mockAction("Barge")}>
                      <Headphones className="mr-1 h-3 w-3" /> {t("calls.sup.barge")}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={async () => {
                      await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", c.id);
                      toast.success("Call ended");
                    }}>
                      <PhoneOff className="mr-1 h-3 w-3" /> End
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-border px-4 py-3 text-sm font-semibold">
            {t("calls.sup.agents")} <Badge variant="secondary" className="ml-2">{agents.length}</Badge>
          </div>
          <div className="divide-y divide-border">
            {agents.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">{t("calls.sup.noAgents")}</div>
            ) : (
              agents.map((a) => (
                <div key={a.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="relative">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {a.email?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-background ${statusColor[a.status] ?? "bg-muted"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{a.email ?? a.user_id.slice(0, 8)}</div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Activity className="h-2.5 w-2.5" />
                      {a.status} · {new Date(a.since).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
