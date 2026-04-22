import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import {
  PLAN_DEFINITIONS,
  CYCLE_DISCOUNT,
  effectiveMonthly,
  totalForCycle,
  type BillingCycle,
} from "@/lib/plans";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Çmimet — Muslimi Digital" },
      { name: "description", content: "Plane fleksibël: Start €49, Growth €99, Professional €199, Enterprise €399. 7 ditë provë falas." },
    ],
  }),
});

const CYCLES: { key: BillingCycle; label: string; sub: string }[] = [
  { key: "monthly", label: "Mujore", sub: "" },
  { key: "quarterly", label: "3 Mujore", sub: "-5%" },
  { key: "semiannual", label: "6 Mujore", sub: "-10%" },
  { key: "annual", label: "Vjetore", sub: "-15%" },
];

function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PaymentTestModeBanner />
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Kthehu</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Link to="/auth/signup"><Button size="sm" variant="hero">Fillo provën</Button></Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-16 text-center">
        <Badge variant="secondary" className="mb-4">7 ditë provë falas</Badge>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          Çmime transparente, pa surpriza
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-muted-foreground">
          Zgjidh planin që përshtatet me biznesin tënd. Ndrysho ose anulo në çdo kohë. Sa më gjatë të paguash, aq më shumë kursen.
        </p>

        {/* Cycle toggle */}
        <div className="mx-auto mt-8 inline-flex flex-wrap items-center justify-center gap-1 rounded-full border border-border bg-card p-1">
          {CYCLES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCycle(c.key)}
              className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                cycle === c.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.label}
              {c.sub && (
                <span className={`ml-1 ${cycle === c.key ? "text-primary-foreground/80" : "text-emerald-500"}`}>
                  {c.sub}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLAN_DEFINITIONS.map((plan) => {
            const eff = effectiveMonthly(plan.monthly, cycle);
            const total = totalForCycle(plan.monthly, cycle);
            const saving = plan.monthly * 12 - eff * 12;
            return (
              <Card
                key={plan.tier}
                className={`relative flex flex-col overflow-hidden p-6 ${
                  plan.highlight ? "border-primary shadow-[var(--shadow-elegant)]" : ""
                }`}
              >
                {plan.badge && (
                  <div className="absolute right-4 top-4">
                    <Badge className="bg-primary text-primary-foreground">{plan.badge}</Badge>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight">€{eff.toFixed(0)}</span>
                    <span className="text-sm text-muted-foreground">/muaj</span>
                  </div>
                  {cycle !== "monthly" && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      €{total.toFixed(0)} faturuar tani
                      {CYCLE_DISCOUNT[cycle] > 0 && (
                        <span className="ml-1 text-emerald-500">
                          (kursim ~€{Math.round(saving / 12 * (cycle === "annual" ? 12 : cycle === "semiannual" ? 6 : 3))})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-5 space-y-2 border-t border-border pt-4">
                  <Limit label="Imazhe" value={plan.limits.images} />
                  <Limit label="Video" value={plan.limits.video} />
                  <Limit label="Kanale" value={plan.limits.channels} />
                  <Limit label="AI replies" value={plan.limits.aiReplies} />
                  <Limit label="Anëtarë ekipi" value={plan.limits.team} />
                  <Limit label="Biznese" value={plan.limits.businesses} />
                </div>

                <ul className="mt-5 flex-1 space-y-2 border-t border-border pt-4 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link to="/auth/signup" search={{ plan: plan.tier, cycle } as never} className="mt-6 block">
                  <Button className="w-full" variant={plan.highlight ? "hero" : "outline"}>
                    <Sparkles className="mr-2 h-4 w-4" /> Fillo provën 7-ditore
                  </Button>
                </Link>
              </Card>
            );
          })}
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Të gjitha çmimet në EUR pa TVSH. Provë 7-ditore në çdo plan. Pa nevojë për kartë krediti për provën.
        </p>
      </section>
    </div>
  );
}

function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}