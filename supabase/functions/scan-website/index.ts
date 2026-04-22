import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getUserClient, getAdminClient } from "../_shared/supabase.ts";
import { chunkText, embedTexts } from "../_shared/embeddings.ts";

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2";

// Strip HTML tags + scripts, return plain text
function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function scrapeFirecrawl(url: string, apiKey: string): Promise<{ markdown: string; title: string } | null> {
  try {
    const res = await fetch(`${FIRECRAWL_URL}/scrape`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    if (!res.ok) {
      console.error("Firecrawl error:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const md = data?.data?.markdown ?? data?.markdown;
    const title = data?.data?.metadata?.title ?? data?.metadata?.title ?? url;
    if (!md || md.length < 50) return null;
    return { markdown: md, title };
  } catch (e) {
    console.error("Firecrawl exception:", e);
    return null;
  }
}

async function scrapeFallback(url: string): Promise<{ markdown: string; title: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 MuslimiDigital-Bot/1.0" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const text = htmlToText(html);
    if (text.length < 50) return null;
    return { markdown: text, title: titleMatch?.[1]?.trim() ?? url };
  } catch (e) {
    console.error("Fallback fetch error:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supabase = getUserClient(req.headers.get("Authorization"));
    const admin = getAdminClient();

    const { workspaceId, url } = await req.json();
    if (!workspaceId || !url) {
      return new Response(JSON.stringify({ error: "workspaceId & url required" }), {
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

    const { data: doc, error: docErr } = await supabase
      .from("kb_documents")
      .insert({
        workspace_id: workspaceId,
        title: url,
        source_type: "website",
        source_url: url,
        status: "processing",
        created_by: userId,
      })
      .select("id").single();
    if (docErr || !doc) throw new Error(docErr?.message ?? "Could not create document");

    try {
      // Try Firecrawl first (if available), then fallback
      let scraped: { markdown: string; title: string } | null = null;
      if (FIRECRAWL_API_KEY) {
        scraped = await scrapeFirecrawl(url, FIRECRAWL_API_KEY);
      }
      if (!scraped) {
        scraped = await scrapeFallback(url);
      }
      if (!scraped) throw new Error("Could not scrape website (both Firecrawl and fallback failed)");

      // Update title
      await admin.from("kb_documents").update({ title: scraped.title }).eq("id", doc.id);

      const chunks = chunkText(scraped.markdown);
      if (chunks.length === 0) throw new Error("No content extracted");

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
        metadata: { source_url: url },
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error: insErr } = await admin.from("kb_chunks").insert(rows.slice(i, i + 100));
        if (insErr) throw insErr;
      }

      await admin.from("kb_documents").update({
        status: "ready", chunks_count: chunks.length,
      }).eq("id", doc.id);

      return new Response(JSON.stringify({ documentId: doc.id, chunks: chunks.length, title: scraped.title }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (e) {
      await admin.from("kb_documents").update({
        status: "failed", error_message: e instanceof Error ? e.message : String(e),
      }).eq("id", doc.id);
      throw e;
    }
  } catch (e) {
    console.error("scan-website error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});