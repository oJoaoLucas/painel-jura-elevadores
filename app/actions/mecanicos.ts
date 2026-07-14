"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSessao } from "@/lib/authServer";
import { gravarServidor } from "@/lib/acaoServer";
import { type Resultado, sucesso, falha, mensagemErro } from "@/lib/resultado";

export async function adicionarMecanico(nome: string): Promise<Resultado> {
  const limpo = (nome || "").trim();
  if (!limpo) return falha("Informe o nome.");
  try {
    await exigirSessao();
    const { data: existentes } = await supabaseAdmin
      .from("mecanicos")
      .select("nome, ordem");
    const jaTem = (existentes || []).some(
      (m) => m.nome.toLowerCase() === limpo.toLowerCase()
    );
    if (jaTem) return falha("Esse mecânico já está na lista.");
    const maxOrdem = (existentes || []).reduce(
      (m, x) => Math.max(m, x.ordem),
      0
    );
    const { error } = await supabaseAdmin
      .from("mecanicos")
      .insert({ nome: limpo, ordem: maxOrdem + 1 });
    if (error) return falha("Não deu pra adicionar.");
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

export async function renomearMecanico(
  id: string,
  nome: string
): Promise<Resultado> {
  const limpo = (nome || "").trim();
  if (!limpo) return falha("O nome não pode ficar vazio.");
  return gravarServidor(() =>
    supabaseAdmin.from("mecanicos").update({ nome: limpo }).eq("id", id)
  );
}

export async function definirAniversario(
  id: string,
  aniversario: string
): Promise<Resultado> {
  // Espera "YYYY-MM-DD" ou vazio (limpa).
  if (aniversario && !/^\d{4}-\d{2}-\d{2}$/.test(aniversario))
    return falha("Data inválida.");
  return gravarServidor(() =>
    supabaseAdmin
      .from("mecanicos")
      .update({ aniversario: aniversario || null })
      .eq("id", id)
  );
}

export async function removerMecanico(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("mecanicos").delete().eq("id", id)
  );
}
