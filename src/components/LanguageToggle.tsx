import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/I18nProvider";
import { Languages } from "lucide-react";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(locale === "sq" ? "en" : "sq")}
      className="gap-1.5"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="text-xs font-semibold uppercase">{locale}</span>
    </Button>
  );
}