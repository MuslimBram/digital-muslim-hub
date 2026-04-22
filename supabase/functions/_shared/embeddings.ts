// Generate embeddings using Lovable AI Gateway (Gemini text-embedding-004 — 768 dims)
const EMBEDDING_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const EMBEDDING_MODEL = "google/text-embedding-004";

export async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: texts }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embedding API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function embedText(text: string, apiKey: string): Promise<number[]> {
  const [emb] = await embedTexts([text], apiKey);
  return emb;
}

// Simple chunker: split text into ~800 token chunks (~3200 chars) with 100-token overlap
export function chunkText(text: string, chunkSize = 3200, overlap = 400): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= chunkSize) return [clean];
  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);
    // Try to break at sentence boundary
    if (end < clean.length) {
      const lastDot = clean.lastIndexOf(". ", end);
      if (lastDot > start + chunkSize / 2) end = lastDot + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks.filter((c) => c.length > 50);
}