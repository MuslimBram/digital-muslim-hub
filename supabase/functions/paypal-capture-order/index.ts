import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paypalCors, getPayPalAccessToken, getPayPalBaseUrl } from "../_shared/paypal.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: paypalCors });

  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400,
        headers: { ...paypalCors, "Content-Type": "application/json" },
      });
    }

    const accessToken = await getPayPalAccessToken();
    const captureRes = await fetch(
      `${getPayPalBaseUrl()}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!captureRes.ok) {
      const txt = await captureRes.text();
      console.error("Capture failed:", txt);
      return new Response(JSON.stringify({ error: "Capture failed" }), {
        status: 500,
        headers: { ...paypalCors, "Content-Type": "application/json" },
      });
    }

    const capture = await captureRes.json();
    const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
    const status = capture.status === "COMPLETED" ? "completed" : "pending";
    const donorName = capture.payer?.name
      ? `${capture.payer.name.given_name ?? ""} ${capture.payer.name.surname ?? ""}`.trim()
      : null;
    const donorEmailFromPp = capture.payer?.email_address ?? null;

    await supabaseAdmin
      .from("donations")
      .update({
        status,
        paypal_capture_id: captureId,
        completed_at: status === "completed" ? new Date().toISOString() : null,
        donor_name: donorName,
        donor_email: donorEmailFromPp ?? undefined,
      })
      .eq("paypal_order_id", orderId);

    return new Response(JSON.stringify({ status, captureId }), {
      headers: { ...paypalCors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("paypal-capture-order error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...paypalCors, "Content-Type": "application/json" },
    });
  }
});