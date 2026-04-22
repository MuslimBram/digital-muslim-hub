import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/app/analytics")({
  component: () => {
    const { t } = useI18n();
    return (<><PageHeader title={t("nav.analytics")} /><EmptyState icon={BarChart3} title={t("empty.comingSoon")} description={t("empty.module")} /></>);
  },
});