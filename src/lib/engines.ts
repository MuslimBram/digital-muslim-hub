import {
  TrendingUp, DollarSign, Tag, GitBranch, Heart, Share2,
  UserCog, LineChart, Users2, type LucideIcon,
} from "lucide-react";

export type EngineKey =
  | "growth" | "revenue" | "pricing" | "funnel" | "retention"
  | "viral" | "personalization" | "demand" | "workforce";

export interface EngineMeta {
  key: EngineKey;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const ENGINES: EngineMeta[] = [
  { key: "growth",          name: "Growth Engine",            description: "Acquisition, activation, expansion", icon: TrendingUp, color: "text-emerald-500" },
  { key: "revenue",         name: "Revenue Engine",           description: "MRR, ARPU, ekspansion",              icon: DollarSign, color: "text-amber-500"   },
  { key: "pricing",         name: "Pricing Engine",           description: "Plan-fit, çmime, upsell",            icon: Tag,        color: "text-pink-500"    },
  { key: "funnel",          name: "Funnel Optimization",      description: "Pipeline conversion + bottleneck-e", icon: GitBranch,  color: "text-violet-500"  },
  { key: "retention",       name: "Retention Engine",         description: "Churn risk, NRR, mbajtja",           icon: Heart,      color: "text-rose-500"    },
  { key: "viral",           name: "Viral Engine",             description: "Referral, k-faktor, loops",          icon: Share2,     color: "text-sky-500"     },
  { key: "personalization", name: "Personalization",          description: "Segmente + 1-to-1 taktika",          icon: UserCog,    color: "text-indigo-500"  },
  { key: "demand",          name: "Demand Forecasting",       description: "Volumi i ardhshëm i kërkesës",       icon: LineChart,  color: "text-cyan-500"    },
  { key: "workforce",       name: "Workforce Optimization",   description: "Ngarkesa e agjentëve, oraret",       icon: Users2,     color: "text-orange-500"  },
];

export const ENGINE_BY_KEY: Record<EngineKey, EngineMeta> =
  Object.fromEntries(ENGINES.map((e) => [e.key, e])) as Record<EngineKey, EngineMeta>;

export interface EngineInsight { title: string; detail: string; severity: "info" | "warning" | "critical" | "positive"; }
export interface EngineRecommendation { title: string; action: string; impact: "low" | "medium" | "high"; effort: "low" | "medium" | "high"; }

export interface EngineRunRow {
  id: string;
  workspace_id: string;
  engine: EngineKey;
  status: "pending" | "running" | "completed" | "failed";
  score: number | null;
  summary: string | null;
  insights: EngineInsight[];
  recommendations: EngineRecommendation[];
  metrics: Record<string, unknown>;
  model: string | null;
  triggered_by: string;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}