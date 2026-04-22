import { Link } from "@tanstack/react-router";
import { Sparkles, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

export function TrialBanner() {
  const { subscription, unlimited, trialDaysLeft } = useSubscription();
  if (unlimited) return null;
  if (!subscription) return null;
  if (subscription.status !== "trialing") return null;

  const urgent = trialDaysLeft <= 2;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-xs ${
        urgent ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-primary/20 bg-primary/5 text-primary"
      }`}
    >
      <span className="flex items-center gap-2">
        {urgent ? <AlertTriangle className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        {trialDaysLeft > 0
          ? `Provë falas — ${trialDaysLeft} ditë të mbetura`
          : "Prova juaj ka skaduar"}
      </span>
      <Link to="/pricing" className="font-semibold underline">
        Zgjidh planin →
      </Link>
    </div>
  );
}