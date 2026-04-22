import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mic, Download, Trash2, Play } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useI18n } from "@/i18n/I18nProvider";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/app/calls/recordings")({
  component: RecordingsPage,
});

interface Rec {
  id: string;
  call_id: string;
  storage_path: string;
  duration_seconds: number;
  created_at: string;
  calls: { from_number: string; to_number: string; direction: string } | null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function RecordingsPage() {
  const { current } = useWorkspace();
  const { t } = useI18n();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);

  const load = async () => {
    if (!current) return;
    const { data } = await supabase
      .from("call_recordings")
      .select("id, call_id, storage_path, duration_seconds, created_at, calls(from_number, to_number, direction)")
      .eq("workspace_id", current.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setRecs(data as unknown as Rec[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const remove = async (id: string) => {
    if (!confirm(t("common.delete") + "?")) return;
    await supabase.from("call_recordings").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader title={t("calls.rec.title")} description={t("calls.rec.desc")} />

      <Card className="overflow-hidden">
        {recs.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <Mic className="mx-auto mb-2 h-10 w-10 opacity-30" />
            {t("calls.rec.empty")}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recs.map((r) => (
              <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/40">
                <Button
                  variant={playing === r.id ? "default" : "outline"}
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => setPlaying(playing === r.id ? null : r.id)}
                >
                  <Play className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm">
                    {r.calls?.direction === "inbound" ? r.calls?.from_number : r.calls?.to_number}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </div>
                </div>
                {/* mock waveform */}
                <div className="hidden items-end gap-0.5 md:flex">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <span
                      key={i}
                      className={`w-0.5 rounded-full ${playing === r.id ? "bg-primary" : "bg-muted-foreground/40"}`}
                      style={{ height: `${10 + Math.abs(Math.sin(i + r.id.length)) * 20}px` }}
                    />
                  ))}
                </div>
                <Badge variant="secondary" className="font-mono">{fmt(r.duration_seconds)}</Badge>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled>
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => remove(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
