import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";
import { chunkText, embedTexts } from "../_shared/embeddings.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = getUserClient(req.headers.get("Authorization"));
    const admin = getAdminClient();

    const { workspaceId, title, content, sourceType, sourceUrl } = await req.json();
    if (!workspaceId || !title || !content) {
      return new Response(JSON.stringify({ error: "workspaceId, title, content required" }), {
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

    // Verify workspace membership via user-scoped client (RLS)
    const { data: doc, error: docErr } = await supabase
      .from("kb_documents")
      .insert({
        workspace_id: workspaceId,
        title,
        source_type: sourceType ?? "text",
        source_url: sourceUrl ?? null,
        status: "processing",
        created_by: userId,
      })
      .select("id").single();

    if (docErr || !doc) throw new Error(docErr?.message ?? "Could not create document");

    try {
      const chunks = chunkText(content);
      if (chunks.length === 0) throw new Error("No content to ingest");

      // Batch embeddings (max 50 per call)
      const allEmbeddings: number[][] = [];
      for (let i = 0; i < chunks.length; i += 50) {
        const batch = chunks.slice(i, i + 50);
        const embs = await embedTexts(batch, LOVABLE_API_KEY);
        allEmbeddings.push(...embs);
      }

      const rows = chunks.map((content, idx) => ({
        workspace_id: workspaceId,
        document_id: doc.id,
        content,
        chunk_index: idx,
        embedding: allEmbeddings[idx] as unknown as string,
      }));

      // Insert in batches of 100
      for (let i = 0; i < rows.length; i += 100) {
        const { error: insErr } = await admin.from("kb_chunks").insert(rows.slice(i, i + 100));
        if (insErr) throw insErr;
      }

      await admin.from("kb_documents").update({
        status: "ready", chunks_count: chunks.length,
      }).eq("id", doc.id);

      return new Response(JSON.stringify({ documentId: doc.id, chunks: chunks.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      await admin.from("kb_documents").update({
        status: "failed", error_message: e instanceof Error ? e.message : String(e),
      }).eq("id", doc.id);
      throw e;
    }
  } catch (e) {
    console.error("kb-ingest error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});