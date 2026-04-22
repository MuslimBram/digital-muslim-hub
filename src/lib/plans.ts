export type PlanTier = "start" | "growth" | "professional" | "enterprise";
export type BillingCycle = "monthly" | "quarterly" | "semiannual" | "annual";

export const PLAN_DEFINITIONS: {
  tier: PlanTier;
  name: string;
  monthly: number; // in EUR
  highlight?: boolean;
  badge?: string;
  features: string[];
  limits: {
    images: string;
    video: string;
    channels: string;
    aiReplies: string;
    team: string;
    businesses: string;
  };
}[] = [
  {
    tier: "start",
    name: "Start",
    monthly: 49,
    features: [
      "CRM bazë & pipeline",
      "Unified inbox",
      "Helpdesk",
      "Email support",
    ],
    limits: {
      images: "5 imazhe / ditë",
      video: "30 sek video / ditë",
      channels: "3 kanale",
      aiReplies: "25 AI replies / ditë",
      team: "2 anëtarë",
      businesses: "1 biznes",
    },
  },
  {
    tier: "growth",
    name: "Growth",
    monthly: 99,
    badge: "Më i preferuari",
    highlight: true,
    features: [
      "Të gjitha tek Start",
      "Automation workflows",
      "AI Brain + KB",
      "Call center bazë",
      "Priority support",
    ],
    limits: {
      images: "15 imazhe / ditë",
      video: "120 sek video / ditë",
      channels: "7 kanale",
      aiReplies: "75 AI replies / ditë",
      team: "5 anëtarë",
      businesses: "2 biznese",
    },
  },
  {
    tier: "professional",
    name: "Professional",
    monthly: 199,
    features: [
      "Të gjitha tek Growth",
      "IVR + Wallboard",
      "Dialer kampanja",
      "Analitikë e avancuar",
      "API access",
    ],
    limits: {
      images: "50 imazhe / ditë",
      video: "300 sek video / ditë",
      channels: "15 kanale",
      aiReplies: "200 AI replies / ditë",
      team: "15 anëtarë",
      businesses: "5 biznese",
    },
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    monthly: 399,
    features: [
      "Pa limit gjithçka",
      "SLA i dedikuar",
      "White-label",
      "Account manager",
      "Custom integrime",
    ],
    limits: {
      images: "Pa limit",
      video: "Pa limit",
      channels: "Pa limit",
      aiReplies: "Pa limit",
      team: "Pa limit",
      businesses: "Pa limit",
    },
  },
];

export const CYCLE_DISCOUNT: Record<BillingCycle, number> = {
  monthly: 0,
  quarterly: 0.05,
  semiannual: 0.1,
  annual: 0.15,
};

export const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function effectiveMonthly(monthlyEur: number, cycle: BillingCycle) {
  return monthlyEur * (1 - CYCLE_DISCOUNT[cycle]);
}

export function totalForCycle(monthlyEur: number, cycle: BillingCycle) {
  return effectiveMonthly(monthlyEur, cycle) * CYCLE_MONTHS[cycle];
}