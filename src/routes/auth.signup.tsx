import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Briefcase, User as UserIcon, Heart, Check, Eye, EyeOff } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PLAN_DEFINITIONS, CYCLE_DISCOUNT, effectiveMonthly, type BillingCycle, type PlanTier } from "@/lib/plans";
import { toast } from "sonner";

type AccountType = "business" | "freelancer" | "ambassador";

interface SignupSearch {
  plan?: PlanTier;
  cycle?: BillingCycle;
  ref?: string;
}

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
  validateSearch: (search: Record<string, unknown>): SignupSearch => ({
    plan: (search.plan as PlanTier) || undefined,
    cycle: (search.cycle as BillingCycle) || undefined,
    ref: (search.ref as string) || undefined,
  }),
});

const securityCodeSchema = z
  .string()
  .regex(/^\d+$/, "Vetëm shifra")
  .min(4, "Min 4 shifra")
  .max(6, "Max 6 shifra");

const credSchema = z.object({
  email: z.string().trim().email("Email i pavlefshëm").max(255),
  password: z.string().min(6, "Min 6 karaktere").max(100),
  fullName: z.string().trim().min(2, "Emër i pavlefshëm").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  companyName: z.string().trim().max(100).optional().or(z.literal("")),
});

async function sha256Hex(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/signup" });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountType, setAccountType] = useState<AccountType>("business");
  const [planTier, setPlanTier] = useState<PlanTier>(search.plan ?? "growth");
  const [cycle, setCycle] = useState<BillingCycle>(search.cycle ?? "monthly");

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(search.ref ?? "");

  const [securityCode, setSecurityCode] = useState("");
  const [securityCodeConfirm, setSecurityCodeConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const next = () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      const parsed = credSchema.safeParse({ email, password, fullName, phone, companyName });
      if (!parsed.success) {
        toast.error(parsed.error.issues[0].message);
        return;
      }
      setStep(3);
    }
  };

  const back = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (step !== 3) return next();

    const codeRes = securityCodeSchema.safeParse(securityCode);
    if (!codeRes.success) {
      toast.error(codeRes.error.issues[0].message);
      return;
    }
    if (securityCode !== securityCodeConfirm) {
      toast.error("Kodet nuk përputhen");
      return;
    }

    setLoading(true);
    try {
      const securityHash = await sha256Hex(securityCode);
      const redirectUrl = `${window.location.origin}/app/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            account_type: accountType,
            company_name: companyName || null,
            phone: phone || null,
            selected_plan: planTier,
            referral_code: referralCode || null,
            security_code_hash: securityHash,
          },
        },
      });
      if (error) {
        toast.error(error.message?.toLowerCase().includes("registered") ? t("auth.error.exists") : error.message);
        setLoading(false);
        return;
      }
      toast.success("Mirë se erdhe te Muslimi Digital! 🎉");
      navigate({ to: "/app/dashboard" });
    } catch (err) {
      console.error(err);
      toast.error("Gabim i papritur");
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanDef = PLAN_DEFINITIONS.find((p) => p.tier === planTier)!;
  const eff = effectiveMonthly(selectedPlanDef.monthly, cycle);

  return (
    <div className="w-full max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">{t("auth.signup.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors ${
                step === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : step > s
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`h-px flex-1 ${step > s ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Lloji i llogarisë</span>
        <span>Të dhënat</span>
        <span>Plani & Siguria</span>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        {/* STEP 1: Account type */}
        {step === 1 && (
          <div className="grid gap-3">
            {(
              [
                { type: "business" as AccountType, icon: Briefcase, label: "Biznes", desc: "CRM, inbox, automation, AI për ekipin tënd." },
                { type: "freelancer" as AccountType, icon: UserIcon, label: "Freelancer", desc: "Menaxho klientët dhe projektet vetë." },
                { type: "ambassador" as AccountType, icon: Heart, label: "Ambasador (Referim)", desc: "Pa abonim — fito 15% komision për çdo regjistrim që sjell." },
              ] as const
            ).map((opt) => (
              <button
                type="button"
                key={opt.type}
                onClick={() => setAccountType(opt.type)}
                className={`flex items-start gap-4 rounded-xl border p-4 text-left transition-all ${
                  accountType === opt.type
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <opt.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{opt.label}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</div>
                </div>
                {accountType === opt.type && <Check className="h-5 w-5 text-primary" />}
              </button>
            ))}
          </div>
        )}

        {/* STEP 2: Personal data */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullname">{t("common.fullname")} *</Label>
              <Input id="fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
            </div>
            {accountType === "business" && (
              <div className="space-y-2">
                <Label htmlFor="company">Emri i biznesit</Label>
                <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={100} placeholder="Opsional" />
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")} *</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} placeholder="+383..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("common.password")} * (min 6)</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  maxLength={100}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Fshih" : "Shfaq"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref">Kodi i referimit (opsional)</Label>
              <Input id="ref" value={referralCode} onChange={(e) => setReferralCode(e.target.value.toUpperCase())} maxLength={16} placeholder="Nëse të ka ftuar dikush" />
            </div>
          </div>
        )}

        {/* STEP 3: Plan + Security code */}
        {step === 3 && (
          <div className="space-y-6">
            {accountType !== "ambassador" && (
              <Card className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Zgjidh planin (provë 7-ditore falas)</Label>
                  <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-[10px]">
                    {(["monthly", "quarterly", "semiannual", "annual"] as BillingCycle[]).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCycle(c)}
                        className={`rounded-full px-2 py-1 font-medium transition-colors ${
                          cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c === "monthly" ? "1m" : c === "quarterly" ? "3m" : c === "semiannual" ? "6m" : "12m"}
                        {CYCLE_DISCOUNT[c] > 0 && <span className="ml-0.5 opacity-80">-{CYCLE_DISCOUNT[c] * 100}%</span>}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PLAN_DEFINITIONS.map((p) => {
                    const m = effectiveMonthly(p.monthly, cycle);
                    const active = planTier === p.tier;
                    return (
                      <button
                        type="button"
                        key={p.tier}
                        onClick={() => setPlanTier(p.tier)}
                        className={`rounded-lg border p-3 text-left transition-all ${
                          active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="text-xs font-semibold">{p.name}</div>
                        <div className="mt-1 text-lg font-bold">€{m.toFixed(0)}<span className="text-[10px] font-normal text-muted-foreground">/mu</span></div>
                        {p.badge && <div className="mt-1 text-[10px] text-primary">{p.badge}</div>}
                      </button>
                    );
                  })}
                </div>
                <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Fillon me <strong>{selectedPlanDef.name}</strong> @ €{eff.toFixed(0)}/muaj. Pa kartë krediti — paguan vetëm kur prova mbaron.
                </div>
              </Card>
            )}

            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Kodi i sigurisë (4–6 shifra)</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Përdoret për veprime të rëndësishme (anulim plani, tërheqje nga wallet, etj.). Mbaje sekret.
                </p>
              </div>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Kodi</Label>
                  <InputOTP maxLength={6} value={securityCode} onChange={setSecurityCode} pattern="^\d+$">
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Konfirmo</Label>
                  <InputOTP maxLength={6} value={securityCodeConfirm} onChange={setSecurityCodeConfirm} pattern="^\d+$">
                    <InputOTPGroup>
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex gap-2 pt-2">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={back} disabled={loading}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Mbrapa
            </Button>
          )}
          {step < 3 && (
            <Button type="button" onClick={next} className="flex-1" variant="hero">
              Vazhdo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
          {step === 3 && (
            <Button type="submit" className="flex-1" variant="hero" disabled={loading}>
              {loading ? t("common.loading") : "Krijo llogarinë"}
            </Button>
          )}
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link to="/auth/login" className="font-medium text-primary hover:underline">
          {t("common.signin")}
        </Link>
      </p>
    </div>
  );
}