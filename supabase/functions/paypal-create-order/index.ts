import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paypalCors, getPayPalAccessToken, getPayPalBaseUrl } from "../_shared/paypal.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: paypalCors });

  try {
    const body = await req.json();
    const amountCents: number = Number(body.amountCents);
    const message: string | null = body.message ?? null;
    const donorEmail: string | undefined = body.donorEmail;
    const returnUrl: string = body.returnUrl;
    const cancelUrl: string = body.cancelUrl;

    if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...paypalCors, "Content-Type": "application/json" },
      });
    }

    // Identify user from Authorization header (optional)
    let donorUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseAdmin.auth.getUser(token);
      donorUserId = userData?.user?.id ?? null;
    }

    const accessToken = await getPayPalAccessToken();
    const amountEur = (amountCents / 100).toFixed(2);

    const orderRes = await fetch(`${getPayPalBaseUrl()}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "EUR", value: amountEur },
          description: "Donacion për Muslimi Digital",
        }],
        application_context: {
          brand_name: "Muslimi Digital",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!orderRes.ok) {
      const txt = await orderRes.text();
      console.error("PayPal order create failed:", txt);
      return new Response(JSON.stringify({ error: "PayPal order failed" }), {
        status: 500,
        headers: { ...paypalCors, "Content-Type": "application/json" },
      });
    }

    const order = await orderRes.json();
    const approveUrl = order.links?.find((l: any) => l.rel === "approve")?.href;

    // Persist pending donation
    await supabaseAdmin.from("donations").insert({
      amount_cents: amountCents,
      currency: "EUR",
      status: "pending",
      donor_user_id: donorUserId,
      donor_email: donorEmail ?? null,
      message,
      paypal_order_id: order.id,
      metadata: { return_url: returnUrl },
    });

    return new Response(JSON.stringify({ orderId: order.id, approveUrl }), {
      headers: { ...paypalCors, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("paypal-create-order error:", e);
    return new Response(JSON.stringify({ error: e.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...paypalCors, "Content-Type": "application/json" },
    });
  }
});