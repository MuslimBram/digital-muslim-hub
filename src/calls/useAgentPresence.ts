import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import type { Database } from "@/integrations/supabase/types";

type Presence = Database["public"]["Enums"]["agent_presence"];

export function useAgentPresence() {
  const { user } = useAuth();
  const { current } = useWorkspace();

  useEffect(() => {
    if (!user || !current) return;
    let mounted = true;

    const ensure = async () => {
      const { data: existing } = await supabase
        .from("agent_status")
        .select("id, status")
        .eq("workspace_id", current.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      if (!existing) {
        await supabase.from("agent_status").insert({
          workspace_id: current.id,
          user_id: user.id,
          status: "available",
        });
      } else if (existing.status === "offline") {
        await supabase
          .from("agent_status")
          .update({ status: "available", since: new Date().toISOString() })
          .eq("id", existing.id);
      }
    };

    ensure();

    const interval = setInterval(() => {
      void supabase
        .from("agent_status")
        .update({ last_heartbeat: new Date().toISOString() })
        .eq("workspace_id", current.id)
        .eq("user_id", user.id);
    }, 20_000);

    const goOffline = () => {
      void supabase
        .from("agent_status")
        .update({ status: "offline", since: new Date().toISOString() })
        .eq("workspace_id", current.id)
        .eq("user_id", user.id);
    };
    window.addEventListener("beforeunload", goOffline);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener("beforeunload", goOffline);
    };
  }, [user?.id, current?.id]);

  const setStatus = async (status: Presence, reason?: string) => {
    if (!user || !current) return;
    await supabase
      .from("agent_status")
      .update({ status, reason: reason ?? null, since: new Date().toISOString() })
      .eq("workspace_id", current.id)
      .eq("user_id", user.id);
  };

  return { setStatus };
}
