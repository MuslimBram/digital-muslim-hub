import { createFileRoute } from "@tanstack/react-router";
import { Headphones } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/app/helpdesk")({
  component: () => {
    const { t } = useI18n();
    return (<><PageHeader title={t("nav.helpdesk")} /><EmptyState icon={Headphones} title={t("empty.comingSoon")} description={t("empty.module")} /></>);
  },
});