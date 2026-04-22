import { useEffect, useRef, useState } from "react";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Circle,
  X,
  Delete,
  PhoneIncoming,
  PhoneOutgoing,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSoftphone } from "@/calls/softphoneStore";
import { mockVoipProvider } from "@/calls/mockVoip";
import { useAuth } from "@/auth/AuthProvider";
import { useWorkspace } from "@/auth/WorkspaceProvider";
import { useAgentPresence } from "@/calls/useAgentPresence";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DTMF = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function Softphone() {
  const { user } = useAuth();
  const { current } = useWorkspace();
  const sp = useSoftphone();
  const { setStatus } = useAgentPresence();
  const [elapsed, setElapsed] = useState(0);
  const tickRef = useRef<number | null>(null);

  // Tick timer when active
  useEffect(() => {
    if (sp.state === "in_call" || sp.state === "on_hold") {
      const start = sp.active?.answeredAt ? Date.parse(sp.active.answeredAt) : Date.now();
      tickRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => {
        if (tickRef.current) clearInterval(tickRef.current);
      };
    }
    setElapsed(0);
  }, [sp.state, sp.active?.answeredAt]);

  // Listen for status changes on active call (e.g. mock auto-answer)
  useEffect(() => {
    if (!sp.active || !current) return;
    const channel = supabaseChannel(sp.active.id, (payload) => {
      const newCall = payload.new as { status: string; answered_at: string | null };
      if (newCall.status === "answered" && sp.state === "dialing") {
        sp.setState("in_call");
        sp.setActive({ ...sp.active!, answeredAt: newCall.answered_at ?? new Date().toISOString() });
        void setStatus("on_call");
      }
      if (newCall.status === "missed" || newCall.status === "ended" || newCall.status === "voicemail") {
        sp.reset();
        void setStatus("wrap_up");
        setTimeout(() => setStatus("available"), 5000);
      }
    });
    return () => {
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.active?.id, sp.state]);

  if (!user || !current) return null;

  const startCall = async () => {
    if (!sp.dialpad.trim()) return;
    try {
      sp.setState("dialing");
      const call = await mockVoipProvider.startOutbound({
        workspaceId: current.id,
        fromNumber: "+38344000000",
        toNumber: sp.dialpad.trim(),
        agentId: user.id,
      });
      sp.setActive({
        id: call.id,
        direction: "outbound",
        number: sp.dialpad.trim(),
        startedAt: call.started_at,
      });
      void setStatus("on_call");
    } catch (e) {
      console.error(e);
      toast.error("Thirrja dështoi");
      sp.reset();
    }
  };

  const hangup = async () => {
    if (!sp.active) {
      sp.reset();
      return;
    }
    await mockVoipProvider.hangup(sp.active.id, "user");
    sp.reset();
    void setStatus("wrap_up");
    setTimeout(() => setStatus("available"), 5000);
  };

  const toggleHold = async () => {
    if (!sp.active) return;
    const next = sp.state !== "on_hold";
    await mockVoipProvider.hold(sp.active.id, next);
    sp.setState(next ? "on_hold" : "in_call");
  };

  const toggleMute = async () => {
    if (!sp.active) return;
    sp.setMuted(!sp.muted);
    await mockVoipProvider.logEvent({
      callId: sp.active.id,
      workspaceId: current.id,
      type: sp.muted ? "unmute" : "mute",
    });
  };

  const toggleRecord = async () => {
    if (!sp.active) return;
    if (sp.recording) {
      await mockVoipProvider.stopRecording(sp.active.id, current.id);
    } else {
      await mockVoipProvider.startRecording(sp.active.id, current.id);
    }
    sp.setRecording(!sp.recording);
  };

  if (!sp.open) {
    return (
      <Button
        size="icon"
        onClick={() => sp.setOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-[var(--shadow-elegant)]"
        style={{ backgroundImage: "var(--gradient-primary)" }}
      >
        <Phone className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 z-50 w-80 overflow-hidden border-border bg-card/95 p-0 shadow-[var(--shadow-elegant)] backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-primary/10 to-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Phone className="h-4 w-4 text-primary" />
            {(sp.state === "dialing" || sp.state === "ringing_in") && (
              <span className="absolute -right-1 -top-1 h-2 w-2 animate-ping rounded-full bg-primary" />
            )}
          </div>
          <span className="text-sm font-semibold">Softphone</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => sp.setOpen(false)} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Display */}
      <div className="space-y-2 px-4 py-4">
        {sp.active ? (
          <div className="space-y-1 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              {sp.active.direction === "inbound" ? (
                <PhoneIncoming className="h-3 w-3" />
              ) : (
                <PhoneOutgoing className="h-3 w-3" />
              )}
              <span>{sp.state === "dialing" ? "Po telefonon..." : sp.state === "on_hold" ? "Në pritje" : "Lidhur"}</span>
            </div>
            <div className="font-mono text-lg font-semibold tracking-wider">{sp.active.number}</div>
            {(sp.state === "in_call" || sp.state === "on_hold") && (
              <div className="font-mono text-xs text-primary">{fmt(elapsed)}</div>
            )}
            {sp.recording && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <Circle className="h-2 w-2 fill-current" /> REC
              </Badge>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-right font-mono text-lg tracking-wider">
            {sp.dialpad || <span className="text-muted-foreground">+383...</span>}
          </div>
        )}
      </div>

      {/* Dialpad ose call controls */}
      {!sp.active && (
        <div className="grid grid-cols-3 gap-1 px-4">
          {DTMF.map((d) => (
            <Button
              key={d}
              variant="ghost"
              onClick={() => sp.setDialpad(sp.dialpad + d)}
              className="h-12 text-base font-semibold"
            >
              {d}
            </Button>
          ))}
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between gap-2 px-4 py-4">
        {!sp.active ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sp.setDialpad(sp.dialpad.slice(0, -1))}
              disabled={!sp.dialpad}
              className="h-11 w-11"
            >
              <Delete className="h-4 w-4" />
            </Button>
            <Button
              onClick={startCall}
              disabled={!sp.dialpad.trim()}
              className="h-11 flex-1 bg-[hsl(142_76%_36%)] text-white hover:bg-[hsl(142_76%_30%)]"
            >
              <Phone className="mr-2 h-4 w-4" /> Telefono
            </Button>
            <div className="w-11" />
          </>
        ) : (
          <>
            <Button
              variant={sp.muted ? "default" : "outline"}
              size="icon"
              onClick={toggleMute}
              disabled={sp.state === "dialing"}
              className="h-11 w-11"
            >
              {sp.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button
              variant={sp.state === "on_hold" ? "default" : "outline"}
              size="icon"
              onClick={toggleHold}
              disabled={sp.state === "dialing"}
              className="h-11 w-11"
            >
              {sp.state === "on_hold" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
            <Button
              variant={sp.recording ? "destructive" : "outline"}
              size="icon"
              onClick={toggleRecord}
              disabled={sp.state === "dialing"}
              className="h-11 w-11"
            >
              <Circle className={cn("h-4 w-4", sp.recording && "fill-current")} />
            </Button>
            <Button onClick={hangup} variant="destructive" className="h-11 flex-1">
              <PhoneOff className="mr-2 h-4 w-4" /> Mbyll
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

// ---- helper ----
import { supabase } from "@/integrations/supabase/client";

function supabaseChannel(callId: string, onUpdate: (payload: { new: unknown }) => void) {
  return supabase
    .channel(`softphone-call-${callId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` },
      (payload) => onUpdate(payload as { new: unknown })
    )
    .subscribe();
}
