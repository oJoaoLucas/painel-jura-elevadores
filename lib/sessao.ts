// Sessão da recepção via cookie httpOnly assinado (HMAC-SHA256).
// Substitui o antigo localStorage (que era forjável). Funciona tanto no
// runtime Node (Server Actions / Route Handlers) quanto no Edge (middleware),
// porque usa só Web Crypto (crypto.subtle).

export const COOKIE_SESSAO = "jura_sessao";
const TTL_MS = 1000 * 60 * 60 * 12; // 12h

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function assinar(secret: string, dados: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(dados)
  );
  return b64urlFromBytes(new Uint8Array(sig));
}

// Comparação de tempo constante (evita timing attack na verificação).
function igualConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Cria o token de sessão (payload com expiração + assinatura).
export async function criarTokenSessao(secret: string): Promise<string> {
  const payload = b64urlFromBytes(
    new TextEncoder().encode(JSON.stringify({ exp: Date.now() + TTL_MS }))
  );
  const sig = await assinar(secret, payload);
  return `${payload}.${sig}`;
}

// Verifica assinatura + validade. Retorna true se a sessão é legítima.
export async function verificarTokenSessao(
  secret: string,
  token: string | undefined | null
): Promise<boolean> {
  if (!token || !secret) return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const esperado = await assinar(secret, payload);
  if (!igualConstante(sig, esperado)) return false;
  try {
    const { exp } = JSON.parse(
      new TextDecoder().decode(bytesFromB64url(payload))
    );
    return typeof exp === "number" && Date.now() < exp;
  } catch {
    return false;
  }
}
