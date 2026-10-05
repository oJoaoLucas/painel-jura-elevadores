import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";

// Acesso ao schema `bot` (Jurinha) SÓ pelo servidor.
// Os dados têm nome e telefone de clientes, então a chave de serviço
// (SUPABASE_SERVICE_ROLE_KEY) nunca vai para o navegador, e toda chamada
// confere a senha da recepção aqui no servidor (ADMIN_PIN, sem NEXT_PUBLIC_).

let cliente: SupabaseClient<any, "bot"> | undefined;

export function botDb() {
  const url = limparEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const chave = limparEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !chave) throw new ConfigFaltando("SUPABASE_SERVICE_ROLE_KEY");
  cliente ??= createClient<any, "bot">(url, chave, {
    db: { schema: "bot" },
    auth: { persistSession: false, autoRefreshToken: false },
    // O Next guarda em cache o resultado de fetch (inclusive as chamadas RPC do Supabase). Sem isto a
    // conversa de um cliente ficava "congelada" na primeira leitura: o "Nunca usar o bot" marcava no banco
    // mas a caixa continuava desmarcada, e "Ver conversa" não mostrava mensagem nova.
    global: { fetch: (entrada, init) => fetch(entrada, { ...init, cache: "no-store" }) },
  });
  return cliente;
}

export class ConfigFaltando extends Error {
  constructor(public variavel: string) {
    super(`Variável ${variavel} não configurada na Vercel`);
  }
}

/**
 * Senha da recepção, só no servidor. ADMIN_PIN é a variável certa; o
 * NEXT_PUBLIC_ADMIN_PIN antigo fica como reserva para o login não quebrar
 * enquanto a Vercel não tiver ADMIN_PIN (lido aqui no servidor, não vai pro site).
 */
// Mesmo cuidado do lib/supabase.ts: valor colado na Vercel pode vir com
// BOM/zero-width, aspas nas pontas ou espaços, e aí nenhuma senha "confere".
export function limparEnv(v?: string): string {
  return (v ?? "").replace(/[﻿​-‍⁠]/g, "").trim().replace(/^["']+|["']+$/g, "").trim();
}

function senhaEsperada(): string {
  const s = limparEnv(process.env.ADMIN_PIN) || limparEnv(process.env.NEXT_PUBLIC_ADMIN_PIN);
  if (!s) throw new ConfigFaltando("ADMIN_PIN");
  return s;
}

export function senhaConfere(enviada: string): boolean {
  const a = Buffer.from(senhaEsperada());
  const b = Buffer.from(limparEnv(enviada));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Confere a senha enviada pelo navegador no header x-jura-senha. */
export function senhaValida(req: Request): boolean {
  return senhaConfere(req.headers.get("x-jura-senha") ?? "");
}

export async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await botDb().rpc(fn, args);
  if (error) throw new Error(`bot.${fn}: ${error.message}`);
  return data as T;
}
