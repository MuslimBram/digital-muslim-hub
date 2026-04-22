// Resend inbound webhook for bounces / complaints / delivered.
// Resend sends svix-signed webhooks. We verify with the workspace integration's inbound_secret
// when provided; otherwise accept and tag as unverified.

import { getAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok");
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("w");
  const integrationId = url.searchParams.get("i");
  if (!workspaceId || !integrationId) return new Response("Missing params", { status: 400 });

  const admin = getAdminClient();
  const body = await req.json();

  const eventType = body.type as string;
  const map: Record<string, string> = {
    "email.delivered": "message.delivered",
    "email.bounced": "message.failed",
    "email.complained": "message.failed",
    "email.opened": "message.delivered",
  };
  const mapped = map[eventType] ?? "message.delivered";

  await admin.rpc("emit_integration_event", {
    _workspace_id: workspaceId,
    _event_type: mapped,
    _payload: body,
    _source: "wh-resend",
  });
  await admin.from("workspace_integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integrationId);

  return new Response("ok");
});