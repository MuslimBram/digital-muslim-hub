import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";

export type AppRole = "owner" | "admin" | "freelancer" | "business" | "partner" | "user";

export function useUserRole() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setRoles([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (cancelled) return;
        setRoles(((data ?? []) as { role: AppRole }[]).map((r) => r.role));
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  const hasRole = (r: AppRole) => roles.includes(r);
  const isOwner = hasRole("owner");
  const isAdmin = hasRole("admin");
  const isUnlimited = isOwner || isAdmin;

  return { roles, loading, hasRole, isOwner, isAdmin, isUnlimited };
}