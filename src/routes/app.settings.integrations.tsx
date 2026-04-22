import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Webhook, MessageSquare, Send, Phone, Mail, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/settings/integrations")({
  component: IntegrationsPage,
});

const TYPE_META: Record<string, { label: string; icon: any; fields: { key: string; label: string; type?: string; secret?: boolean }[]; configFields?: { key: string; label: string }[] }> = {
  whatsapp_meta: {
    label: "WhatsApp (Meta)",
    icon: MessageSquare,
    fields: [
      { key: "access_token", label: "Access Token", secret: true },
      { key: "phone_number_id", label: "Phone Number ID" },
      { key: "app_secret", label: "App Secret (për signature)", secret: true },
    ],
  },
  telegram: {
    label: "Telegram Bot",
    icon: Send,
    fields: [{ key: "bot_token", label: "Bot Token", secret: true }],
  },
  twilio_sms: {
    label: "Twilio SMS",
    icon: Phone,
    fields: [
      { key: "account_sid", label: "Account SID" },
      { key: "auth_token", label: "Auth Token", secret: true },
      { key: "from_number", label: "From Number (E.164)" },
    ],
  },
  resend_email: {
    label: "Email (Resend)",
    icon: Mail,
    fields: [{ key: "api_key", label: "API Key", secret: true }, { key: "from_email", label: "From Email" }],
  },
};

const ALL_EVENTS = [
  "message.received", "message.sent", "message.delivered", "message.failed",
  "conversation.created", "conversation.assigned", "conversation.closed",
  "contact.created", "contact.updated",
  "deal.created", "deal.stage_changed", "deal.won", "deal.lost",
  "ticket.created", "ticket.resolved",
  "call.started", "call.ended", "call.missed",
  "campaign.completed", "payment.received", "kb.indexed",
];

function IntegrationsPage() {
  const { current } = useWorkspace();
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [endpoints, setEndpoints] = useState<any[]>([]);
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const [{ data: i }, { data: e }, { data: d }] = await Promise.all([
      supabase.from("workspace_integrations").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("webhook_endpoints").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }),
      supabase.from("webhook_deliveries").select("*").eq("workspace_id", current.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setIntegrations(i ?? []);
    setEndpoints(e ?? []);
    setDeliveries(d ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [current?.id]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Integrime & Webhooks</h1>
        <p className="text-sm text-muted-foreground">Lidh kanalet e biznesit dhe konfiguro webhook-et për events.</p>
      </div>

      <Tabs defaultValue="channels">
        <TabsList>
          <TabsTrigger value="channels">Kanale ({integrations.length})</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks ({endpoints.length})</TabsTrigger>
          <TabsTrigger value="deliveries">Aktiviteti</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <AddIntegrationDialog onSaved={load} workspaceId={current?.id} />
          {loading ? <p className="text-sm text-muted-foreground">Duke ngarkuar…</p> : integrations.map((i) => (
            <IntegrationCard key={i.id} integ={i} onChange={load} />
          ))}
          {!loading && integrations.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">S'ke asnjë kanal të lidhur ende.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <AddWebhookDialog onSaved={load} workspaceId={current?.id} />
          {endpoints.map((e) => <WebhookCard key={e.id} endpoint={e} onChange={load} />)}
          {endpoints.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Pa webhook endpoints.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="deliveries">
          <Card>
            <CardHeader><CardTitle>Dërgesat e fundit</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {deliveries.length === 0 && <p className="text-sm text-muted-foreground">Pa aktivitet.</p>}
              {deliveries.map((d) => (
                <div key={d.id} className="flex items-center justify-between rounded border p-3 text-sm">
                  <div>
                    <div className="font-medium">{d.event_type}</div>
                    <div className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString()} · attempt {d.attempt}</div>
                  </div>
                  <Badge variant={d.status === "success" ? "default" : d.status === "dead" ? "destructive" : "secondary"}>
                    {d.status} {d.response_status ? `· ${d.response_status}` : ""}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function IntegrationCard({ integ, onChange }: { integ: any; onChange: () => void }) {
  const meta = TYPE_META[integ.type];
  const Icon = meta?.icon ?? Webhook;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const inboundUrl = `${supabaseUrl}/functions/v1/wh-${integ.type === "whatsapp_meta" ? "whatsapp" : integ.type === "twilio_sms" ? "twilio" : integ.type === "resend_email" ? "resend" : "telegram"}?w=${integ.workspace_id}&i=${integ.id}`;

  const remove = async () => {
    if (!confirm("Të fshijmë këtë integrim?")) return;
    const { error } = await supabase.functions.invoke("integrations-manage", {
      body: { action: "delete", integration_id: integ.id },
    });
    if (error) toast.error(error.message); else { toast.success("U fshi"); onChange(); }
  };
  const rotate = async () => {
    const { error } = await supabase.functions.invoke("integrations-manage", {
      body: { action: "rotate_inbound_secret", integration_id: integ.id },
    });
    if (error) toast.error(error.message); else { toast.success("Secret u rifreskua"); onChange(); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-base">{integ.display_name}</CardTitle>
            <CardDescription>{meta?.label ?? integ.type} · <Badge variant="outline">{integ.status}</Badge></CardDescription>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="ghost" onClick={rotate} title="Rifresko secret"><RefreshCw className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label className="text-xs">Inbound webhook URL (vendose te provider-i)</Label>
        <div className="flex gap-2">
          <Input readOnly value={inboundUrl} className="font-mono text-xs" />
          <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(inboundUrl); toast.success("U kopjua"); }}><Copy className="h-4 w-4" /></Button>
        </div>
        {integ.inbound_secret && (
          <>
            <Label className="text-xs">Verify token / secret</Label>
            <Input readOnly value={integ.inbound_secret} className="font-mono text-xs" />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function AddIntegrationDialog({ workspaceId, onSaved }: { workspaceId?: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("whatsapp_meta");
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const meta = TYPE_META[type];

  const save = async () => {
    if (!workspaceId || !name) return;
    const { error } = await supabase.functions.invoke("integrations-manage", {
      body: { action: "upsert", workspace_id: workspaceId, type, display_name: name, credentials: values, config: {} },
    });
    if (error) toast.error(error.message);
    else { toast.success("U lidh me sukses"); setOpen(false); setValues({}); setName(""); onSaved(); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Shto kanal</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Lidh një kanal të ri</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipi</Label>
            <Select value={type} onValueChange={(v) => { setType(v); setValues({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Emri (p.sh. "Mbështetja Klientit")</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {meta?.fields.map((f) => (
            <div key={f.key}>
              <Label>{f.label}</Label>
              <Input type={f.secret ? "password" : "text"} value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
            </div>
          ))}
        </div>
        <DialogFooter><Button onClick={save}>Ruaj</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WebhookCard({ endpoint, onChange }: { endpoint: any; onChange: () => void }) {
  const remove = async () => {
    if (!confirm("Fshi këtë webhook?")) return;
    const { error } = await supabase.from("webhook_endpoints").delete().eq("id", endpoint.id);
    if (error) toast.error(error.message); else { toast.success("U fshi"); onChange(); }
  };
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">{endpoint.name}</CardTitle>
          <CardDescription className="font-mono text-xs">{endpoint.url}</CardDescription>
        </div>
        <Button size="icon" variant="ghost" onClick={remove}><Trash2 className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {endpoint.events?.map((e: string) => <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>)}
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Signing secret: <code className="font-mono">{endpoint.signing_secret.slice(0, 12)}…</code> · Failures: {endpoint.consecutive_failures}
        </div>
      </CardContent>
    </Card>
  );
}

function AddWebhookDialog({ workspaceId, onSaved }: { workspaceId?: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["message.received", "message.sent"]);
  const toggle = (e: string) => setSelected((s) => s.includes(e) ? s.filter((x) => x !== e) : [...s, e]);

  const save = async () => {
    if (!workspaceId || !url || !name) return;
    const secret = crypto.getRandomValues(new Uint8Array(24));
    const secretHex = Array.from(secret).map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("webhook_endpoints").insert({
      workspace_id: workspaceId,
      name,
      url,
      signing_secret: secretHex,
      events: selected as any,
      is_active: true,
    } as any);
    if (error) toast.error(error.message);
    else { toast.success("U krijua"); setOpen(false); setName(""); setUrl(""); onSaved(); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Shto webhook</Button></DialogTrigger>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Webhook i ri</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Emri</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
          <div>
            <Label>Events</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {ALL_EVENTS.map((e) => (
                <label key={e} className="flex cursor-pointer items-center gap-2 rounded border p-2 text-xs">
                  <input type="checkbox" checked={selected.includes(e)} onChange={() => toggle(e)} />
                  <span className="font-mono">{e}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Ruaj</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}