import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ConfigFaltando, limparEnv } from "@/lib/botServidor";
import type { LinhaServico } from "./parser";

// Tabelas mo_* (mão de obra): fechadas para a chave pública, só o servidor
// acessa com a chave de serviço — mesmo esquema do Jurinha.

let cliente: SupabaseClient | undefined;

export function moDb() {
  const url = limparEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const chave = limparEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !chave) throw new ConfigFaltando("SUPABASE_SERVICE_ROLE_KEY");
  cliente ??= createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
  return cliente;
}

/** Erro vira exceção. O dado volta como não-nulo; quem usa maybeSingle declara o `| null`. */
function checar<T>(r: { data: T; error: { message: string } | null }, onde: string): NonNullable<T> {
  if (r.error) throw new Error(`${onde}: ${r.error.message}`);
  return r.data as NonNullable<T>;
}

/** Código que ainda não existe na tabela de regras entra como pendente (com o nome lido do PDF). */
export async function registrarCodigosNovos(linhas: LinhaServico[]) {
  const novos = new Map<number, string>();
  for (const l of linhas) if (!novos.has(l.codigo)) novos.set(l.codigo, l.nome);
  if (!novos.size) return;
  checar(
    await moDb()
      .from("mo_servicos_regra")
      .upsert([...novos].map(([codigo, nome]) => ({ codigo, nome, status: "pendente" })), {
        onConflict: "codigo",
        ignoreDuplicates: true,
      }),
    "registrar códigos",
  );
}

export async function gravarLinhas(relatorioId: string, linhas: LinhaServico[]) {
  const db = moDb();
  checar(await db.from("mo_relatorio_linhas").delete().eq("relatorio_id", relatorioId), "apagar linhas");
  if (!linhas.length) return;
  checar(
    await db.from("mo_relatorio_linhas").insert(
      linhas.map((l) => ({
        relatorio_id: relatorioId,
        numero_venda: l.numeroVenda,
        codigo_servico: l.codigo,
        nome_servico: l.nome,
        tecnico: l.tecnico,
        valor_centavos: l.valorCentavos,
      })),
    ),
    "gravar linhas",
  );
}

export { checar };
