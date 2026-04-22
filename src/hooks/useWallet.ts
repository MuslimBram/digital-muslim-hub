import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type Wallet = Database["public"]["Tables"]["wallets"]["Row"];
type Tx = Database["public"]["Tables"]["wallet_transactions"]["Row"];
type Referral = Database["public"]["Tables"]["referrals"]["Row"];

export function useWallet() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Tx[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: w }, { data: refs }, { data: profile }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("referrals").select("*").eq("referrer_id", user.id).order("signup_at", { ascending: false }),
      supabase.from("profiles").select("referral_code").eq("id", user.id).maybeSingle(),
    ]);
    setWallet((w as Wallet | null) ?? null);
    setReferrals((refs as Referral[]) ?? []);
    setReferralCode(profile?.referral_code ?? null);

    if (w?.id) {
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("wallet_id", w.id)
        .order("created_at", { ascending: false })
        .limit(50);
      setTransactions((txs as Tx[]) ?? []);
    } else {
      setTransactions([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return { wallet, transactions, referrals, referralCode, loading, refresh: load };
}