// Inbound WhatsApp Cloud API webhook receiver.
// URL pattern: /functions/v1/wh-whatsapp?w={workspace_id}&i={integration_id}
// Meta sends:
//  - GET with hub.mode=subscribe&hub.verify_token&hub.challenge for verification
//  - POST with X-Hub-Signature-256 = sha256=<hex hmac of raw body using app_secret>

import { getAdminClient } from "../_shared/supabase.ts";
import { decryptJson, hmacSha256Hex, timingSafeEqual } from "../_shared/crypto.ts";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("w");
  const integrationId = url.searchParams.get("i");
  if (!workspaceId || !integrationId) return new Response("Missing params", { status: 400 });

  const admin = getAdminClient();
  const { data: integ } = await admin
    .from("workspace_integrations")
    .select("*")
    .eq("id", integrationId)
    .eq("workspace_id", workspaceId)
    .eq("type", "whatsapp_meta")
    .maybeSingle();
  if (!integ) return new Response("Not found", { status: 404 });

  // Verification handshake
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && token && integ.inbound_secret && token === integ.inbound_secret) {
      return new Response(challenge ?? "", { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const sigHeader = req.headers.get("x-hub-signature-256") ?? "";

  let creds: { app_secret?: string; access_token?: string; phone_number_id?: string } = {};
  try {
    creds = await decryptJson({
      ciphertext: integ.credentials_ciphertext!,
      iv: integ.credentials_iv!,
      tag: integ.credentials_tag!,
    });
  } catch (_e) {
    return new Response("Bad credentials", { status: 500 });
  }

  if (creds.app_secret) {
    const expected = "sha256=" + (await hmacSha256Hex(creds.app_secret, raw));
    if (!(await timingSafeEqual(expected, sigHeader))) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  let payload: any;
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  // Process messages
  const entries = payload.entry ?? [];
  for (const entry of entries) {
    const changes = entry.changes ?? [];
    for (const ch of changes) {
      const value = ch.value ?? {};
      const messages = value.messages ?? [];
      for (const msg of messages) {
        const from = msg.from as string;
        const body = msg.text?.body ?? msg.button?.text ?? `[${msg.type}]`;
        await ingestInboundMessage(admin, {
          workspaceId,
          integrationId,
          channelType: "whatsapp_meta",
          fromExternal: from,
          body,
          externalMessageId: msg.id,
          raw: msg,
        });
      }
    }
  }

  await admin
    .from("workspace_integrations")
    .update({ last_event_at: new Date().toISOString() })
    .eq("id", integrationId);

  return new Response("ok", { status: 200 });
});

async function ingestInboundMessage(
  admin: ReturnType<typeof getAdminClient>,
  args: {
    workspaceId: string;
    integrationId: string;
    channelType: string;
    fromExternal: string;
    body: string;
    externalMessageId: string;
    raw: unknown;
  },
) {
  // Find/create channel record (one channels row per integration)
  const { data: channel } = await admin
    .from("channels")
    .select("id")
    .eq("workspace_id", args.workspaceId)
    .eq("type", "whatsapp")
    .eq("name", args.integrationId)
    .maybeSingle();

  let channelId = channel?.id;
  if (!channelId) {
    const { data: created } = await admin
      .from("channels")
      .insert({
        workspace_id: args.workspaceId,
        type: "whatsapp",
        name: args.integrationId,
        is_active: true,
        config: { integration_id: args.integrationId },
      })
      .select("id")
      .single();
    channelId = created?.id;
  }
  if (!channelId) return;

  // Find/create contact by phone
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("workspace_id", args.workspaceId)
    .eq("phone", args.fromExternal)
    .maybeSingle();

  let contactId = contact?.id;
  if (!contactId) {
    const { data: createdContact } = await admin
      .from("contacts")
      .insert({
        workspace_id: args.workspaceId,
        full_name: args.fromExternal,
        phone: args.fromExternal,
        whatsapp: args.fromExternal,
        source: "whatsapp",
      })
      .select("id")
      .single();
    contactId = createdContact?.id;
    if (contactId) {
      await admin.rpc("emit_integration_event", {
        _workspace_id: args.workspaceId,
        _event_type: "contact.created",
        _payload: { contact_id: contactId, channel: "whatsapp" },
        _source: "wh-whatsapp",
      });
    }
  }

  // Find or create open conversation for this contact+channel
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("workspace_id", args.workspaceId)
    .eq("channel_id", channelId)
    .eq("contact_id", contactId)
    .neq("status", "closed")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let conversationId = conv?.id;
  if (!conversationId) {
    const { data: createdConv } = await admin
      .from("conversations")
      .insert({
        workspace_id: args.workspaceId,
        channel_id: channelId,
        contact_id: contactId,
        status: "open",
      })
      .select("id")
      .single();
    conversationId = createdConv?.id;
    if (conversationId) {
      await admin.rpc("emit_integration_event", {
        _workspace_id: args.workspaceId,
        _event_type: "conversation.created",
        _payload: { conversation_id: conversationId, channel: "whatsapp" },
        _source: "wh-whatsapp",
      });
    }
  }
  if (!conversationId) return;

  await admin.from("messages").insert({
    workspace_id: args.workspaceId,
    conversation_id: conversationId,
    direction: "inbound",
    body: args.body,
    external_id: args.externalMessageId,
    metadata: args.raw as any,
  });

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), unread_count: 1 })
    .eq("id", conversationId);

  await admin.rpc("emit_integration_event", {
    _workspace_id: args.workspaceId,
    _event_type: "message.received",
    _payload: {
      conversation_id: conversationId,
      contact_id: contactId,
      channel: "whatsapp",
      body: args.body,
      external_id: args.externalMessageId,
    },
    _source: "wh-whatsapp",
  });
}