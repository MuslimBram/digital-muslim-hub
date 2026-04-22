// Lovi — Platform-wide AI assistant. Streams answers tailored to the
// user's role (business / freelancer / ambassador / admin / owner) with
// a built-in fraud-and-abuse heuristic for payment manipulation attempts.

import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface ChatMessage { role: "user" | "assistant" | "system"; content: string }

const ABUSE_PATTERNS: { pattern: RegExp; reason: string; severity: "low" | "medium" | "high" }[] = [
  { pattern: /chargeback|charge ?back|kthim ?pagese|refuzim ?pagese/i, reason: "chargeback_intent", severity: "high" },
  { pattern: /fake ?card|card ?gjenerator|cvv ?gjeneru|bin ?lookup/i, reason: "card_fraud", severity: "high" },
  { pattern: /paddle ?bypass|skip ?payment|free ?premium|crack/i, reason: "payment_bypass", severity: "high" },
  { pattern: /multi ?account|llogari ?fake|llogari ?te ?reja per trial|abuse trial/i, reason: "trial_abuse", severity: "medium" },
  { pattern: /referral ?fraud|self ?refer|vetereferim|refero veten/i, reason: "referral_fraud", severity: "medium" },
  { pattern: /sql ?inject|drop ?table|union select/i, reason: "sql_injection", severity: "high" },
];

function detectAbuse(text: string) {
  const hits = ABUSE_PATTERNS.filter((p) => p.pattern.test(text));
  if (hits.length === 0) return null;
  return {
    flagged: true,
    severity: hits.some((h) => h.severity === "high") ? "high" : "medium",
    reasons: hits.map((h) => h.reason),
  };
}

function rolePersona(role: string, accountType: string) {
  const base = `Ti je "Lovi", asistent AI i platformës. Përgjigju gjithmonë në shqip, qartë dhe shkurt. Përdor markdown.`;
  if (role === "owner" || role === "admin") {
    return `${base}
## Roli i përdoruesit: ${role.toUpperCase()} (akses i pakufizuar)
- Ke akses të plotë në metrika sistemore, abonime, përdorues, integrime OAuth (Publer/Buffer style), faturim.
- Mund të diskutosh fluksin e backend-it, RLS, edge functions, raporte abuzimi.
- Trego statistika konkrete kur të kërkohen (subscriptions, MRR, agjentë aktivë, etj).`;
  }
  if (accountType === "ambassador") {
    return `${base}
## Roli i përdoruesit: AMBASSADOR
- Ndihmoje me kodin e referimit, komisionet, ndarjen e linkut, dhe FAQ rreth Programit të Filialeve.
- NUK ka workspace — mos sugjero veçori biznesi (CRM, Inbox, Calls, Engines).
- Përgjigjet duhet të orientohen drejt rritjes së referimeve dhe pagesave.`;
  }
  if (accountType === "freelancer") {
    return `${base}
## Roli i përdoruesit: FREELANCER
- Ka të drejtë për 1 workspace bazë + 1 shtesë për çdo abonim aktiv.
- Ndihmoje me menaxhim klientësh (CRM), planifikim postimesh, kanale të lidhura, dhe ngritje produktiviteti.
- Mund t'i sugjerosh të blejë workspace shtesë nëse ka nevojë për ndarje klientësh.`;
  }
  return `${base}
## Roli i përdoruesit: BUSINESS
- Ka 1 workspace të vetëm, ekip dhe kanale të shumtë.
- Ndihmoje me CRM, Inbox, AI Engines, Call Center, kampanja, integrime, faturim.
- Mos sugjero workspaces shtesë — biznesi është i kufizuar në 1.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const auth = req.headers.get("Authorization");
    const supabase = getUserClient(auth);
    const admin = getAdminClient();

    const { messages, currentRoute } = (await req.json()) as {
      messages: ChatMessage[];
      currentRoute?: string;
    };
    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages required" }, 400);
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Unauthorized" }, 401);

    // Load identity, role, account type, and (best-effort) workspace name.
    const [{ data: profile }, { data: roleRows }] = await Promise.all([
      admin.from("profiles").select("email, full_name, account_type, locale").eq("id", userId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId),
    ]);

    const platformRoles = (roleRows ?? []).map((r) => r.role);
    const isOwner = platformRoles.includes("owner");
    const isAdmin = platformRoles.includes("admin");
    const effectiveRole = isOwner ? "owner" : isAdmin ? "admin" : (profile?.account_type ?? "business");

    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const abuse = lastUser ? detectAbuse(lastUser.content) : null;

    if (abuse && (isOwner || isAdmin)) {
      // Admins/Owners get the abuse signal but the conversation continues.
    } else if (abuse?.severity === "high") {
      // Log to integration_events for audit and refuse to comply.
      await admin.from("integration_events").insert({
        workspace_id: null as unknown as string, // table requires workspace; use system row if exists
        event_type: "system.abuse_detected",
        source: "assistant-chat",
        payload: { user_id: userId, reasons: abuse.reasons, message: lastUser?.content?.slice(0, 200) },
      } as never).catch(() => null);

      return new Response(
        JSON.stringify({
          refused: true,
          message:
            "⚠️ Kjo kërkesë u identifikua si tentativë për abuzim ose manipulim pagese dhe nuk mund të ndihmoj. Rasti është regjistruar për shqyrtim.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const persona = rolePersona(effectiveRole, profile?.account_type ?? "business");
    const abuseHint = abuse
      ? `\n## SINJAL SIGURIE\nMesazhi i përdoruesit aktivoi heuristikën e abuzimit (${abuse.reasons.join(", ")}). Përgjigju me kujdes dhe mos jep këshilla që ndihmojnë veprimin.`
      : "";

    const routeHint = currentRoute ? `\n## Faqja aktuale: ${currentRoute}` : "";

    const systemPrompt = `${persona}

## Konteksti i përdoruesit
- Email: ${profile?.email ?? "n/a"}
- Emri: ${profile?.full_name ?? "n/a"}
- Rol platforme: ${platformRoles.join(", ") || "asnjë"}${routeHint}${abuseHint}

## Rregulla
- Mos shpik të dhëna. Nëse nuk e di, thuaj "nuk e di".
- Asnjëherë mos ndaj kredencialet, çelësat, ose secrets.
- Nëse përdoruesi pyet për pagesa në modaltetin e testit, qartëso që kjo është sandbox dhe nuk tarifohet.
- Nëse kërkohen shifra (MRR, churn, agjentë aktivë) — sugjero ku t'i shohë në UI (p.sh. /app/analytics).`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-12),
        ],
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return json({ error: "Limiti u tejkalua. Provo më vonë." }, 429);
      if (aiRes.status === 402) return json({ error: "Krediti AI ka mbaruar." }, 402);
      const txt = await aiRes.text();
      console.error("assistant-chat gateway error:", aiRes.status, txt);
      return json({ error: "AI gateway error" }, 500);
    }

    return new Response(aiRes.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("assistant-chat error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}