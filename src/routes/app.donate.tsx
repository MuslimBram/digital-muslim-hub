import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, Sparkles, Loader2 } from "lucide-react";
import { z } from "zod";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/auth/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/donate")({
  component: DonatePage,
});

const PRESETS = [5, 10, 25, 50, 100];

const donationSchema = z.object({
  amount: z.number().min(1, "Minimumi €1").max(10000, "Maksimumi €10,000"),
  message: z.string().max(500).optional(),
});

function DonatePage() {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(10);
  const [custom, setCustom] = useState<string>("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  const handleDonate = async () => {
    const parsed = donationSchema.safeParse({ amount: finalAmount, message });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-create-order", {
        body: {
          amountCents: Math.round(finalAmount * 100),
          message: message.trim() || null,
          donorEmail: user?.email,
          returnUrl: `${window.location.origin}/app/donate?status=success`,
          cancelUrl: `${window.location.origin}/app/donate?status=cancel`,
        },
      });
      if (error || !data?.approveUrl) throw new Error(data?.error ?? "Gabim gjatë krijimit të porosisë");
      window.location.href = data.approveUrl;
    } catch (e: any) {
      toast.error(e.message ?? "Gabim");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Mbështet projektin"
        subtitle="Donacionet ndihmojnë në zhvillimin dhe mirëmbajtjen e platformës."
      />

      <div className="mx-auto max-w-2xl p-6">
        <Card className="p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60">
              <Heart className="h-6 w-6 text-primary-foreground" fill="currentColor" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Bëj një donacion</h2>
              <p className="text-sm text-muted-foreground">Pagesa e sigurt përmes PayPal</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="mb-2 block text-sm">Zgjidh shumën (EUR)</Label>
              <div className="grid grid-cols-5 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setAmount(p);
                      setCustom("");
                    }}
                    className={`rounded-lg border py-2.5 text-sm font-semibold transition-all ${
                      !custom && amount === p
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    €{p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="custom" className="mb-2 block text-sm">Ose shumë e personalizuar</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                <Input
                  id="custom"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="0"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="msg" className="mb-2 block text-sm">Mesazh (opsional)</Label>
              <Textarea
                id="msg"
                placeholder="Lër një mesazh mbështetjeje…"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="mt-1 text-xs text-muted-foreground">{message.length}/500</p>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Total</span>
                <span className="text-2xl font-bold">€{finalAmount || 0}</span>
              </div>
            </div>

            <Button onClick={handleDonate} disabled={loading || !finalAmount} size="lg" className="w-full" variant="hero">
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Po përgatitet…</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" />Vazhdo me PayPal</>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              🔒 Pagesa procesohet me siguri nga PayPal. Ne nuk ruajmë të dhëna karte.
            </p>
          </div>
        </Card>
      </div>
    </>
  );
}