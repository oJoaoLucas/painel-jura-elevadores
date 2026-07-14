import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase com service_role — SÓ NO SERVIDOR.
// O import "server-only" garante erro de build se algum componente cliente
// tentar importar isto (a chave service_role NUNCA vai pro navegador).
// Usa as mesmas envs do cliente para URL, mas a chave é a service_role
// (variável SEM prefixo NEXT_PUBLIC).

function limpar(v?: string): string {
  return (v ?? "")
    .replace(/[﻿​]/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

const url = limpar(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
);
const serviceKey = limpar(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!url || !serviceKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Jura Painel] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes — escritas no servidor vão falhar."
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
