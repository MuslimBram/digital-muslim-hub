import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Search, Users as UsersIcon, Building2, Briefcase, CreditCard, Activity, RefreshCw, AlertTriangle, Plug, ListTree } from "lucide-react";

export const Route = createFileRoute("/app/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel — Muslimi Digital" },
      { name: "description", content: "Panel administrimi: Users, Subscriptions, Health, Audit." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { isUnlimited, loading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isUnlimited) navigate({ to: "/app/dashboard" });
  }, [loading, isUnlimited, navigate]);

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Duke verifikuar lejet…</div>;
  if (!isUnlimited) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <div className="text-lg font-semibold">Vetëm për Owner / Admin</div>
        <p className="text-sm text-muted-foreground">Nuk ke leje për të hapur Admin Panel.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Menaxhimi i platformës: përdorues, abonime, shëndeti i sistemit dhe gjurmimi i aktivitetit.</p>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="flex-wrap">
          <TabsTrigger value="users"><UsersIcon className="mr-1 h-3.5 w-3.5" />Users</TabsTrigger>
          <TabsTrigger value="businesses"><Building2 className="mr-1 h-3.5 w-3.5" />Businesses</TabsTrigger>
          <TabsTrigger value="freelancers"><Briefcase className="mr-1 h-3.5 w-3.5" />Freelancers</TabsTrigger>
          <TabsTrigger value="partners">Partners</TabsTrigger>
          <TabsTrigger value="subscriptions"><CreditCard className="mr-1 h-3.5 w-3.5" />Subscriptions</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="health"><Activity className="mr-1 h-3.5 w-3.5" />Health</TabsTrigger>
          <TabsTrigger value="audit"><ListTree className="mr-1 h-3.5 w-3.5" />Audit</TabsTrigger>
          <TabsTrigger value="integrations"><Plug className="mr-1 h-3.5 w-3.5" />Integration Hub</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="pt-4"><UsersTab /></TabsContent>
        <TabsContent value="businesses" className="pt-4"><AccountTypeTab type="business" /></TabsContent>
        <TabsContent value="freelancers" className="pt-4"><AccountTypeTab type="freelancer" /></TabsContent>
        <TabsContent value="partners" className="pt-4"><AccountTypeTab type="ambassador" /></TabsContent>
        <TabsContent value="subscriptions" className="pt-4"><SubscriptionsTab /></TabsContent>
        <TabsContent value="commissions" className="pt-4"><CommissionsTab /></TabsContent>
        <TabsContent value="health" className="pt-4"><HealthTab /></TabsContent>
        <TabsContent value="audit" className="pt-4"><AuditTab /></TabsContent>
        <TabsContent value="integrations" className="pt-4"><IntegrationsHubTab /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ========== TABS ========== */

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, account_type, company_name, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setRows(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter((r) =>
    !q || r.email?.toLowerCase().includes(q.toLowerCase()) || r.full_name?.toLowerCase().includes(q.toLowerCase())
  ), [rows, q]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Të gjithë përdoruesit</CardTitle>
          <CardDescription>{rows.length} llogari</CardDescription>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Kërko..." className="w-64 pl-8" />
          </div>
          <Button size="icon" variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Duke ngarkuar…</p> : (
          <div className="space-y-1">
            {filtered.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.full_name ?? "—"}</div>
                  <div className="truncate text-xs text-muted-foreground">{r.email}</div>
                </div>
                <Badge variant="outline" className="capitalize">{r.account_type}</Badge>
                <span className="ml-3 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">Asnjë rezultat.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccountTypeTab({ type }: { type: "business" | "freelancer" | "ambassador" }) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id, email, full_name, company_name, created_at").eq("account_type", type).order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, [type]);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base capitalize">{type === "ambassador" ? "Partners (Ambassadors)" : `${type}s`}</CardTitle><CardDescription>{rows.length} llogari</CardDescription></CardHeader>
      <CardContent className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div><div className="font-medium">{r.full_name ?? r.company_name ?? "—"}</div><div className="text-xs text-muted-foreground">{r.email}</div></div>
            <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Asnjë.</p>}
      </CardContent>
    </Card>
  );
}

function SubscriptionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("subscriptions").select("id, status, account_type, billing_cycle, trial_ends_at, current_period_end, workspace_id, created_at").order("created_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Subscriptions</CardTitle><CardDescription>{rows.length} aktive/të gjitha</CardDescription></CardHeader>
      <CardContent className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div>
              <div className="font-medium capitalize">{r.account_type} · {r.billing_cycle}</div>
              <div className="text-xs text-muted-foreground font-mono">ws:{String(r.workspace_id).slice(0, 8)}</div>
            </div>
            <Badge variant={r.status === "active" ? "default" : r.status === "trialing" ? "secondary" : "destructive"}>{r.status}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CommissionsTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("referrals").select("id, referrer_id, referred_user_id, total_commission_cents, is_active, signup_at, first_payment_at").order("signup_at", { ascending: false }).limit(200).then(({ data }) => setRows(data ?? []));
  }, []);
  const total = rows.reduce((s, r) => s + (r.total_commission_cents ?? 0), 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Commissions (Referrals)</CardTitle>
        <CardDescription>Total: €{(total / 100).toFixed(2)} · {rows.length} referrals</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div>
              <div className="font-mono text-xs">ref:{String(r.referrer_id).slice(0, 8)} → user:{String(r.referred_user_id).slice(0, 8)}</div>
              <div className="text-xs text-muted-foreground">Signup: {new Date(r.signup_at).toLocaleDateString()}{r.first_payment_at ? ` · Paid: ${new Date(r.first_payment_at).toLocaleDateString()}` : ""}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">€{((r.total_commission_cents ?? 0) / 100).toFixed(2)}</div>
              <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "active" : "inactive"}</Badge>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Asnjë referral.</p>}
      </CardContent>
    </Card>
  );
}

function HealthTab() {
  const [stats, setStats] = useState<{ users: number; workspaces: number; subs: number; engineRuns: number; conv: number }>({ users: 0, workspaces: 0, subs: 0, engineRuns: 0, conv: 0 });
  useEffect(() => {
    Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("workspaces").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("engine_runs").select("id", { count: "exact", head: true }),
      supabase.from("conversations").select("id", { count: "exact", head: true }),
    ]).then(([a, b, c, d, e]) => setStats({
      users: a.count ?? 0, workspaces: b.count ?? 0, subs: c.count ?? 0, engineRuns: d.count ?? 0, conv: e.count ?? 0,
    }));
  }, []);
  const items = [
    { label: "Total Users", value: stats.users },
    { label: "Workspaces", value: stats.workspaces },
    { label: "Subscriptions", value: stats.subs },
    { label: "Engine Runs", value: stats.engineRuns },
    { label: "Conversations", value: stats.conv },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((i) => (
        <Card key={i.label}>
          <CardContent className="py-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{i.label}</div>
            <div className="mt-1 text-2xl font-semibold">{i.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("integration_events").select("id, event_type, source, created_at, payload").order("created_at", { ascending: false }).limit(50).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Audit Logs (50 të fundit)</CardTitle></CardHeader>
      <CardContent className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="rounded border p-3 text-sm">
            <div className="flex items-center justify-between">
              <div className="font-medium">{r.event_type}</div>
              <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
            </div>
            {r.source && <div className="text-xs text-muted-foreground">source: {r.source}</div>}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><AlertTriangle className="h-4 w-4" />Pa eventë të regjistruar ende.</div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrationsHubTab() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("workspace_integrations").select("id, type, display_name, status, workspace_id, created_at").order("created_at", { ascending: false }).limit(100).then(({ data }) => setRows(data ?? []));
  }, []);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Integration Hub</CardTitle>
        <CardDescription>Të gjitha integrimet e workspace-eve në platformë.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
            <div>
              <div className="font-medium">{r.display_name}</div>
              <div className="text-xs text-muted-foreground">{r.type} · ws:{String(r.workspace_id).slice(0, 8)}</div>
            </div>
            <Badge variant={r.status === "active" ? "default" : "secondary"}>{r.status}</Badge>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Pa integrime ende.</p>}
      </CardContent>
    </Card>
  );
}