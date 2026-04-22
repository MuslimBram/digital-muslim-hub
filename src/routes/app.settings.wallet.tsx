import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Wallet as WalletIcon, Copy, Users, TrendingUp, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SecurityCodeDialog } from "@/components/SecurityCodeDialog";
import { useWallet } from "@/hooks/useWallet";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings/wallet")({
  component: WalletPage,
});

function WalletPage() {
  const { wallet, transactions, referrals, referralCode, loading } = useWallet();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
  const referralLink = referralCode
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/auth/signup?ref=${referralCode}`
    : "";

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} u kopjua`);
  };

  const handleWithdraw = () => {
    toast.info("Kërkesa për tërheqje u dërgua. Do procesohet brenda 5 ditëve të punës.");
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Wallet & Referime" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Wallet & Referime" description="Bilanci yt nga komisionet e referimit (15% për çdo blerje)." />
      <div className="grid gap-4 p-6 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Bilanci aktual</p>
              <p className="mt-1 text-4xl font-bold tracking-tight">{eur(wallet?.balance_cents ?? 0)}</p>
            </div>
            <WalletIcon className="h-10 w-10 text-primary/50" />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Total fituar</p>
              <p className="font-semibold">{eur(wallet?.total_earned_cents ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total tërhequr</p>
              <p className="font-semibold">{eur(wallet?.total_withdrawn_cents ?? 0)}</p>
            </div>
          </div>
          <Button
            className="mt-6"
            disabled={(wallet?.balance_cents ?? 0) < 1000}
            onClick={() => setConfirmOpen(true)}
          >
            Tërhiq fonde (min €10)
          </Button>
        </Card>

        <Card className="p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Linku yt i referimit
          </div>
          {referralCode ? (
            <>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                  <code className="flex-1 truncate text-xs">{referralCode}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(referralCode, "Kodi")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
                  <code className="flex-1 truncate text-[10px]">{referralLink}</code>
                  <Button size="sm" variant="ghost" onClick={() => copy(referralLink, "Linku")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Fito 15% nga çdo blerje që bën biznesi i referuar.
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Po gjenerohet…</p>
          )}
        </Card>
      </div>

      <div className="grid gap-4 px-6 pb-8 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Users className="h-4 w-4 text-primary" /> Referimet ({referrals.length})
          </h3>
          {referrals.length === 0 ? (
            <p className="text-xs text-muted-foreground">Asnjë referim ende. Ndaj linkun tënd!</p>
          ) : (
            <ul className="space-y-2">
              {referrals.slice(0, 8).map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">User {r.referred_user_id.slice(0, 8)}</p>
                    <p className="text-muted-foreground">{new Date(r.signup_at).toLocaleDateString("sq-AL")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{eur(r.total_commission_cents)}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[9px]">
                      {r.first_payment_at ? "Aktiv" : "Pa pagesë"}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" /> Transaksionet e fundit
          </h3>
          {transactions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Asnjë transaksion ende.</p>
          ) : (
            <ul className="space-y-2">
              {transactions.slice(0, 8).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2 text-xs">
                  <div>
                    <p className="font-medium">{tx.description ?? tx.tx_type}</p>
                    <p className="text-muted-foreground">{new Date(tx.created_at).toLocaleString("sq-AL")}</p>
                  </div>
                  <span className={`font-semibold ${tx.amount_cents >= 0 ? "text-success" : "text-destructive"}`}>
                    {tx.amount_cents >= 0 ? "+" : ""}{eur(tx.amount_cents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SecurityCodeDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmo tërheqjen"
        description="Vendos kodin e sigurisë për të kërkuar tërheqjen e fondeve."
        onConfirmed={handleWithdraw}
      />
    </>
  );
}