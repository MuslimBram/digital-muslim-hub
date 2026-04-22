import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, GitBranch, Play, MessageSquare, PhoneForwarded, PhoneOff, ListOrdered } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/app/calls/ivr")({
  component: IvrPage,
});

type Flow = Database["public"]["Tables"]["ivr_flows"]["Row"];
type Node = Database["public"]["Tables"]["ivr_nodes"]["Row"];
type NodeType = Database["public"]["Enums"]["ivr_node_type"];

const nodeIcons: Record<NodeType, typeof Play> = {
  menu: ListOrdered,
  play: Play,
  collect: MessageSquare,
  transfer: PhoneForwarded,
  hangup: PhoneOff,
  queue: GitBranch,
  voicemail: MessageSquare,
};

function IvrPage() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [activeFlow, setActiveFlow] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [openNew, setOpenNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [openNode, setOpenNode] = useState(false);
  const [nodeForm, setNodeForm] = useState<{ type: NodeType; label: string; config: string }>({
    type: "menu",
    label: "",
    config: "{}",
  });

  const loadFlows = async () => {
    if (!current) return;
    const { data } = await supabase.from("ivr_flows").select("*").eq("workspace_id", current.id).order("created_at");
    if (data) {
      setFlows(data as Flow[]);
      if (!activeFlow && data[0]) setActiveFlow(data[0].id);
    }
  };
  const loadNodes = async () => {
    if (!activeFlow) {
      setNodes([]);
      return;
    }
    const { data } = await supabase.from("ivr_nodes").select("*").eq("flow_id", activeFlow).order("created_at");
    if (data) setNodes(data as Node[]);
  };

  useEffect(() => {
    loadFlows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);
  useEffect(() => {
    loadNodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFlow]);

  const createFlow = async () => {
    if (!current || !newName.trim()) return;
    const { data, error } = await supabase
      .from("ivr_flows")
      .insert({ workspace_id: current.id, name: newName.trim() })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("calls.ivr.created"));
    setOpenNew(false);
    setNewName("");
    setActiveFlow(data?.id ?? null);
    loadFlows();
  };

  const toggleActive = async (flow: Flow) => {
    await supabase.from("ivr_flows").update({ is_active: !flow.is_active }).eq("id", flow.id);
    loadFlows();
  };

  const removeFlow = async (id: string) => {
    if (!confirm(t("common.delete") + "?")) return;
    await supabase.from("ivr_flows").delete().eq("id", id);
    if (activeFlow === id) setActiveFlow(null);
    loadFlows();
  };

  const addNode = async () => {
    if (!current || !activeFlow) return;
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(nodeForm.config || "{}");
    } catch {
      toast.error("JSON config i pavlefshëm");
      return;
    }
    const { error } = await supabase.from("ivr_nodes").insert({
      workspace_id: current.id,
      flow_id: activeFlow,
      type: nodeForm.type,
      label: nodeForm.label || nodeForm.type,
      config: parsed,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setOpenNode(false);
    setNodeForm({ type: "menu", label: "", config: "{}" });
    loadNodes();
  };

  const removeNode = async (id: string) => {
    await supabase.from("ivr_nodes").delete().eq("id", id);
    loadNodes();
  };

  const current_flow = flows.find((f) => f.id === activeFlow);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={t("calls.ivr.title")}
        description={t("calls.ivr.desc")}
        action={
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> {t("calls.ivr.new")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("calls.ivr.new")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label>{t("calls.ivr.name")}</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Main IVR" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNew(false)}>{t("common.cancel")}</Button>
                <Button onClick={createFlow}>{t("common.create")}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        {/* Flows list */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">
            {t("calls.ivr.flows")}
          </div>
          <div className="divide-y divide-border">
            {flows.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">{t("calls.ivr.emptyFlows")}</div>
            ) : (
              flows.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFlow(f.id)}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent ${activeFlow === f.id ? "bg-primary/10 text-primary" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{f.name}</div>
                    <div className="text-[10px] text-muted-foreground">{f.language.toUpperCase()}</div>
                  </div>
                  {f.is_active && <Badge className="bg-[hsl(142_76%_36%)] text-white text-[10px]">LIVE</Badge>}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Canvas */}
        <Card className="overflow-hidden">
          {current_flow ? (
            <>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h3 className="font-semibold">{current_flow.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{nodes.length} nodes</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Active</span>
                    <Switch checked={current_flow.is_active} onCheckedChange={() => toggleActive(current_flow)} />
                  </div>
                  <Dialog open={openNode} onOpenChange={setOpenNode}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-1 h-3 w-3" /> {t("calls.ivr.addNode")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("calls.ivr.addNode")}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select value={nodeForm.type} onValueChange={(v) => setNodeForm({ ...nodeForm, type: v as NodeType })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="menu">Menu (1=Sales, 2=Support)</SelectItem>
                              <SelectItem value="play">Play message</SelectItem>
                              <SelectItem value="collect">Collect input</SelectItem>
                              <SelectItem value="transfer">Transfer to number</SelectItem>
                              <SelectItem value="queue">Send to queue</SelectItem>
                              <SelectItem value="voicemail">Voicemail</SelectItem>
                              <SelectItem value="hangup">Hangup</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Label</Label>
                          <Input value={nodeForm.label} onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })} placeholder="Welcome message" />
                        </div>
                        <div className="space-y-2">
                          <Label>Config (JSON)</Label>
                          <Input value={nodeForm.config} onChange={(e) => setNodeForm({ ...nodeForm, config: e.target.value })} placeholder='{"text":"Welcome"}' className="font-mono text-xs" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenNode(false)}>{t("common.cancel")}</Button>
                        <Button onClick={addNode}>{t("common.create")}</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="ghost" onClick={() => removeFlow(current_flow.id)} className="text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="min-h-[400px] space-y-3 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] bg-[length:24px_24px] p-6">
                {nodes.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <GitBranch className="h-10 w-10 opacity-30" />
                    <span>{t("calls.ivr.emptyNodes")}</span>
                  </div>
                ) : (
                  nodes.map((n, i) => {
                    const Icon = nodeIcons[n.type];
                    return (
                      <div key={n.id} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {i + 1}
                        </div>
                        <Card className="flex flex-1 items-center gap-3 border-l-4 border-l-primary p-3">
                          <Icon className="h-4 w-4 text-primary" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{n.label || n.type}</div>
                            <code className="block truncate text-[10px] text-muted-foreground">{JSON.stringify(n.config)}</code>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeNode(n.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </Card>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : (
            <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
              {t("calls.ivr.selectFlow")}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
