import { createFileRoute } from "@tanstack/react-router";
import { Workflow } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/app/automation")({
  component: () => {
    const { t } = useI18n();
    return (<><PageHeader title={t("nav.automation")} /><EmptyState icon={Workflow} title={t("empty.comingSoon")} description={t("empty.module")} /></>);
  },
});