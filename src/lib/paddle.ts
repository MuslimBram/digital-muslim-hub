import { supabase } from "@/integrations/supabase/client";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("VITE_PAYMENTS_CLIENT_TOKEN is not set");

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src*="paddle.com/paddle/v2/paddle.js"]');
    const onReady = () => {
      const env = clientToken.startsWith("test_") ? "sandbox" : "production";
      window.Paddle.Environment.set(env);
      window.Paddle.Initialize({ token: clientToken });
      paddleInitialized = true;
      resolve();
    };
    if (existing && window.Paddle) return onReady();
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      document.head.appendChild(script);
    }
    script.onload = onReady;
    script.onerror = reject;
  });
}

export function getPaddleEnv(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const environment = getPaddleEnv();
  const { data, error } = await supabase.functions.invoke("get-paddle-price", {
    body: { priceId, environment },
  });
  if (error || !data?.paddleId) throw new Error(`Failed to resolve price: ${priceId}`);
  return data.paddleId as string;
}

export interface PlanPriceMap {
  monthly: string;
  quarterly: string;
  semiannual: string;
  annual: string;
}

export const PLAN_PRICE_IDS: Record<"start" | "growth" | "professional" | "enterprise", PlanPriceMap> = {
  start: {
    monthly: "start_monthly",
    quarterly: "start_quarterly",
    semiannual: "start_semiannual",
    annual: "start_annual",
  },
  growth: {
    monthly: "growth_monthly",
    quarterly: "growth_quarterly",
    semiannual: "growth_semiannual",
    annual: "growth_annual",
  },
  professional: {
    monthly: "professional_monthly",
    quarterly: "professional_quarterly",
    semiannual: "professional_semiannual",
    annual: "professional_annual",
  },
  enterprise: {
    monthly: "enterprise_monthly",
    quarterly: "enterprise_quarterly",
    semiannual: "enterprise_semiannual",
    annual: "enterprise_annual",
  },
};