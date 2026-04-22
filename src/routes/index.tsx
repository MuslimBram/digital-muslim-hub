import { createFileRoute, Link } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  Inbox,
  Users,
  Workflow,
  Headphones,
  Building2,
  BarChart3,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { t } = useI18n();

  const features = [
    { icon: Users, key: "crm" },
    { icon: Inbox, key: "inbox" },
    { icon: Workflow, key: "automation" },
    { icon: Headphones, key: "helpdesk" },
    { icon: Building2, key: "multi" },
    { icon: BarChart3, key: "analytics" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">{t("brand.name")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">{t("common.signin")}</Button>
            </Link>
            <Link to="/auth/signup">
              <Button variant="hero" size="sm">{t("landing.cta.start")}</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.65_0.22_285)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.55_0.20_240)_0%,transparent_50%)]" />
        <div className="container relative mx-auto px-4 py-24 md:py-36 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/80 backdrop-blur">
            <Sparkles className="h-3 w-3" />
            {t("brand.tagline")}
          </div>
          <h1 className="mt-8 text-balance text-5xl font-bold tracking-tight text-white md:text-7xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-white/70 md:text-xl">
            {t("landing.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth/signup">
              <Button variant="hero" size="lg" className="group">
                {t("landing.cta.start")}
                <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/auth/login">
              <Button variant="outline" size="lg" className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                {t("common.signin")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-[var(--transition-smooth)] hover:border-primary/40 hover:shadow-[var(--shadow-elegant)]"
            >
              <div
                className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl text-primary-foreground"
                style={{ backgroundImage: "var(--gradient-primary)" }}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{t(`landing.feature.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t(`landing.feature.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div
          className="relative overflow-hidden rounded-3xl border border-border p-12 text-center"
          style={{ backgroundImage: "var(--gradient-hero)" }}
        >
          <h2 className="text-3xl font-bold text-white md:text-4xl">{t("landing.hero.title")}</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/70">{t("landing.hero.subtitle")}</p>
          <Link to="/auth/signup" className="inline-block mt-8">
            <Button variant="hero" size="lg">{t("landing.cta.start")}</Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} {t("brand.name")}
      </footer>
    </div>
  );
}
