import { createFileRoute, Outlet, Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, Phone, ListOrdered, GitBranch, Mic, Eye, Tv } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/calls")({
  component: CallsLayout,
});

function CallsLayout() {
  const { t } = useI18n();
  const location = useLocation();

  const tabs = [
    { to: "/app/calls", icon: LayoutDashboard, label: t("calls.tab.overview"), exact: true },
    { to: "/app/calls/queues", icon: ListOrdered, label: t("calls.tab.queues") },
    { to: "/app/calls/ivr", icon: GitBranch, label: t("calls.tab.ivr") },
    { to: "/app/calls/recordings", icon: Mic, label: t("calls.tab.recordings") },
    { to: "/app/calls/supervisor", icon: Eye, label: t("calls.tab.supervisor") },
    { to: "/app/calls/wallboard", icon: Tv, label: t("calls.tab.wallboard") },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? location.pathname === to : location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border bg-background/40 px-4 py-2 backdrop-blur-sm">
        <Phone className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("calls.title")}</h2>
        <nav className="ml-6 flex flex-wrap items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive(tab.to, tab.exact)
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}
