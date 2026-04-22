import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Copy, Gift, TrendingUp, Users as UsersIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/referrals")({
  head: () => ({
    meta: [
      { title: "Earn 15% — Referral Program" },
      { name: "description", content: "Refer biznese të tjera dhe fito 15% nga gjithçka që ata harxhojnë — për gjithmonë." },
    ],
  }),
  component: ReferralsPage,
});

function ReferralsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<{ referral_code: string | null } | null>(null);
  const [refs, setRefs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_id", user.id).order("signup_at", { ascending: false }),
    ]).then(([p, r]) => {
      setProfile(p.data ?? null);
      setRefs(r.data ?? []);
      setLoading(false);
    });
  }, [user?.id]);

  const link = profile?.referral_code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${profile.referral_code}`
    : "";

  const totalCommission = refs.reduce((s, r) => s + (r.total_commission_cents ?? 0), 0);
  const activeRefs = refs.filter((r) => r.is_active).length;

  const copy = () => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Linku u kopjua");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-xl border bg-gradient-to-br from-primary/10 via-background to-background p-8">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Gift className="h-4 w-4" />Referral Program
        </div>
        <h1 className="mt-2 text-3xl font-bold">Earn 15% on every referral!</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Refer biznese të tjera dhe fito <b>15%</b> nga gjithçka që ata harxhojnë — <b>për gjithmonë</b>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat icon={UsersIcon} label="Total Referrals" value={refs.length} />
        <Stat icon={Sparkles} label="Aktivë" value={activeRefs} />
        <Stat icon={TrendingUp} label="Komisione" value={`€${(totalCommission / 100).toFixed(2)}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linku yt unik</CardTitle>
          <CardDescription>Ndaje këtë link. Kur dikush regjistrohet dhe paguan, ti fiton 15% nga çdo pagesë e tij.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input readOnly value={link || "Duke gjeneruar..."} className="font-mono text-xs" />
          <Button onClick={copy} disabled={!link}><Copy className="mr-2 h-4 w-4" />Kopjo</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Referrals e tua</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar…</p>}
          {!loading && refs.length === 0 && (
            <p className="text-sm text-muted-foreground">Ende nuk ke referrals. Ndaj linkun për të filluar të fitosh!</p>
          )}
          {refs.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded border p-3 text-sm">
              <div>
                <div className="font-mono text-xs">user:{String(r.referred_user_id).slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">
                  Signup: {new Date(r.signup_at).toLocaleDateString()}
                  {r.first_payment_at && ` · First payment: ${new Date(r.first_payment_at).toLocaleDateString()}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">€{((r.total_commission_cents ?? 0) / 100).toFixed(2)}</div>
                <Badge variant={r.is_active ? "default" : "secondary"} className="text-[10px]">{r.is_active ? "active" : "inactive"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}