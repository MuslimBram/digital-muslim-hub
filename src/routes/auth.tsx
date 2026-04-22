import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/auth")({
  component: AuthLayout,
});

function AuthLayout() {
  const { t } = useI18n();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left visual panel */}
      <div
        className="relative hidden flex-col justify-between p-12 lg:flex"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_20%,oklch(0.65_0.22_285)_0%,transparent_50%),radial-gradient(circle_at_70%_60%,oklch(0.55_0.20_240)_0%,transparent_50%)]" />
        <Link to="/" className="relative flex items-center gap-2 text-white">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
            style={{ backgroundImage: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-bold tracking-tight">{t("brand.name")}</span>
        </Link>
        <div className="relative space-y-4 text-white">
          <h2 className="text-3xl font-bold">{t("landing.hero.title")}</h2>
          <p className="max-w-md text-white/70">{t("landing.hero.subtitle")}</p>
        </div>
        <div className="relative text-xs text-white/50">© {new Date().getFullYear()} {t("brand.name")}</div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-col">
        <div className="flex items-center justify-end gap-2 p-4">
          <LanguageToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-4 pb-12">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}