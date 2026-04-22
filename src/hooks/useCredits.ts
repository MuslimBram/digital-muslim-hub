import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useAuth } from "@/auth/AuthProvider";
import type { Database } from "@/integrations/supabase/types";

type Plan = Database["public"]["Tables"]["plans"]["Row"];
type CreditKind = "image_gen" | "image_upload" | "video_gen" | "video_upload" | "ai_reply";

interface Credits {
  imagesUsed: number;
  imagesLimit: number;
  videoSecondsUsed: number;
  videoSecondsLimit: number;
  aiRepliesUsed: number;
  aiRepliesLimit: number;
  unlimited: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  recordUsage: (kind: CreditKind, amount?: number) => Promise<{ ok: boolean; reason?: string; used?: number; limit?: number }>;
}

export function useCredits(): Credits {
  const { current } = useWorkspace();
  const { user } = useAuth();
  const [imagesUsed, setImagesUsed] = useState(0);
  const [videoSecondsUsed, setVideoSecondsUsed] = useState(0);
  const [aiRepliesUsed, setAiRepliesUsed] = useState(0);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [unlimited, setUnlimited] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!current || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: rows }, { data: roles }, { data: sub }] = await Promise.all([
      supabase
        .from("credit_usage")
        .select("kind, amount")
        .eq("workspace_id", current.id)
        .eq("usage_date", today),
      supabase.from("user_roles").select("role").eq("user_id", user.id),
      supabase
        .from("subscriptions")
        .select("plans(*)")
        .eq("workspace_id", current.id)
        .maybeSingle(),
    ]);
    let img = 0;
    let vid = 0;
    let ai = 0;
    for (const r of rows ?? []) {
      if (r.kind === "image_gen" || r.kind === "image_upload") img += r.amount;
      else if (r.kind === "video_gen" || r.kind === "video_upload") vid += r.amount;
      else if (r.kind === "ai_reply") ai += r.amount;
    }
    setImagesUsed(img);
    setVideoSecondsUsed(vid);
    setAiRepliesUsed(ai);
    setUnlimited(!!roles?.some((r) => r.role === "owner" || r.role === "admin"));
    setPlan((sub?.plans as Plan | null) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, user?.id]);

  const recordUsage = async (
    kind: CreditKind,
    amount = 1,
  ): Promise<{ ok: boolean; reason?: string; used?: number; limit?: number }> => {
    if (!current || !user) return { ok: false, reason: "no_workspace" };
    const { data, error } = await supabase.rpc("record_credit_usage", {
      _workspace_id: current.id,
      _kind: kind,
      _amount: amount,
    });
    if (error) return { ok: false, reason: error.message };
    const result = (data ?? {}) as { ok: boolean; reason?: string; used?: number; limit?: number };
    if (result.ok) {
      if (kind === "image_gen" || kind === "image_upload") setImagesUsed((n) => n + amount);
      else if (kind === "video_gen" || kind === "video_upload") setVideoSecondsUsed((n) => n + amount);
      else if (kind === "ai_reply") setAiRepliesUsed((n) => n + amount);
    }
    return result;
  };

  return {
    imagesUsed,
    imagesLimit: unlimited ? Infinity : plan?.daily_image_credits ?? 0,
    videoSecondsUsed,
    videoSecondsLimit: unlimited ? Infinity : plan?.daily_video_seconds ?? 0,
    aiRepliesUsed,
    aiRepliesLimit: unlimited ? Infinity : plan?.max_ai_replies_daily ?? 0,
    unlimited,
    loading,
    refresh: load,
    recordUsage,
  };
}