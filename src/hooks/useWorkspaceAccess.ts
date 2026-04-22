import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";

interface AccessState {
  blocked: boolean;
  reason: string;
  loading: boolean;
}

export function useWorkspaceAccess(): AccessState {
  const { current } = useWorkspace();
  const [state, setState] = useState<AccessState>({ blocked: false, reason: "loading", loading: true });

  useEffect(() => {
    let cancelled = false;
    if (!current) {
      setState({ blocked: false, reason: "no_workspace", loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    supabase
      .rpc("workspace_access_state", { _workspace_id: current.id })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setState({ blocked: false, reason: "error", loading: false });
          return;
        }
        const obj = (data ?? {}) as { blocked?: boolean; reason?: string };
        setState({ blocked: !!obj.blocked, reason: obj.reason ?? "unknown", loading: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  return state;
}