import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";
import { embedText } from "../_shared/embeddings.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = getUserClient(req.headers.get("Authorization"));
    const admin = getAdminClient();

    const { workspaceId, query, k = 5 } = await req.json();
    if (!workspaceId || !query) {
      return new Response(JSON.stringify({ error: "workspaceId & query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify membership
    const { data: ws } = await supabase.from("workspaces").select("id").eq("id", workspaceId).maybeSingle();
    if (!ws) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const queryEmbedding = await embedText(query, LOVABLE_API_KEY);
    const { data: matches, error } = await admin.rpc("match_kb_chunks", {
      query_embedding: queryEmbedding,
      match_workspace_id: workspaceId,
      match_count: k,
      similarity_threshold: 0.4,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ matches: matches ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("kb-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});