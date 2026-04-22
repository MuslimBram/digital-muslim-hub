import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthProvider";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  plan: string;
}

interface WorkspaceContextValue {
  workspaces: Workspace[];
  current: Workspace | null;
  setCurrent: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
const STORAGE_KEY = "md_current_workspace";

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name, slug, owner_id, plan")
      .order("created_at", { ascending: true });
    if (!error && data) {
      setWorkspaces(data as Workspace[]);
      const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const valid = data.find((w) => w.id === stored);
      setCurrentId(valid?.id ?? data[0]?.id ?? null);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const setCurrent = (id: string) => {
    setCurrentId(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const current = workspaces.find((w) => w.id === currentId) ?? null;

  return (
    <WorkspaceContext.Provider value={{ workspaces, current, setCurrent, loading, refresh: load }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
}