// Telegram Bot webhook receiver.
// URL pattern: /functions/v1/wh-telegram?w={workspace_id}&i={integration_id}
// Telegram sends X-Telegram-Bot-Api-Secret-Token header that must match inbound_secret.

import { getAdminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("w");
  const integrationId = url.searchParams.get("i");
  if (!workspaceId || !integrationId) return new Response("Missing params", { status: 400 });

  const admin = getAdminClient();
  const { data: integ } = await admin
    .from("workspace_integrations")
    .select("inbound_secret, workspace_id")
    .eq("id", integrationId)
    .eq("workspace_id", workspaceId)
    .eq("type", "telegram")
    .maybeSingle();
  if (!integ) return new Response("Not found", { status: 404 });

  const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
  if (!integ.inbound_secret || secretHeader !== integ.inbound_secret) {
    return new Response("Invalid secret", { status: 401 });
  }

  const update = await req.json();
  const msg = update.message ?? update.edited_message;
  if (!msg) return new Response("ok", { status: 200 });

  const chatId = String(msg.chat?.id ?? "");
  const fromName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ") || msg.from?.username || chatId;
  const body = msg.text ?? msg.caption ?? `[${Object.keys(msg).find((k) => ["photo","video","voice","document","sticker"].includes(k)) ?? "media"}]`;

  // Channel
  let { data: channel } = await admin
    .from("channels")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("type", "telegram")
    .eq("name", integrationId)
    .maybeSingle();
  if (!channel) {
    const { data: created } = await admin
      .from("channels")
      .insert({ workspace_id: workspaceId, type: "telegram", name: integrationId, is_active: true, config: { integration_id: integrationId } })
      .select("id").single();
    channel = created;
  }
  if (!channel) return new Response("err", { status: 500 });

  // Contact
  let { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("telegram_username", chatId)
    .maybeSingle();
  if (!contact) {
    const { data: created } = await admin
      .from("contacts")
      .insert({ workspace_id: workspaceId, full_name: fromName, telegram_username: chatId, source: "telegram" })
      .select("id").single();
    contact = created;
    if (contact) {
      await admin.rpc("emit_integration_event", {
        _workspace_id: workspaceId, _event_type: "contact.created",
        _payload: { contact_id: contact.id, channel: "telegram" }, _source: "wh-telegram",
      });
    }
  }
  if (!contact) return new Response("err", { status: 500 });

  // Conversation
  let { data: conv } = await admin
    .from("conversations").select("id")
    .eq("workspace_id", workspaceId).eq("channel_id", channel.id).eq("contact_id", contact.id)
    .neq("status", "closed").order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  if (!conv) {
    const { data: created } = await admin.from("conversations")
      .insert({ workspace_id: workspaceId, channel_id: channel.id, contact_id: contact.id, status: "open" })
      .select("id").single();
    conv = created;
    if (conv) {
      await admin.rpc("emit_integration_event", {
        _workspace_id: workspaceId, _event_type: "conversation.created",
        _payload: { conversation_id: conv.id, channel: "telegram" }, _source: "wh-telegram",
      });
    }
  }
  if (!conv) return new Response("err", { status: 500 });

  await admin.from("messages").insert({
    workspace_id: workspaceId, conversation_id: conv.id, direction: "inbound",
    body, external_id: String(msg.message_id), metadata: msg,
  });
  await admin.from("conversations").update({ last_message_at: new Date().toISOString(), unread_count: 1 }).eq("id", conv.id);
  await admin.from("workspace_integrations").update({ last_event_at: new Date().toISOString() }).eq("id", integrationId);

  await admin.rpc("emit_integration_event", {
    _workspace_id: workspaceId, _event_type: "message.received",
    _payload: { conversation_id: conv.id, contact_id: contact.id, channel: "telegram", body, external_id: String(msg.message_id) },
    _source: "wh-telegram",
  });

  return new Response("ok", { status: 200 });
});