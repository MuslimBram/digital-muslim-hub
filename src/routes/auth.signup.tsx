import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const redirectUrl = typeof window !== "undefined" ? `${window.location.origin}/app/dashboard` : undefined;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName },
      },
    });
    setLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase().includes("registered") ? t("auth.error.exists") : error.message;
      toast.error(msg);
      return;
    }
    toast.success("Welcome to Muslimi Digital!");
    navigate({ to: "/app/dashboard" });
  };

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{t("auth.signup.title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullname">{t("common.fullname")}</Label>
          <Input id="fullname" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t("common.email")}</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t("common.password")}</Label>
          <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" variant="hero" className="w-full" disabled={loading}>
          {loading ? t("common.loading") : t("common.signup")}
        </Button>
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