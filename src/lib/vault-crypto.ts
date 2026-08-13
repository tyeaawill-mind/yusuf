// Client-side encryption for vault secrets. The server/database only ever
// sees ciphertext — the master passphrase never leaves the browser.

const PREFIX = "v1:";
const ITERATIONS = 210_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(bytes: Uint8Array): string {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

function fromB64(value: string): Uint8Array {
  const bin = atob(value);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

export async function encryptSecret(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      key,
      enc.encode(plaintext),
    ),
  );
  return `${PREFIX}${toB64(salt)}:${toB64(iv)}:${toB64(ct)}`;
}

export async function decryptSecret(value: string, passphrase: string): Promise<string> {
  if (!isEncrypted(value)) return value; // legacy plaintext entry
  const [, saltB64, ivB64, ctB64] = value.split(":");
  if (!saltB64 || !ivB64 || !ctB64) throw new Error("Malformed ciphertext");
  const key = await deriveKey(passphrase, fromB64(saltB64));
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(ivB64) as unknown as BufferSource },
    key,
    fromB64(ctB64) as unknown as BufferSource,
  );
  return dec.decode(plain);
}

/** Only http(s) links may be rendered as anchors — blocks javascript:/data: URLs. */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
