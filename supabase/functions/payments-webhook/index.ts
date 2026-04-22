import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyWebhook, EventName, type PaddleEnv } from "../_shared/paddle.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, paddle-signature",
};

function getAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const url = new URL(req.url);
  const env = ((url.searchParams.get("env") ?? "sandbox") === "live" ? "live" : "sandbox") as PaddleEnv;

  let event;
  try {
    event = await verifyWebhook(req, env);
  } catch (e) {
    console.error("Webhook verification failed", e);
    return new Response("invalid signature", { status: 401, headers: cors });
  }

  const admin = getAdmin();

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated: {
        const sub: any = event.data;
        const customData: any = sub.customData ?? {};
        const workspaceId = customData.workspace_id;
        if (!workspaceId) {
          console.warn("No workspace_id in customData");
          break;
        }
        const priceItem = sub.items?.[0];
        const externalPriceId = priceItem?.price?.customData?.external_id ?? customData.price_id;
        // Find plan by tier inferred from external_id prefix
        let planId: string | null = null;
        if (externalPriceId) {
          const tier = String(externalPriceId).split("_")[0];
          const { data: plan } = await admin.from("plans").select("id").eq("tier", tier).maybeSingle();
          planId = plan?.id ?? null;
        }
        const billingCycleMap: Record<string, string> = {
          monthly: "monthly",
          quarterly: "quarterly",
          semiannual: "semiannual",
          annual: "annual",
        };
        const cycleKey = String(externalPriceId ?? "").split("_")[1] ?? "monthly";
        const billing_cycle = billingCycleMap[cycleKey] ?? "monthly";

        await admin
          .from("subscriptions")
          .update({
            status: sub.status,
            paddle_subscription_id: sub.id,
            paddle_customer_id: sub.customerId,
            current_period_start: sub.currentBillingPeriod?.startsAt ?? null,
            current_period_end: sub.currentBillingPeriod?.endsAt ?? null,
            cancel_at_period_end: sub.scheduledChange?.action === "cancel",
            billing_cycle,
            ...(planId ? { plan_id: planId } : {}),
            metadata: { paddle_env: env, last_event: event.eventType },
          })
          .eq("workspace_id", workspaceId);
        break;
      }
      case EventName.SubscriptionCanceled: {
        const sub: any = event.data;
        const customData: any = sub.customData ?? {};
        const workspaceId = customData.workspace_id;
        if (workspaceId) {
          await admin
            .from("subscriptions")
            .update({ status: "canceled", cancel_at_period_end: true })
            .eq("workspace_id", workspaceId);
        }
        break;
      }
      case EventName.TransactionCompleted: {
        const tx: any = event.data;
        const customData: any = tx.customData ?? {};
        const workspaceId = customData.workspace_id;
        const userId = customData.user_id;
        const amountCents = Math.round(parseFloat(tx.details?.totals?.total ?? "0"));

        // Mark first payment + commission for referrer (15%)
        if (userId) {
          const { data: profile } = await admin
            .from("profiles")
            .select("referred_by")
            .eq("id", userId)
            .maybeSingle();
          if (profile?.referred_by) {
            const { data: referral } = await admin
              .from("referrals")
              .select("id, total_commission_cents, first_payment_at, commission_rate")
              .eq("referrer_id", profile.referred_by)
              .eq("referred_user_id", userId)
              .maybeSingle();
            if (referral) {
              const rate = Number(referral.commission_rate ?? 0.15);
              const commission = Math.round(amountCents * rate);
              await admin
                .from("referrals")
                .update({
                  first_payment_at: referral.first_payment_at ?? new Date().toISOString(),
                  total_commission_cents: (referral.total_commission_cents ?? 0) + commission,
                })
                .eq("id", referral.id);
              // Credit referrer wallet
              const { data: wallet } = await admin
                .from("wallets")
                .select("id, balance_cents, total_earned_cents")
                .eq("user_id", profile.referred_by)
                .maybeSingle();
              if (wallet) {
                await admin
                  .from("wallets")
                  .update({
                    balance_cents: (wallet.balance_cents ?? 0) + commission,
                    total_earned_cents: (wallet.total_earned_cents ?? 0) + commission,
                  })
                  .eq("id", wallet.id);
                await admin.from("wallet_transactions").insert({
                  wallet_id: wallet.id,
                  user_id: profile.referred_by,
                  amount_cents: commission,
                  tx_type: "commission",
                  description: "Komision referim 15%",
                  reference_id: tx.id,
                });
              }
            }
          }
        }

        if (workspaceId) {
          await admin
            .from("subscriptions")
            .update({ status: "active", blocked_at: null, delete_after: null })
            .eq("workspace_id", workspaceId);
        }
        break;
      }
      case EventName.TransactionPaymentFailed: {
        const tx: any = event.data;
        const customData: any = tx.customData ?? {};
        const workspaceId = customData.workspace_id;
        if (workspaceId) {
          await admin
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("workspace_id", workspaceId);
        }
        break;
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook handler error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});