import { createFileRoute } from "@tanstack/react-router";
import { useI18n } from "@/i18n/I18nProvider";
import { useAuth } from "@/auth/AuthProvider";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { current } = useWorkspace();
  return (
    <>
      <PageHeader title={t("nav.settings")} />
      <div className="grid gap-4 p-6 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Account</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div><span className="text-muted-foreground">Email:</span> {user?.email}</div>
            <div><span className="text-muted-foreground">User ID:</span> <code className="text-xs">{user?.id}</code></div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t("common.workspace")}</h3>
          <div className="mt-4 space-y-2 text-sm">
            <div><span className="text-muted-foreground">Name:</span> {current?.name}</div>
            <div><span className="text-muted-foreground">Slug:</span> <code className="text-xs">{current?.slug}</code></div>
            <div><span className="text-muted-foreground">Plan:</span> {current?.plan}</div>
          </div>
        </div>
      </div>
    </>
  );
}