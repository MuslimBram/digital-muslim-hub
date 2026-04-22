import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { Settings as SettingsIcon, CreditCard, Heart } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { t } = useI18n();
  const location = useLocation();

  const tabs = [
    { to: "/app/settings", label: t("nav.settings"), icon: SettingsIcon, exact: true },
    { to: "/app/settings/billing", label: "Faturimi", icon: CreditCard, exact: false },
  ];

  const isActive = (to: string, exact: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="flex flex-col">
      <nav className="flex gap-1 border-b border-border bg-background/50 px-6 pt-3">
        {tabs.map((tab) => {
          const active = isActive(tab.to, tab.exact);
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <Outlet />
    </div>
  );
}