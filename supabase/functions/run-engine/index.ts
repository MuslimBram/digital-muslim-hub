import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";
import { ENGINE_PROMPT, ENGINE_LABEL, TOOL_SCHEMA, type EngineKey } from "./prompts.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const ENGINE_KEYS: EngineKey[] = [
  "growth", "revenue", "pricing", "funnel", "retention", "viral",
  "personalization", "demand", "workforce",
];

async function gatherWorkspaceData(admin: ReturnType<typeof getAdminClient>, workspaceId: string) {
  const [sub, wallet, contacts, deals, calls, conv, tickets, plans] = await Promise.all([
    admin.from("subscriptions").select("status, billing_cycle, account_type, trial_ends_at, current_period_end, plan_id, plans(tier, name, monthly_price_cents, currency, max_team_members, max_businesses, max_channels, max_ai_replies_daily, daily_image_credits, daily_video_seconds)").eq("workspace_id", workspaceId).maybeSingle(),
    admin.from("wallets").select("balance_cents, total_earned_cents, total_withdrawn_cents, currency").eq("user_id", (await admin.from("workspaces").select("owner_id").eq("id", workspaceId).maybeSingle()).data?.owner_id ?? "").maybeSingle(),
    admin.from("contacts").select("id, status, created_at", { count: "exact", head: false }).eq("workspace_id", workspaceId).limit(500),
    admin.from("deals").select("id, status, value, currency, stage_id, created_at, updated_at", { count: "exact", head: false }).eq("workspace_id", workspaceId).limit(500),
    admin.from("calls").select("id, direction, status, duration_seconds, wait_seconds, started_at", { count: "exact", head: false }).eq("workspace_id", workspaceId).limit(500),
    admin.from("conversations").select("id, status, last_message_at, unread_count", { count: "exact", head: false }).eq("workspace_id", workspaceId).limit(500),
    admin.from("tickets").select("id, status, priority, created_at, resolved_at", { count: "exact", head: false }).eq("workspace_id", workspaceId).limit(500),
    admin.from("plans").select("tier, name, monthly_price_cents, currency"),
  ]);

  const dealsWon = (deals.data ?? []).filter((d) => d.status === "won");
  const totalDealValue = dealsWon.reduce((s, d) => s + Number(d.value ?? 0), 0);

  return {
    subscription: sub.data,
    wallet: wallet.data,
    contacts: { total: contacts.count ?? (contacts.data?.length ?? 0), by_status: countBy(contacts.data ?? [], "status") },
    deals: {
      total: deals.count ?? (deals.data?.length ?? 0),
      won: dealsWon.length,
      total_won_value: totalDealValue,
      by_status: countBy(deals.data ?? [], "status"),
    },
    calls: {
      total: calls.count ?? (calls.data?.length ?? 0),
      avg_duration_s: avg((calls.data ?? []).map((c) => Number(c.duration_seconds ?? 0))),
      avg_wait_s: avg((calls.data ?? []).map((c) => Number(c.wait_seconds ?? 0))),
      by_direction: countBy(calls.data ?? [], "direction"),
    },
    conversations: {
      total: conv.count ?? (conv.data?.length ?? 0),
      open: (conv.data ?? []).filter((c) => c.status === "open").length,
    },
    tickets: {
      total: tickets.count ?? (tickets.data?.length ?? 0),
      open: (tickets.data ?? []).filter((t) => t.status !== "resolved" && t.status !== "closed").length,
      by_priority: countBy(tickets.data ?? [], "priority"),
    },
    market_plans: plans.data ?? [],
  };
}

function countBy<T extends Record<string, unknown>>(arr: T[], key: keyof T) {
  const out: Record<string, number> = {};
  for (const r of arr) {
    const k = String(r[key] ?? "unknown");
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}
function avg(arr: number[]) {
  if (!arr.length) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

async function runOne(
  admin: ReturnType<typeof getAdminClient>,
  workspaceId: string,
  engine: EngineKey,
  apiKey: string,
  triggeredBy: string,
  triggeredByUser: string | null,
  data: unknown,
) {
  const t0 = Date.now();
  const { data: runRow, error: insertErr } = await admin
    .from("engine_runs")
    .insert({
      workspace_id: workspaceId,
      engine,
      status: "running",
      model: DEFAULT_MODEL,
      triggered_by: triggeredBy,
      triggered_by_user: triggeredByUser,
    })
    .select("id")
    .single();
  if (insertErr || !runRow) throw new Error(`insert run failed: ${insertErr?.message}`);

  try {
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: ENGINE_PROMPT[engine] },
          { role: "user", content: `Engine: ${ENGINE_LABEL[engine]}\n\nTë dhënat e workspace-it:\n${JSON.stringify(data, null, 2)}` },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_engine_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      if (aiRes.status === 429) throw new Error("Rate limit i tejkaluar");
      if (aiRes.status === 402) throw new Error("Krediti AI ka mbaruar");
      throw new Error(`AI gateway ${aiRes.status}: ${body.slice(0, 200)}`);
    }
    const json = await aiRes.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("Modeli nuk ktheu tool call");
    const args = JSON.parse(call.function.arguments);

    await admin.from("engine_runs").update({
      status: "completed",
      score: args.score,
      summary: args.summary,
      insights: args.insights,
      recommendations: args.recommendations,
      metrics: data as Record<string, unknown>,
      duration_ms: Date.now() - t0,
      completed_at: new Date().toISOString(),
    }).eq("id", runRow.id);

    return { id: runRow.id, engine, score: args.score };
  } catch (e) {
    await admin.from("engine_runs").update({
      status: "failed",
      error_message: e instanceof Error ? e.message : String(e),
      duration_ms: Date.now() - t0,
      completed_at: new Date().toISOString(),
    }).eq("id", runRow.id);
    throw e;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const admin = getAdminClient();
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("ENGINES_CRON_SECRET");
    const isCron = cronSecret ? req.headers.get("x-engine-cron") === cronSecret : false;

    const body = await req.json().catch(() => ({}));
    const { workspaceId, engine, all } = body as { workspaceId?: string; engine?: EngineKey; all?: boolean };

    let triggeredBy = "manual";
    let userId: string | null = null;

    if (isCron) {
      triggeredBy = "scheduled";
    } else {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const supa = getUserClient(authHeader);
      const { data: u } = await supa.auth.getUser();
      userId = u.user?.id ?? null;
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (workspaceId) {
        const { data: member } = await supa.from("workspace_members").select("user_id").eq("workspace_id", workspaceId).eq("user_id", userId).maybeSingle();
        if (!member) {
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // CRON: run for all workspaces
    if (isCron && !workspaceId) {
      const { data: workspaces } = await admin.from("workspaces").select("id");
      const results: unknown[] = [];
      for (const ws of workspaces ?? []) {
        try {
          const data = await gatherWorkspaceData(admin, ws.id);
          for (const e of ENGINE_KEYS) {
            try {
              const r = await runOne(admin, ws.id, e, LOVABLE_API_KEY, "scheduled", null, data);
              results.push(r);
            } catch (err) {
              results.push({ workspace_id: ws.id, engine: e, error: String(err) });
            }
          }
        } catch (err) {
          results.push({ workspace_id: ws.id, error: String(err) });
        }
      }
      return new Response(JSON.stringify({ ok: true, total: results.length, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!workspaceId) {
      return new Response(JSON.stringify({ error: "workspaceId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await gatherWorkspaceData(admin, workspaceId);
    const targets: EngineKey[] = all || !engine ? ENGINE_KEYS : [engine];
    const results: unknown[] = [];
    for (const e of targets) {
      try {
        const r = await runOne(admin, workspaceId, e, LOVABLE_API_KEY, triggeredBy, userId, data);
        results.push(r);
      } catch (err) {
        results.push({ engine: e, error: err instanceof Error ? err.message : String(err) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("run-engine error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});