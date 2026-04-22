import { gatewayFetch, type PaddleEnv } from "../_shared/paddle.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { priceId, environment } = await req.json();
    if (!priceId) return new Response(JSON.stringify({ error: "priceId required" }), { status: 400, headers: cors });
    const env = (environment ?? "sandbox") as PaddleEnv;
    const res = await gatewayFetch(env, `/prices?external_id=${encodeURIComponent(priceId)}`);
    const data = await res.json();
    if (!data.data?.length) {
      return new Response(JSON.stringify({ error: "Price not found", priceId }), { status: 404, headers: cors });
    }
    return new Response(JSON.stringify({ paddleId: data.data[0].id }), { headers: cors });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: cors });
  }
});