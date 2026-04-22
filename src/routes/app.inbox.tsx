import { createFileRoute } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/app/inbox")({
  component: InboxPage,
});

function InboxPage() {
  const { t } = useI18n();
  return (
    <>
      <PageHeader title={t("inbox.title")} />
      <div className="grid h-[calc(100vh-8rem)] grid-cols-1 md:grid-cols-[300px_1fr_280px]">
        <aside className="border-r border-border p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Conversations</div>
          <div className="mt-4 text-sm text-muted-foreground">{t("inbox.empty.desc")}</div>
        </aside>
        <section className="flex items-center justify-center">
          <EmptyState icon={Inbox} title={t("inbox.empty.title")} description={t("inbox.select")} />
        </section>
        <aside className="hidden border-l border-border p-4 md:block">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Contact</div>
        </aside>
      </div>
    </>
  );
}