import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Instagram, Facebook, Linkedin, Youtube, Twitter, MessageCircle,
  AtSign, Send, Image as ImageIcon, MapPin, Link2, Plus, Trash2, RefreshCw,
  ShieldAlert, Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/channels")({
  head: () => ({
    meta: [
      { title: "Channels — Connect Social Accounts" },
      { name: "description", content: "Lidh Instagram, Facebook, LinkedIn, TikTok, YouTube, Twitter/X dhe më shumë." },
    ],
  }),
  component: ChannelsPage,
});

type Provider =
  | "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube"
  | "twitter" | "threads" | "bluesky" | "mastodon" | "pinterest"
  | "google_business" | "start_page" | "custom";

interface ProviderMeta {
  id: Provider;
  name: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  brand: string; // tailwind text color
  kinds: { value: string; label: string }[];
  available: boolean; // OAuth implemented?
}

const PROVIDERS: ProviderMeta[] = [
  { id: "instagram", name: "Instagram", subtitle: "Business, Creator, or Personal", icon: Instagram, brand: "text-pink-500",
    kinds: [{ value: "business", label: "Business" }, { value: "creator", label: "Creator" }, { value: "personal", label: "Personal" }], available: false },
  { id: "threads", name: "Threads", subtitle: "Profile", icon: AtSign, brand: "text-foreground",
    kinds: [{ value: "profile", label: "Profile" }], available: false },
  { id: "linkedin", name: "LinkedIn", subtitle: "Page or Profile", icon: Linkedin, brand: "text-blue-600",
    kinds: [{ value: "page", label: "Page" }, { value: "profile", label: "Profile" }], available: false },
  { id: "facebook", name: "Facebook", subtitle: "Page or Group", icon: Facebook, brand: "text-blue-500",
    kinds: [{ value: "page", label: "Page" }, { value: "group", label: "Group" }], available: false },
  { id: "bluesky", name: "Bluesky", subtitle: "Profile", icon: AtSign, brand: "text-sky-500",
    kinds: [{ value: "profile", label: "Profile" }], available: false },
  { id: "youtube", name: "YouTube", subtitle: "Channel", icon: Youtube, brand: "text-red-600",
    kinds: [{ value: "channel", label: "Channel" }], available: false },
  { id: "tiktok", name: "TikTok", subtitle: "Business or Personal", icon: MessageCircle, brand: "text-foreground",
    kinds: [{ value: "business", label: "Business" }, { value: "personal", label: "Personal" }], available: false },
  { id: "mastodon", name: "Mastodon", subtitle: "Profile", icon: AtSign, brand: "text-purple-500",
    kinds: [{ value: "profile", label: "Profile" }], available: false },
  { id: "pinterest", name: "Pinterest", subtitle: "Business or Profile", icon: ImageIcon, brand: "text-red-500",
    kinds: [{ value: "business", label: "Business" }, { value: "profile", label: "Profile" }], available: false },
  { id: "google_business", name: "Google Business", subtitle: "Profile", icon: MapPin, brand: "text-green-600",
    kinds: [{ value: "profile", label: "Profile" }], available: false },
  { id: "twitter", name: "Twitter / X", subtitle: "Profile", icon: Twitter, brand: "text-foreground",
    kinds: [{ value: "profile", label: "Profile" }], available: false },
  { id: "start_page", name: "Start Page", subtitle: "Simple, powerful link-in-bio", icon: Link2, brand: "text-primary",
    kinds: [{ value: "profile", label: "Page" }], available: true },
];

interface SocialAccount {
  id: string;
  workspace_id: string;
  provider: Provider;
  kind: string;
  status: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string | null;
  last_synced_at: string | null;
  created_at: string;
}

function ChannelsPage() {
  const { current } = useWorkspace();
  const { isUnlimited } = useUserRole();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [selected, setSelected] = useState<ProviderMeta | null>(null);

  const load = async () => {
    if (!current) return;
    setLoading(true);
    const { data } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false });
    setAccounts((data ?? []) as SocialAccount[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [current?.id]);

  // Realtime updates
  useEffect(() => {
    if (!current) return;
    const ch = supabase
      .channel(`social_accounts:${current.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "social_accounts", filter: `workspace_id=eq.${current.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const remove = async (id: string) => {
    if (!confirm("Të shkëputim këtë llogari?")) return;
    const { error } = await supabase.from("social_accounts").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("U shkëput"); load(); }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Kanalet Sociale</h1>
          <p className="text-sm text-muted-foreground">
            Lidh llogaritë sociale për të menaxhuar postimet, mesazhet dhe komentet nga një vend i vetëm.
          </p>
        </div>
        <Button onClick={() => setPicker(true)}>
          <Plus className="mr-2 h-4 w-4" />Connect a New Channel
        </Button>
      </div>

      {!isUnlimited && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-500" />
            <div className="text-sm">
              <div className="font-medium">Lidhja e re kërkon pëlqim nga Admini</div>
              <p className="text-muted-foreground">
                Vetëm Owner/Admin i platformës mund të aktivizojë OAuth për provider të rinj. Llogaritë e lidhura nga Admini bëhen të disponueshme për të gjithë anëtarët e workspace-it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="connected">
        <TabsList>
          <TabsTrigger value="connected">Të lidhura ({accounts.length})</TabsTrigger>
          <TabsTrigger value="custom">Custom Channels</TabsTrigger>
        </TabsList>

        <TabsContent value="connected" className="space-y-3 pt-4">
          {loading && <p className="text-sm text-muted-foreground">Duke ngarkuar…</p>}
          {!loading && accounts.length === 0 && (
            <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Asnjë kanal i lidhur. Kliko <b>Connect a New Channel</b> për të filluar.</p>
            </CardContent></Card>
          )}
          {accounts.map((a) => {
            const meta = PROVIDERS.find((p) => p.id === a.provider);
            const Icon = meta?.icon ?? Link2;
            return (
              <Card key={a.id}>
                <CardContent className="flex items-center gap-4 py-4">
                  <Icon className={`h-8 w-8 ${meta?.brand ?? "text-foreground"}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{a.display_name ?? a.username ?? meta?.name}</span>
                      <Badge variant={a.status === "connected" ? "default" : a.status === "error" || a.status === "expired" ? "destructive" : "secondary"}>
                        {a.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {meta?.name} · {a.kind}{a.username ? ` · @${a.username}` : ""}
                    </div>
                  </div>
                  {(isUnlimited || true) && (
                    <>
                      <Button size="icon" variant="ghost" title="Resinkronizo">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(a.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="custom" className="pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Custom Channels</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Përdor tabelën <b>workspace_integrations</b> në <a href="/app/settings/integrations" className="text-primary underline">Integrime</a> për të lidhur kanale të personalizuara (WhatsApp Cloud, Twilio SMS, Telegram Bot, Resend Email).
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChannelPicker open={picker} onOpenChange={setPicker} onPick={(p) => { setSelected(p); setPicker(false); }} />
      <ConnectChannelDialog
        provider={selected}
        workspaceId={current?.id}
        canConnect={isUnlimited}
        onClose={() => setSelected(null)}
        onSaved={() => { setSelected(null); load(); }}
      />
    </div>
  );
}

function ChannelPicker({ open, onOpenChange, onPick }: {
  open: boolean; onOpenChange: (v: boolean) => void; onPick: (p: ProviderMeta) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect a New Channel</DialogTitle>
          <DialogDescription>Zgjidh një platformë për ta lidhur me workspace-in tënd.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => onPick(p)}
              className="group flex flex-col items-start gap-2 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary hover:shadow-md"
            >
              <p.icon className={`h-7 w-7 ${p.brand}`} />
              <div>
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.subtitle}</div>
              </div>
              {!p.available && <Badge variant="outline" className="text-[10px]">Admin only · OAuth pending</Badge>}
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-dashed bg-muted/30 p-3 text-sm">
          <span className="text-muted-foreground">Can't find it?</span>
          <Button variant="ghost" size="sm">Request a channel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ConnectChannelDialog({ provider, workspaceId, canConnect, onClose, onSaved }: {
  provider: ProviderMeta | null;
  workspaceId?: string;
  canConnect: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<string>("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (provider) {
      setKind(provider.kinds[0]?.value ?? "profile");
      setUsername("");
      setDisplayName("");
    }
  }, [provider?.id]);

  if (!provider) return null;

  const save = async () => {
    if (!workspaceId) return;
    if (!username && !displayName) {
      toast.error("Plotëso username ose emrin e llogarisë");
      return;
    }
    const { error } = await supabase.from("social_accounts").insert({
      workspace_id: workspaceId,
      provider: provider.id,
      kind: kind as "profile" | "page" | "group" | "channel" | "business" | "creator" | "personal",
      status: "pending",
      username: username || null,
      display_name: displayName || username || provider.name,
    });
    if (error) toast.error(error.message);
    else { toast.success("Llogaria u shtua. OAuth real do të aktivizohet nga Admini."); onSaved(); }
  };

  return (
    <Dialog open={!!provider} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <provider.icon className={`h-5 w-5 ${provider.brand}`} />
            Lidh {provider.name}
          </DialogTitle>
          <DialogDescription>{provider.subtitle}</DialogDescription>
        </DialogHeader>

        {!canConnect && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <div className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 text-amber-500" />
              <div>
                <div className="font-medium">Lidhja kërkon Admin</div>
                <p className="text-muted-foreground">
                  Mund të rezervosh një llogari si <b>pending</b>. Admini do të aktivizojë OAuth për ta finalizuar lidhjen.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {provider.kinds.length > 1 && (
            <div>
              <label className="text-xs font-medium">Lloji i llogarisë</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {provider.kinds.map((k) => (
                  <button
                    key={k.value}
                    onClick={() => setKind(k.value)}
                    className={`rounded-md border px-3 py-1 text-xs ${kind === k.value ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="text-xs font-medium">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="p.sh. muslim_official" />
          </div>
          <div>
            <label className="text-xs font-medium">Emri i shfaqur</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="p.sh. Muslimi Digital" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Anulo</Button>
          <Button onClick={save}>{canConnect ? "Lidh tani" : "Rezervo (pending)"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}