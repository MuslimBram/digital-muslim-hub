import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Sparkles, ExternalLink, AlertTriangle, CheckCircle2, Calendar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditMeter } from "@/components/CreditMeter";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth } from "@/auth/AuthProvider";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { supabase } from "@/integrations/supabase/client";
import { PLAN_DEFINITIONS, CYCLE_DISCOUNT, effectiveMonthly, type BillingCycle } from "@/lib/plans";
import { PLAN_PRICE_IDS } from "@/lib/paddle";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings/billing")({
  component: BillingPage,
});

const STATUS_LABEL: Record<string, { label: string; tone: "default" | "warning" | "destructive" | "success" }> = {
  trialing: { label: "Provë aktive", tone: "warning" },
  active: { label: "Aktiv", tone: "success" },
  past_due: { label: "Pagesa dështoi", tone: "destructive" },
  canceled: { label: "Anuluar", tone: "destructive" },
  paused: { label: "I pauzuar", tone: "warning" },
};

function BillingPage() {
  const { subscription, unlimited, isActive, trialDaysLeft, loading, refresh } = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const { user } = useAuth();
  const { current } = useWorkspace();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Pagesa u realizua me sukses! Po përditësohet abonimi…");
      const t = setTimeout(() => refresh(), 2000);
      return () => clearTimeout(t);
    }
  }, [refresh]);

  const currentTier = (subscription?.plans as any)?.tier as keyof typeof PLAN_PRICE_IDS | undefined;
  const currentPlanDef = PLAN_DEFINITIONS.find((p) => p.tier === currentTier);

  const handleUpgrade = async (tier: keyof typeof PLAN_PRICE_IDS) => {
    if (!user || !current) return;
    const priceId = PLAN_PRICE_IDS[tier][cycle];
    await openCheckout({
      priceId,
      customerEmail: user.email ?? undefined,
      userId: user.id,
      workspaceId: current.id,
      successUrl: `${window.location.origin}/app/settings/billing?checkout=success`,
    });
  };

  const openPortal = async () => {
    if (!current) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-portal", {
        body: { workspaceId: current.id },
      });
      if (error || !data?.url) throw new Error("Nuk u hap portali");
      window.open(data.url, "_blank");
    } catch (e: any) {
      toast.error(e.message ?? "Gabim gjatë hapjes së portalit");
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Faturimi" />
        <div className="grid gap-4 p-6 md:grid-cols-3">
          <Card className="h-40 animate-pulse bg-muted/30 md:col-span-2" />
          <Card className="h-40 animate-pulse bg-muted/30" />
        </div>
      </>
    );
  }

  if (unlimited) {
    return (
      <>
        <PageHeader title="Faturimi" description="Llogaria juaj ka qasje të pakufizuar." />
        <div className="grid gap-4 p-6">
          <Card className="border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Owner / Admin — Pa limite</h3>
                <p className="text-sm text-muted-foreground">Të gjitha veçoritë janë aktive pa kufizim.</p>
              </div>
            </div>
          </Card>
        </div>
      </>
    );
  }

  const status = subscription?.status ?? "trialing";
  const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL.trialing;
  const periodEnd = subscription?.current_period_end ?? subscription?.trial_ends_at;

  return (
    <>
      <PageHeader
        title="Faturimi & Plani"
        description="Menaxho abonimin, kreditë dhe faturat tua."
        actions={
          <Link to="/pricing">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-3.5 w-3.5" /> Shiko të gjitha planet
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 p-6 lg:grid-cols-3">
        {/* Current plan */}
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{currentPlanDef?.name ?? "Plani"}</h3>
                <Badge
                  variant={statusInfo.tone === "destructive" ? "destructive" : "secondary"}
                  className={
                    statusInfo.tone === "success"
                      ? "bg-success/15 text-success"
                      : statusInfo.tone === "warning"
                      ? "bg-warning/15 text-warning-foreground"
                      : ""
                  }
                >
                  {statusInfo.label}
                </Badge>
              </div>
              {currentPlanDef && (
                <p className="mt-1 text-2xl font-bold tracking-tight">€{currentPlanDef.monthly}<span className="text-sm font-normal text-muted-foreground">/muaj</span></p>
              )}
            </div>
            <CreditCard className="h-8 w-8 text-muted-foreground/50" />
          </div>

          {status === "trialing" && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0" />
              <span>
                <strong>{trialDaysLeft} ditë</strong> të mbetura nga prova. Aktivizo abonimin për të shmangur ndërprerjen.
              </span>
            </div>
          )}

          {periodEnd && status === "active" && (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Rinovohet më {new Date(periodEnd).toLocaleDateString("sq-AL")}</span>
            </div>
          )}

          {subscription?.cancel_at_period_end && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Abonimi do të anulohet në fund të periudhës.</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {subscription?.paddle_customer_id && (
              <Button onClick={openPortal} disabled={portalLoading} variant="outline" size="sm">
                {portalLoading ? "Po hapet…" : "Menaxho abonimin"}
              </Button>
            )}
            {!isActive && (
              <Link to="/pricing">
                <Button size="sm" variant="hero">
                  <Sparkles className="mr-2 h-3.5 w-3.5" /> Rifillo abonimin
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Credits */}
        <CreditMeter />
      </div>

      {/* Upgrade options */}
      <div className="px-6 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Ndrysho planin</h3>
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card p-1">
            {(["monthly", "quarterly", "semiannual", "annual"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c === "monthly" ? "Mujor" : c === "quarterly" ? "3 mujor" : c === "semiannual" ? "6 mujor" : "Vjetor"}
                {CYCLE_DISCOUNT[c] > 0 && <span className="ml-1 text-[10px] opacity-80">-{CYCLE_DISCOUNT[c] * 100}%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => {
            const eff = effectiveMonthly(plan.monthly, cycle);
            const isCurrent = currentTier === plan.tier && isActive;
            return (
              <Card key={plan.tier} className={`flex flex-col p-4 ${plan.highlight ? "border-primary/40" : ""} ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">{plan.name}</h4>
                  {isCurrent && <Badge variant="secondary" className="bg-primary/15 text-primary"><CheckCircle2 className="mr-1 h-3 w-3" />Aktual</Badge>}
                </div>
                <p className="mt-2 text-2xl font-bold">€{eff.toFixed(0)}<span className="text-xs font-normal text-muted-foreground">/muaj</span></p>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                  <li>{plan.limits.images}</li>
                  <li>{plan.limits.video}</li>
                  <li>{plan.limits.team}</li>
                </ul>
                <Button
                  className="mt-4"
                  size="sm"
                  variant={isCurrent ? "outline" : plan.highlight ? "hero" : "default"}
                  disabled={isCurrent || checkoutLoading}
                  onClick={() => handleUpgrade(plan.tier)}
                >
                  {isCurrent ? "Plani juaj" : checkoutLoading ? "…" : "Zgjidh"}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}