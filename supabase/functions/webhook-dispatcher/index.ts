// Outbound webhook dispatcher.
// Picks up pending/failed deliveries whose next_attempt_at <= now,
// signs the payload with the endpoint's signing_secret (HMAC-SHA256),
// POSTs to the URL, and updates status with exponential backoff.
//
// Intended to be called by a cron (every minute). Also callable manually.

import { getAdminClient } from "../_shared/supabase.ts";
import { hmacSha256Hex } from "../_shared/crypto.ts";

const MAX_ATTEMPTS = 6;            // ~ 1, 2, 4, 8, 16, 32 minutes
const BATCH_SIZE = 25;
const REQUEST_TIMEOUT_MS = 10_000;

function backoffMs(attempt: number): number {
  return Math.min(60_000 * Math.pow(2, Math.max(0, attempt - 1)), 60 * 60 * 1000);
}

Deno.serve(async (_req) => {
  const admin = getAdminClient();

  const { data: pending, error } = await admin
    .from("webhook_deliveries")
    .select("id, endpoint_id, workspace_id, event_type, payload, attempt")
    .in("status", ["pending", "failed"])
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) {
    console.error("dispatcher fetch error", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const d of pending ?? []) {
    processed++;
    const { data: ep } = await admin
      .from("webhook_endpoints")
      .select("id, url, signing_secret, is_active, consecutive_failures")
      .eq("id", d.endpoint_id)
      .maybeSingle();

    if (!ep || !ep.is_active) {
      await admin.from("webhook_deliveries").update({
        status: "dead", error_message: "endpoint inactive or missing",
      }).eq("id", d.id);
      failed++;
      continue;
    }

    const attempt = d.attempt + 1;
    const ts = Date.now().toString();
    const bodyStr = JSON.stringify({
      id: d.id,
      event: d.event_type,
      workspace_id: d.workspace_id,
      timestamp: ts,
      data: d.payload,
    });
    const signature = await hmacSha256Hex(ep.signing_secret, ts + "." + bodyStr);

    const start = Date.now();
    let respStatus: number | null = null;
    let respText = "";
    let errorMsg: string | null = null;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(ep.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Id": d.id,
          "X-Webhook-Event": d.event_type,
          "X-Webhook-Timestamp": ts,
          "X-Webhook-Signature": `t=${ts},v1=${signature}`,
          "User-Agent": "MuslimiDigital-Webhooks/1.0",
        },
        body: bodyStr,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      respStatus = res.status;
      respText = (await res.text()).slice(0, 2000);
    } catch (e) {
      errorMsg = (e as Error).message;
    }
    const duration = Date.now() - start;

    const ok = respStatus !== null && respStatus >= 200 && respStatus < 300;
    if (ok) {
      succeeded++;
      await admin.from("webhook_deliveries").update({
        status: "success", attempt, response_status: respStatus, response_body: respText,
        duration_ms: duration, error_message: null,
      }).eq("id", d.id);
      await admin.from("webhook_endpoints").update({
        last_delivery_at: new Date().toISOString(), consecutive_failures: 0,
      }).eq("id", ep.id);
    } else {
      failed++;
      const isDead = attempt >= MAX_ATTEMPTS;
      const nextAt = new Date(Date.now() + backoffMs(attempt)).toISOString();
      await admin.from("webhook_deliveries").update({
        status: isDead ? "dead" : "failed",
        attempt,
        response_status: respStatus,
        response_body: respText,
        duration_ms: duration,
        error_message: errorMsg,
        next_attempt_at: nextAt,
      }).eq("id", d.id);
      await admin.from("webhook_endpoints").update({
        consecutive_failures: (ep.consecutive_failures ?? 0) + 1,
      }).eq("id", ep.id);
    }
  }

  return new Response(JSON.stringify({ processed, succeeded, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});