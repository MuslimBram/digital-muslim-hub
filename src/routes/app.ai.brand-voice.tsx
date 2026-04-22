import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Brain, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/app/ai/brand-voice")({
  component: BrandVoicePage,
});

interface BrandVoice {
  business_name: string;
  industry: string;
  tone: string;
  values: string;
  target_audience: string;
  language: string;
  do_use: string;
  do_not_use: string;
  example_content: string;
}

const empty: BrandVoice = {
  business_name: "",
  industry: "",
  tone: "professional",
  values: "",
  target_audience: "",
  language: "sq",
  do_use: "",
  do_not_use: "",
  example_content: "",
};

function BrandVoicePage() {
  const { t } = useI18n();
  const { current } = useWorkspace();
  const [form, setForm] = useState<BrandVoice>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!current) return;
      setLoading(true);
      const { data } = await supabase
        .from("ai_brand_voice")
        .select("*")
        .eq("workspace_id", current.id)
        .maybeSingle();
      if (data) {
        setForm({
          business_name: data.business_name ?? "",
          industry: data.industry ?? "",
          tone: data.tone ?? "professional",
          values: data.values ?? "",
          target_audience: data.target_audience ?? "",
          language: data.language ?? "sq",
          do_use: data.do_use ?? "",
          do_not_use: data.do_not_use ?? "",
          example_content: data.example_content ?? "",
        });
      }
      setLoading(false);
    };
    load();
  }, [current?.id]);

  const save = async () => {
    if (!current) return;
    setSaving(true);
    const { error } = await supabase
      .from("ai_brand_voice")
      .upsert(
        { workspace_id: current.id, ...form },
        { onConflict: "workspace_id" }
      );
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t("ai.brand.saved"));
    }
  };

  const set = <K extends keyof BrandVoice>(k: K, v: BrandVoice[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <PageHeader
        title={t("ai.brand.title")}
        description={t("ai.brand.desc")}
        actions={
          <Button variant="hero" size="sm" onClick={save} disabled={saving || loading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("common.save")}
          </Button>
        }
      />
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg shadow-[var(--shadow-glow)]"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              <Brain className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-base font-semibold">AI Brand Profile</h2>
              <p className="text-xs text-muted-foreground">Konfigurimi përdoret në çdo bisedë & content.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="bn">{t("ai.brand.businessName")}</Label>
              <Input id="bn" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ind">{t("ai.brand.industry")}</Label>
              <Input id="ind" value={form.industry} onChange={(e) => set("industry", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai.brand.tone")}</Label>
              <Select value={form.tone} onValueChange={(v) => set("tone", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="enthusiastic">Enthusiastic</SelectItem>
                  <SelectItem value="warm">Warm & empathetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("ai.brand.language")}</Label>
              <Select value={form.language} onValueChange={(v) => set("language", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sq">Shqip</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="val">{t("ai.brand.values")}</Label>
              <Textarea id="val" rows={2} value={form.values} onChange={(e) => set("values", e.target.value)} placeholder="P.sh. transparencë, shpejtësi, kujdes ndaj klientit" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="aud">{t("ai.brand.audience")}</Label>
              <Textarea id="aud" rows={2} value={form.target_audience} onChange={(e) => set("target_audience", e.target.value)} placeholder="P.sh. biznese të vogla në Shqipëri & Kosovë, mosha 25–55" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="du">{t("ai.brand.doUse")}</Label>
              <Textarea id="du" rows={3} value={form.do_use} onChange={(e) => set("do_use", e.target.value)} placeholder="P.sh. fjalë pozitive, shembuj konkretë, emoji 1–2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dn">{t("ai.brand.doNotUse")}</Label>
              <Textarea id="dn" rows={3} value={form.do_not_use} onChange={(e) => set("do_not_use", e.target.value)} placeholder="P.sh. zhargon teknik, premtime të paqarta" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ex">{t("ai.brand.example")}</Label>
              <Textarea id="ex" rows={4} value={form.example_content} onChange={(e) => set("example_content", e.target.value)} placeholder="Ngjit një shembull të një postimi/email që e përfaqëson tonin..." />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}