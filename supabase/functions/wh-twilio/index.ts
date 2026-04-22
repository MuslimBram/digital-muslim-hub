// Twilio inbound SMS webhook.
// URL: /functions/v1/wh-twilio?w={workspace_id}&i={integration_id}
// Twilio signs requests with X-Twilio-Signature using the auth token.
// We store auth_token in encrypted credentials.

import { getAdminClient } from "../_shared/supabase.ts";
import { decryptJson } from "../_shared/crypto.ts";

async function hmacSha1B64(key: string, msg: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(msg)));
  let bin = ""; for (let i = 0; i < sig.length; i++) bin += String.fromCharCode(sig[i]);
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const url = new URL(req.url);
  const workspaceId = url.searchParams.get("w");
  const integrationId = url.searchParams.get("i");
  if (!workspaceId || !integrationId) return new Response("Missing params", { status: 400 });

  const admin = getAdminClient();
  const { data: integ } = await admin
    .from("workspace_integrations").select("*")
    .eq("id", integrationId).eq("workspace_id", workspaceId).eq("type", "twilio_sms").maybeSingle();
  if (!integ) return new Response("Not found", { status: 404 });

  const formText = await req.text();
  const params = new URLSearchParams(formText);

  // Twilio signature: HMAC-SHA1(auth_token, full_url + sorted concatenated params) base64
  let creds: { auth_token?: string; account_sid?: string; from_number?: string } = {};
  try {
    creds = await decryptJson({
      ciphertext: integ.credentials_ciphertext!, iv: integ.credentials_iv!, tag: integ.credentials_tag!,
    });
  } catch { return new Response("Bad creds", { status: 500 }); }

  if (creds.auth_token) {
    const fullUrl = req.url; // host inferred from request
    const sortedKeys = [...params.keys()].sort();
    const concat = fullUrl + sortedKeys.map((k) => k + (params.get(k) ?? "")).join("");
    const expected = await hmacSha1B64(creds.auth_token, concat);
    const got = req.headers.get("x-twilio-signature") ?? "";
    if (expected !== got) return new Response("Invalid signature", { status: 401 });
  }

  const from = params.get("From") ?? "";
  const body = params.get("Body") ?? "";
  const externalId = params.get("MessageSid") ?? "";

  // channel
  let { data: channel } = await admin.from("channels").select("id")
    .eq("workspace_id", workspaceId).eq("type", "sms").eq("name", integrationId).maybeSingle();
  if (!channel) {
    const { data } = await admin.from("channels")
      .insert({ workspace_id: workspaceId, type: "sms", name: integrationId, is_active: true, config: { integration_id: integrationId } })
      .select("id").single();
    channel = data;
  }
  if (!channel) return new Response("err", { status: 500 });

  let { data: contact } = await admin.from("contacts").select("id")
    .eq("workspace_id", workspaceId).eq("phone", from).maybeSingle();
  if (!contact) {
    const { data } = await admin.from("contacts")
      .insert({ workspace_id: workspaceId, full_name: from, phone: from, source: "sms" })
      .select("id").single();
    contact = data;
  }
  if (!contact) return new Response("err", { status: 500 });

  let { data: conv } = await admin.from("conversations").select("id")
    .eq("workspace_id", workspaceId).eq("channel_id", channel.id).eq("contact_id", contact.id)
    .neq("status", "closed").order("last_message_at", { ascending: false }).limit(1).maybeSingle();
  if (!conv) {
    const { data } = await admin.from("conversations")
      .insert({ workspace_id: workspaceId, channel_id: channel.id, contact_id: contact.id, status: "open" })
      .select("id").single();
    conv = data;
  }
  if (!conv) return new Response("err", { status: 500 });

  await admin.from("messages").insert({
    workspace_id: workspaceId, conversation_id: conv.id, direction: "inbound",
    body, external_id: externalId, metadata: Object.fromEntries(params.entries()),
  });
  await admin.from("conversations").update({ last_message_at: new Date().toISOString(), unread_count: 1 }).eq("id", conv.id);
  await admin.rpc("emit_integration_event", {
    _workspace_id: workspaceId, _event_type: "message.received",
    _payload: { conversation_id: conv.id, contact_id: contact.id, channel: "sms", body, external_id: externalId },
    _source: "wh-twilio",
  });

  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response/>', {
    status: 200, headers: { "Content-Type": "text/xml" },
  });
});