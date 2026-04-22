export type EngineKey =
  | "growth"
  | "revenue"
  | "pricing"
  | "funnel"
  | "retention"
  | "viral"
  | "personalization"
  | "demand"
  | "workforce";

export const ENGINE_LABEL: Record<EngineKey, string> = {
  growth: "Growth Engine",
  revenue: "Revenue Engine",
  pricing: "Pricing Engine",
  funnel: "Funnel Optimization",
  retention: "Retention Engine",
  viral: "Viral Engine",
  personalization: "Personalization Engine",
  demand: "Demand Forecasting",
  workforce: "Workforce Optimization",
};

const BASE = `Ti je një analist biznesi i nivelit ekspert për një SaaS B2B (CRM + Inbox + Helpdesk + Call Center).
Të dhënat reale të biznesit (workspace) të jepen më poshtë.
Përgjigju në SHQIP, konkretisht, me numra dhe veprime të qarta.
Përdor THIRRJEN e funksionit "submit_engine_analysis" për të kthyer rezultatin.`;

export const ENGINE_PROMPT: Record<EngineKey, string> = {
  growth: `${BASE}\n\nFokus: GROWTH ENGINE. Identifiko mundësi rritjeje (acquisition, activation, expansion). Vlerëso shëndetin e rritjes 0-100, jep 3-5 insights, 3-5 rekomandime me ndikim/përpjekje.`,
  revenue: `${BASE}\n\nFokus: REVENUE ENGINE. Analizo MRR, ARPU, ekspansion, leak-e të të ardhurave. Score 0-100 për "revenue health".`,
  pricing: `${BASE}\n\nFokus: PRICING ENGINE. Vlerëso strukturën e plan-eve, çmimin për tier, mundësi për upsell/discount. Score 0-100 për "pricing fit".`,
  funnel: `${BASE}\n\nFokus: FUNNEL OPTIMIZATION. Analizo pipeline conversion (lead→deal→won), identifiko bottleneck-et. Score 0-100 për "funnel efficiency".`,
  retention: `${BASE}\n\nFokus: RETENTION ENGINE. Vlerëso churn risk, NRR, sinjale për mbajtjen e klientëve. Score 0-100 për "retention health".`,
  viral: `${BASE}\n\nFokus: VIRAL ENGINE. Vlerëso programin referral, k-faktorin, mundësitë për viral loops. Score 0-100 për "viral potential".`,
  personalization: `${BASE}\n\nFokus: PERSONALIZATION ENGINE. Identifiko segmente klientësh dhe rekomando taktika 1-to-1. Score 0-100 për "personalization maturity".`,
  demand: `${BASE}\n\nFokus: DEMAND FORECASTING. Parashiko volumin e ardhshëm (calls/messages/leads) bazuar në trende historike. Score 0-100 për "demand visibility".`,
  workforce: `${BASE}\n\nFokus: WORKFORCE OPTIMIZATION. Vlerëso ngarkesën e agjentëve, orarin, mundësitë për përmirësim. Score 0-100 për "workforce efficiency".`,
};

export const TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: "submit_engine_analysis",
    description: "Kthen analizën e strukturuar të engine-t.",
    parameters: {
      type: "object",
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100, description: "Score 0-100 për shëndetin e këtij engine." },
        summary: { type: "string", description: "Përmbledhje 1-2 fjali në shqip." },
        insights: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              detail: { type: "string" },
              severity: { type: "string", enum: ["info", "warning", "critical", "positive"] },
            },
            required: ["title", "detail", "severity"],
            additionalProperties: false,
          },
        },
        recommendations: {
          type: "array",
          minItems: 3,
          maxItems: 6,
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              action: { type: "string", description: "Veprim konkret që mund të ndërmarrë biznesi." },
              impact: { type: "string", enum: ["low", "medium", "high"] },
              effort: { type: "string", enum: ["low", "medium", "high"] },
            },
            required: ["title", "action", "impact", "effort"],
            additionalProperties: false,
          },
        },
      },
      required: ["score", "summary", "insights", "recommendations"],
      additionalProperties: false,
    },
  },
};