/**
 * MockCallProvider — simulon VoIP pa hardware real.
 * Përdor setTimeout për ringing/answer/hangup, integrohet me Supabase
 * përmes events table për të aktivizuar realtime broadcasts.
 *
 * Për ta zëvendësuar me Twilio/Asterisk më vonë: implementoni të njëjtin
 * interface CallProvider dhe ndryshoni vetëm exportin default.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type CallRow = Database["public"]["Tables"]["calls"]["Row"];

export interface CallProvider {
  startOutbound(opts: {
    workspaceId: string;
    fromNumber: string;
    toNumber: string;
    queueId?: string | null;
    contactId?: string | null;
    agentId: string;
  }): Promise<CallRow>;
  simulateInbound(opts: {
    workspaceId: string;
    fromNumber: string;
    toNumber: string;
    queueId?: string | null;
  }): Promise<CallRow>;
  answer(callId: string, agentId: string): Promise<void>;
  hangup(callId: string, reason?: string): Promise<void>;
  hold(callId: string, holding: boolean): Promise<void>;
  startRecording(callId: string, workspaceId: string): Promise<void>;
  stopRecording(callId: string, workspaceId: string): Promise<void>;
  logEvent(opts: { callId: string; workspaceId: string; type: Database["public"]["Enums"]["call_event_type"]; payload?: Record<string, unknown> }): Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const mockVoipProvider: CallProvider = {
  async startOutbound({ workspaceId, fromNumber, toNumber, queueId, contactId, agentId }) {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        workspace_id: workspaceId,
        direction: "outbound",
        from_number: fromNumber,
        to_number: toNumber,
        queue_id: queueId ?? null,
        contact_id: contactId ?? null,
        agent_id: agentId,
        status: "ringing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to start call");

    await this.logEvent({ callId: data.id, workspaceId, type: "ringing" });

    // Simulim: 60% answered pas 2-6 sek, 40% no-answer pas 15s
    const willAnswer = Math.random() < 0.65;
    const ringMs = randomBetween(2000, 6000);

    void (async () => {
      await sleep(ringMs);
      const fresh = await supabase.from("calls").select("status").eq("id", data.id).single();
      if (fresh.data?.status !== "ringing") return; // user cancelled
      if (willAnswer) {
        await this.answer(data.id, agentId);
      } else {
        await sleep(15000);
        const still = await supabase.from("calls").select("status").eq("id", data.id).single();
        if (still.data?.status === "ringing") {
          await this.hangup(data.id, "no_answer");
        }
      }
    })();

    return data;
  },

  async simulateInbound({ workspaceId, fromNumber, toNumber, queueId }) {
    const { data, error } = await supabase
      .from("calls")
      .insert({
        workspace_id: workspaceId,
        direction: "inbound",
        from_number: fromNumber,
        to_number: toNumber,
        queue_id: queueId ?? null,
        status: "ringing",
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error || !data) throw error ?? new Error("Failed to simulate inbound");
    await this.logEvent({ callId: data.id, workspaceId, type: "ringing", payload: { source: "simulator" } });
    return data;
  },

  async answer(callId, agentId) {
    const now = new Date().toISOString();
    const { data: call } = await supabase.from("calls").select("workspace_id, started_at").eq("id", callId).single();
    if (!call) return;
    const wait = Math.floor((Date.parse(now) - Date.parse(call.started_at)) / 1000);
    await supabase
      .from("calls")
      .update({ status: "answered", agent_id: agentId, answered_at: now, wait_seconds: wait })
      .eq("id", callId);
    await this.logEvent({ callId, workspaceId: call.workspace_id, type: "answered" });
  },

  async hangup(callId, reason) {
    const now = new Date().toISOString();
    const { data: call } = await supabase
      .from("calls")
      .select("workspace_id, started_at, answered_at, status")
      .eq("id", callId)
      .single();
    if (!call) return;
    const startMs = Date.parse(call.answered_at ?? call.started_at);
    const duration = Math.max(0, Math.floor((Date.parse(now) - startMs) / 1000));
    const finalStatus =
      call.status === "ringing" && reason === "no_answer" ? "missed" : reason === "voicemail" ? "voicemail" : "ended";
    await supabase
      .from("calls")
      .update({ status: finalStatus, ended_at: now, duration_seconds: duration })
      .eq("id", callId);
    await this.logEvent({ callId, workspaceId: call.workspace_id, type: "hangup", payload: { reason: reason ?? "user" } });
  },

  async hold(callId, holding) {
    const { data: call } = await supabase.from("calls").select("workspace_id").eq("id", callId).single();
    if (!call) return;
    await supabase.from("calls").update({ status: holding ? "on_hold" : "answered" }).eq("id", callId);
    await this.logEvent({ callId, workspaceId: call.workspace_id, type: holding ? "hold" : "unhold" });
  },

  async startRecording(callId, workspaceId) {
    const path = `${workspaceId}/${callId}.mp3`;
    // Mock: krijo metadata pa file real (silent placeholder do shtohet kur ndalon)
    const { data: existing } = await supabase
      .from("call_recordings")
      .select("id")
      .eq("call_id", callId)
      .maybeSingle();
    if (!existing) {
      await supabase.from("call_recordings").insert({
        workspace_id: workspaceId,
        call_id: callId,
        storage_path: path,
        duration_seconds: 0,
      });
    }
    await this.logEvent({ callId, workspaceId, type: "recording_start" });
  },

  async stopRecording(callId, workspaceId) {
    const { data: call } = await supabase.from("calls").select("duration_seconds").eq("id", callId).single();
    await supabase
      .from("call_recordings")
      .update({ duration_seconds: call?.duration_seconds ?? 0 })
      .eq("call_id", callId);
    await this.logEvent({ callId, workspaceId, type: "recording_stop" });
  },

  async logEvent({ callId, workspaceId, type, payload }) {
    await supabase.from("call_events").insert({
      call_id: callId,
      workspace_id: workspaceId,
      event_type: type,
      payload: payload ?? {},
    });
  },
};
