import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Plus, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/app/crm/contacts")({
  component: ContactsPage,
});

interface Contact {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
}

function ContactsPage() {
  const { t } = useI18n();
  const { current } = useWorkspace();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("contacts")
      .select("id, full_name, email, phone, status, created_at")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false });
    if (data) setContacts(data as Contact[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [current?.id]);

  const onCreate = async () => {
    if (!current || !form.full_name) return;
    setSaving(true);
    const { error } = await supabase.from("contacts").insert({
      workspace_id: current.id,
      full_name: form.full_name,
      email: form.email || null,
      phone: form.phone || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contact created");
    setOpen(false);
    setForm({ full_name: "", email: "", phone: "" });
    load();
  };

  return (
    <>
      <PageHeader
        title={t("crm.contacts.title")}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="hero" size="sm">
                <Plus className="h-4 w-4" /> {t("crm.contacts.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("crm.contacts.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fn">{t("common.fullname")}</Label>
                  <Input id="fn" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="em">{t("common.email")}</Label>
                  <Input id="em" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph">Phone</Label>
                  <Input id="ph" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                <Button variant="hero" onClick={onCreate} disabled={saving || !form.full_name}>
                  {saving ? t("common.loading") : t("common.create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      {contacts.length === 0 ? (
        <EmptyState icon={Users} title={t("crm.contacts.empty")} action={
          <Button variant="hero" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> {t("crm.contacts.new")}
          </Button>
        } />
      ) : (
        <div className="p-6">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">{t("common.fullname")}</th>
                  <th className="px-4 py-3 text-left">Contact</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.full_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {c.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</span>}
                        {c.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.phone}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary">{c.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}