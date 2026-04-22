import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";
import { embedText } from "../_shared/embeddings.ts";

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    const supabase = getUserClient(authHeader);
    const admin = getAdminClient();

    const { workspaceId, conversationId, message } = await req.json();
    if (!workspaceId || !message) {
      return new Response(JSON.stringify({ error: "workspaceId & message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Ensure / create conversation
    let convId = conversationId as string | undefined;
    if (!convId) {
      const { data: newConv } = await supabase
        .from("ai_conversations")
        .insert({ workspace_id: workspaceId, user_id: userId, title: message.slice(0, 60) })
        .select("id").single();
      convId = newConv?.id;
    }
    if (!convId) throw new Error("Could not create conversation");

    // 2. Save user message
    await admin.from("ai_messages").insert({
      workspace_id: workspaceId, conversation_id: convId, role: "user", content: message,
    });

    // 3. Load assistant config + brand voice + memory
    const [{ data: assistant }, { data: brand }, { data: memory }] = await Promise.all([
      supabase.from("ai_assistants").select("*").eq("workspace_id", workspaceId).maybeSingle(),
      supabase.from("ai_brand_voice").select("*").eq("workspace_id", workspaceId).maybeSingle(),
      supabase.from("ai_memory").select("key, value").eq("workspace_id", workspaceId).eq("scope", "workspace").limit(20),
    ]);

    // 4. RAG: embed query + match chunks
    let ragContext = "";
    let citations: { title: string; id: string }[] = [];
    try {
      const queryEmbedding = await embedText(message, LOVABLE_API_KEY);
      const { data: matches } = await admin.rpc("match_kb_chunks", {
        query_embedding: queryEmbedding,
        match_workspace_id: workspaceId,
        match_count: 5,
        similarity_threshold: 0.4,
      });
      if (matches && matches.length > 0) {
        ragContext = matches.map((m: { content: string; document_title: string }, i: number) =>
          `[Source ${i + 1}: ${m.document_title}]\n${m.content}`
        ).join("\n\n---\n\n");
        citations = matches.map((m: { id: string; document_title: string }) => ({ id: m.id, title: m.document_title }));
      }
    } catch (e) {
      console.error("RAG error:", e);
    }

    // 5. Load conversation history (last 10)
    const { data: history } = await supabase
      .from("ai_messages").select("role, content")
      .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(20);

    // 6. Build system prompt
    const brandLines = brand ? [
      brand.business_name && `Business: ${brand.business_name}`,
      brand.industry && `Industry: ${brand.industry}`,
      `Tone: ${brand.tone}`,
      brand.values && `Values: ${brand.values}`,
      brand.target_audience && `Audience: ${brand.target_audience}`,
      `Language: ${brand.language === "sq" ? "Albanian (Shqip)" : "English"}`,
      brand.do_use && `Always: ${brand.do_use}`,
      brand.do_not_use && `Never: ${brand.do_not_use}`,
    ].filter(Boolean).join("\n") : "Tone: professional. Language: Albanian.";

    const memoryLines = memory && memory.length > 0
      ? memory.map((m: { key: string; value: string }) => `- ${m.key}: ${m.value}`).join("\n")
      : "(no facts yet)";

    const systemPrompt = `${assistant?.system_prompt ?? "You are an AI Brain for a business SaaS platform. Help with customer interactions, content, and insights."}

## Brand Voice
${brandLines}

## Long-term memory
${memoryLines}

${ragContext ? `## Knowledge base (use these to ground answers, cite as [Source N])\n${ragContext}` : ""}

Reply concisely in the brand language. Be helpful and warm.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((h: { role: string; content: string }) => ({ role: h.role, content: h.content })),
    ];

    // 7. Stream from Lovable AI
    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: assistant?.model ?? "openai/gpt-5-mini",
        messages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limiti i kërkesave u tejkalua. Provo më vonë." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Krediti AI ka mbaruar. Shto kredite në Workspace > Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errBody = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errBody);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pipe stream + capture full text to save
    const reader = aiRes.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullText = "";
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        // Send conversation id first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "conv", id: convId, citations })}\n\n`));
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let nl: number;
            while ((nl = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, nl).trim();
              buffer = buffer.slice(nl + 1);
              if (!line.startsWith("data: ")) continue;
              const json = line.slice(6).trim();
              if (json === "[DONE]") continue;
              try {
                const parsed = JSON.parse(json);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullText += delta;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: delta })}\n\n`));
                }
              } catch { /* partial json */ }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));

          // Save assistant message
          if (fullText) {
            await admin.from("ai_messages").insert({
              workspace_id: workspaceId, conversation_id: convId, role: "assistant",
              content: fullText, citations: citations,
            });
            await admin.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
          }
        } catch (e) {
          console.error("stream error", e);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(e) })}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});