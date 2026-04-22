// AES-256-GCM encryption helpers for integration credentials.
// Uses INTEGRATIONS_ENCRYPTION_KEY (32 bytes, base64 or hex; we accept any string and SHA-256 it down to 32 bytes).

function toUint8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("INTEGRATIONS_ENCRYPTION_KEY");
  if (!raw) throw new Error("INTEGRATIONS_ENCRYPTION_KEY not configured");
  const hash = await crypto.subtle.digest("SHA-256", toUint8(raw));
  return await crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string;         // base64
  tag: string;        // base64 (extracted from ciphertext for portability — actually webcrypto AES-GCM puts tag at end)
}

export async function encryptJson(value: unknown): Promise<EncryptedPayload> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = toUint8(JSON.stringify(value));
  const cipherBuf = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext),
  );
  // WebCrypto returns ciphertext||tag (last 16 bytes are auth tag).
  const tag = cipherBuf.slice(cipherBuf.length - 16);
  const ct = cipherBuf.slice(0, cipherBuf.length - 16);
  return { ciphertext: bytesToB64(ct), iv: bytesToB64(iv), tag: bytesToB64(tag) };
}

export async function decryptJson<T = Record<string, unknown>>(payload: EncryptedPayload): Promise<T> {
  const key = await getKey();
  const iv = b64ToBytes(payload.iv);
  const ct = b64ToBytes(payload.ciphertext);
  const tag = b64ToBytes(payload.tag);
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, combined);
  return JSON.parse(new TextDecoder().decode(plainBuf)) as T;
}

// HMAC-SHA256 helpers for outbound webhook signing & inbound verification.
export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    toUint8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, toUint8(body)));
  return Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}

export function randomSecret(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return bytesToB64(buf).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}