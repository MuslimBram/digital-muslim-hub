// Unified outbound message sender — routes to WhatsApp / Telegram / SMS / Email
// based on the workspace_integration type. Decrypts credentials and calls the
// appropriate provider through the connector gateway when applicable.

import { getAdminClient, getUserClient } from "../_shared/supabase.ts";
import { decryptJson } from "../_shared/crypto.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SendArgs {
  workspace_id: string;
  integration_id: string;
  to: string;
  body: string;
  conversation_id?: string;
  subject?: string;   // email
  html?: string;      // email
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return j({ error: "Unauthorized" }, 401);
    const userClient = getUserClient(auth);
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ error: "Unauthorized" }, 401);

    const args = (await req.json()) as SendArgs;
    const admin = getAdminClient();

    const { data: integ } = await admin
      .from("workspace_integrations").select("*")
      .eq("id", args.integration_id).eq("workspace_id", args.workspace_id).maybeSingle();
    if (!integ) return j({ error: "Integration not found" }, 404);
    if (integ.status !== "active") return j({ error: "Integration not active" }, 400);

    let creds: Record<string, string> = {};
    if (integ.credentials_ciphertext) {
      creds = await decryptJson({
        ciphertext: integ.credentials_ciphertext,
        iv: integ.credentials_iv!,
        tag: integ.credentials_tag!,
      });
    }

    let externalId: string | null = null;
    if (integ.type === "whatsapp_meta") {
      externalId = await sendWhatsApp(creds, args);
    } else if (integ.type === "telegram") {
      externalId = await sendTelegram(creds, args);
    } else if (integ.type === "twilio_sms") {
      externalId = await sendTwilioSms(creds, args);
    } else if (integ.type === "resend_email") {
      externalId = await sendResendEmail(creds, integ.config as Record<string, string>, args);
    } else {
      return j({ error: `Unsupported type ${integ.type}` }, 400);
    }

    // Log to messages if conversation provided
    if (args.conversation_id) {
      await admin.from("messages").insert({
        workspace_id: args.workspace_id,
        conversation_id: args.conversation_id,
        direction: "outbound",
        body: args.body,
        external_id: externalId,
        sender_user_id: u.user.id,
      });
      await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", args.conversation_id);
    }

    await admin.rpc("emit_integration_event", {
      _workspace_id: args.workspace_id,
      _event_type: "message.sent",
      _payload: {
        integration_id: integ.id,
        type: integ.type,
        to: args.to,
        body: args.body,
        external_id: externalId,
        conversation_id: args.conversation_id ?? null,
      },
      _source: "send-message",
    });

    return j({ ok: true, external_id: externalId });
  } catch (e) {
    console.error("send-message", e);
    return j({ error: (e as Error).message }, 500);
  }
});

function j(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

async function sendWhatsApp(creds: Record<string, string>, args: SendArgs): Promise<string | null> {
  const phoneId = creds.phone_number_id;
  const token = creds.access_token;
  if (!phoneId || !token) throw new Error("Missing WhatsApp credentials");
  const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: args.to, type: "text", text: { body: args.body } }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${JSON.stringify(data)}`);
  return data.messages?.[0]?.id ?? null;
}

async function sendTelegram(creds: Record<string, string>, args: SendArgs): Promise<string | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const tgKey = Deno.env.get("TELEGRAM_API_KEY");
  if (lovableKey && tgKey) {
    // Prefer connector gateway when available
    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": tgKey, "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: args.to, text: args.body }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(`Telegram(gw) ${res.status}: ${JSON.stringify(d)}`);
    return String(d.result?.message_id ?? "");
  }
  const botToken = creds.bot_token;
  if (!botToken) throw new Error("Missing Telegram bot_token");
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: args.to, text: args.body }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${JSON.stringify(d)}`);
  return String(d.result?.message_id ?? "");
}

async function sendTwilioSms(creds: Record<string, string>, args: SendArgs): Promise<string | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const twKey = Deno.env.get("TWILIO_API_KEY");
  const from = creds.from_number;
  if (!from) throw new Error("Missing Twilio from_number");
  if (lovableKey && twKey) {
    const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": twKey, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: args.to, From: from, Body: args.body }),
    });
    const d = await res.json();
    if (!res.ok) throw new Error(`Twilio(gw) ${res.status}: ${JSON.stringify(d)}`);
    return d.sid ?? null;
  }
  // direct fallback using account_sid + auth_token
  const sid = creds.account_sid;
  const token = creds.auth_token;
  if (!sid || !token) throw new Error("Missing Twilio account_sid/auth_token");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + btoa(`${sid}:${token}`), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: args.to, From: from, Body: args.body }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(d)}`);
  return d.sid ?? null;
}

async function sendResendEmail(creds: Record<string, string>, config: Record<string, string>, args: SendArgs): Promise<string | null> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY") ?? creds.api_key;
  const from = creds.from_email ?? config.from_email ?? "onboarding@resend.dev";
  if (!resendKey) throw new Error("Missing Resend api_key");
  const url = lovableKey
    ? "https://connector-gateway.lovable.dev/resend/emails"
    : "https://api.resend.com/emails";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (lovableKey) {
    headers.Authorization = `Bearer ${lovableKey}`;
    headers["X-Connection-Api-Key"] = resendKey;
  } else {
    headers.Authorization = `Bearer ${resendKey}`;
  }
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      from,
      to: [args.to],
      subject: args.subject ?? "(no subject)",
      html: args.html ?? `<p>${escapeHtml(args.body)}</p>`,
      text: args.body,
    }),
  });
  const d = await res.json();
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(d)}`);
  return d.id ?? null;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}