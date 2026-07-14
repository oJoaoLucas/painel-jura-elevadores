"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSessao } from "@/lib/authServer";
import { type Resultado, sucesso, falha, mensagemErro } from "@/lib/resultado";
import { periodoDesde, type Periodo } from "@/lib/tempo";
import type { Historico } from "@/lib/supabase";

// Leitura protegida do histórico (não é legível por anon). O corte de período
// usa o fuso de São Paulo (ver lib/tempo.ts).
export async function carregarHistorico(
  periodo: Periodo
): Promise<Resultado<Historico[]>> {
  try {
    await exigirSessao();
    const desde = periodoDesde(periodo);
    const { data, error } = await supabaseAdmin
      .from("historico")
      .select("*")
      .gte("saida", desde.toISOString())
      .order("saida", { ascending: false });
    if (error) return falha("Não deu pra carregar o relatório.");
    return sucesso((data as Historico[]) || []);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}
