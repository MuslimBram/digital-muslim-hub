// Manage workspace integrations: create / update / rotate / delete.
// All credential payloads are encrypted with AES-256-GCM before persisting.

import { getAdminClient, getUserClient } from "../_shared/supabase.ts";
import { encryptJson, randomSecret } from "../_shared/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface UpsertBody {
  action: "upsert";
  workspace_id: string;
  integration_id?: string;
  type: string;
  display_name: string;
  credentials: Record<string, unknown>; // raw secrets — encrypted before insert
  config?: Record<string, unknown>;
}
interface DeleteBody {
  action: "delete";
  integration_id: string;
}
interface RotateBody {
  action: "rotate_inbound_secret";
  integration_id: string;
}

type Body = UpsertBody | DeleteBody | RotateBody;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = getUserClient(auth);
    const { data: userData } = await userClient.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json()) as Body;
    const admin = getAdminClient();

    if (body.action === "upsert") {
      // Verify role
      const { data: roleRow } = await admin
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", userId)
        .maybeSingle();
      const { data: platRoles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const isPlatformAdmin = (platRoles ?? []).some((r) => r.role === "owner" || r.role === "admin");
      const role = roleRow?.role;
      if (!isPlatformAdmin && role !== "owner" && role !== "admin") {
        return json({ error: "Forbidden" }, 403);
      }

      const enc = await encryptJson(body.credentials ?? {});
      const inboundSecret = randomSecret(24);

      if (body.integration_id) {
        const { data, error } = await admin
          .from("workspace_integrations")
          .update({
            display_name: body.display_name,
            credentials_ciphertext: enc.ciphertext,
            credentials_iv: enc.iv,
            credentials_tag: enc.tag,
            config: body.config ?? {},
            status: "active",
            error_message: null,
          })
          .eq("id", body.integration_id)
          .eq("workspace_id", body.workspace_id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ integration: data });
      }

      const { data, error } = await admin
        .from("workspace_integrations")
        .insert({
          workspace_id: body.workspace_id,
          type: body.type,
          display_name: body.display_name,
          credentials_ciphertext: enc.ciphertext,
          credentials_iv: enc.iv,
          credentials_tag: enc.tag,
          config: body.config ?? {},
          inbound_secret: inboundSecret,
          status: "active",
          created_by: userId,
        })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ integration: data });
    }

    if (body.action === "rotate_inbound_secret") {
      const newSecret = randomSecret(24);
      const { data, error } = await admin
        .from("workspace_integrations")
        .update({ inbound_secret: newSecret })
        .eq("id", body.integration_id)
        .select("id, inbound_secret, workspace_id")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ integration: data });
    }

    if (body.action === "delete") {
      const { error } = await admin
        .from("workspace_integrations")
        .delete()
        .eq("id", body.integration_id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("integrations-manage", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}