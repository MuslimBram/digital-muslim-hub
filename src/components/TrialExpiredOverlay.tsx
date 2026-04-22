import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function TrialExpiredOverlay({ reason }: { reason: string }) {
  const isCanceled = reason === "canceled";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-md">
      <Card className="max-w-md space-y-5 border-primary/30 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">{isCanceled ? "Abonimi u anulua" : "Prova juaj ka skaduar"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {isCanceled
              ? "Aktivizo një plan për të rifituar qasjen në hapësirën tënde të punës."
              : "Zgjidh një plan për të vazhduar përdorimin e të gjitha veçorive. Të dhënat tua janë të ruajtura."}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/pricing">
            <Button className="w-full" variant="hero" size="lg">
              <Sparkles className="mr-2 h-4 w-4" /> Shiko planet
            </Button>
          </Link>
          <Link to="/app/settings/billing">
            <Button variant="outline" className="w-full" size="lg">
              <CreditCard className="mr-2 h-4 w-4" /> Menaxho faturimin
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Të dhënat tua mbeten të sigurta për 30 ditë pas anulimit.
        </p>
      </Card>
    </div>
  );
}