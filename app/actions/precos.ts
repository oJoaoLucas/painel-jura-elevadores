"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSessao } from "@/lib/authServer";
import { gravarServidor } from "@/lib/acaoServer";
import {
  type Resultado,
  sucesso,
  falha,
  mensagemErro,
} from "@/lib/resultado";
import type { TabelaMedida, TabelaModelo } from "@/lib/supabase";

// Leitura protegida (tabela_medidas/modelos NÃO são legíveis por anon).
export async function carregarPrecos(): Promise<
  Resultado<{ medidas: TabelaMedida[]; modelos: TabelaModelo[] }>
> {
  try {
    await exigirSessao();
    const [me, mo] = await Promise.all([
      supabaseAdmin.from("tabela_medidas").select("*").order("ordem"),
      supabaseAdmin.from("tabela_modelos").select("*").order("ordem"),
    ]);
    if (me.error || mo.error) return falha("Não deu pra carregar os preços.");
    return sucesso({
      medidas: (me.data as TabelaMedida[]) || [],
      modelos: (mo.data as TabelaModelo[]) || [],
    });
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

export async function addMedida(): Promise<Resultado> {
  try {
    await exigirSessao();
    const { data } = await supabaseAdmin
      .from("tabela_medidas")
      .select("ordem");
    const maxOrdem = (data || []).reduce((m, x) => Math.max(m, x.ordem), 0);
    const { error } = await supabaseAdmin
      .from("tabela_medidas")
      .insert({ medida: "Nova medida", ordem: maxOrdem + 1 });
    if (error) return falha("Não deu pra adicionar a medida.");
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

export async function salvarMedida(
  id: string,
  medida: string
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("tabela_medidas").update({ medida }).eq("id", id)
  );
}

// Apaga a medida; os modelos vão junto pela FK ON DELETE CASCADE (ver migração).
export async function removerMedida(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("tabela_medidas").delete().eq("id", id)
  );
}

export async function addModelo(medidaId: string): Promise<Resultado> {
  try {
    await exigirSessao();
    const { data } = await supabaseAdmin
      .from("tabela_modelos")
      .select("ordem")
      .eq("medida_id", medidaId);
    const maxOrdem = (data || []).reduce((m, x) => Math.max(m, x.ordem), 0);
    const { error } = await supabaseAdmin
      .from("tabela_modelos")
      .insert({ medida_id: medidaId, ordem: maxOrdem + 1 });
    if (error) return falha("Não deu pra adicionar o modelo.");
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

export async function salvarModelo(
  id: string,
  campo: "modelo" | "valor",
  valor: string
): Promise<Resultado> {
  if (campo !== "modelo" && campo !== "valor") return falha("Campo inválido.");
  return gravarServidor(() =>
    supabaseAdmin
      .from("tabela_modelos")
      .update({ [campo]: valor })
      .eq("id", id)
  );
}

export async function removerModelo(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("tabela_modelos").delete().eq("id", id)
  );
}
