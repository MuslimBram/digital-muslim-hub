import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useAuth } from "@/auth/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"] & {
  plans?: Database["public"]["Tables"]["plans"]["Row"] | null;
};

export function useSubscription() {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!current || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: sub }, { data: roles }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("workspace_id", current.id)
        .maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
    ]);
    setSubscription(sub as Subscription | null);
    setUnlimited(!!roles?.some((r) => r.role === "owner" || r.role === "admin"));
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!current) return;
    const ch = supabase
      .channel(`subs-${current.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subscriptions", filter: `workspace_id=eq.${current.id}` },
        load,
      )
      .subscribe();
    return () => {
      void ch.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, user?.id]);

  const isActive =
    unlimited ||
    (subscription?.status === "active" || subscription?.status === "trialing");
  const trialEnd = subscription?.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
  const trialDaysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;

  return { subscription, unlimited, isActive, trialDaysLeft, loading, refresh: load };
}