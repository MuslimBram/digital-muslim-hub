import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, KanbanSquare, Inbox, Headphones } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [counts, setCounts] = useState({ contacts: 0, deals: 0, conversations: 0, tickets: 0 });

  useEffect(() => {
    if (!current) return;
    const load = async () => {
      const [c, d, conv, tk] = await Promise.all([
        supabase.from("contacts").select("id", { count: "exact", head: true }).eq("workspace_id", current.id),
        supabase.from("deals").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).eq("status", "open"),
        supabase.from("conversations").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).eq("status", "open"),
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("workspace_id", current.id).neq("status", "closed"),
      ]);
      setCounts({
        contacts: c.count ?? 0,
        deals: d.count ?? 0,
        conversations: conv.count ?? 0,
        tickets: tk.count ?? 0,
      });
    };
    load();
  }, [current]);

  const kpis = [
    { label: t("dash.kpi.contacts"), value: counts.contacts, icon: Users, color: "from-indigo-500 to-violet-500" },
    { label: t("dash.kpi.deals"), value: counts.deals, icon: KanbanSquare, color: "from-cyan-500 to-blue-500" },
    { label: t("dash.kpi.conversations"), value: counts.conversations, icon: Inbox, color: "from-emerald-500 to-teal-500" },
    { label: t("dash.kpi.tickets"), value: counts.tickets, icon: Headphones, color: "from-amber-500 to-orange-500" },
  ];

  return (
    <>
      <PageHeader
        title={`${t("dash.welcome")}, ${user?.email?.split("@")[0] ?? ""} 👋`}
        description={current?.name}
      />
      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-[var(--transition-smooth)] hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${kpi.color} text-white`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div className="text-3xl font-bold tracking-tight">{kpi.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{kpi.label}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}