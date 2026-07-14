"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { exigirSessao } from "@/lib/authServer";
import { gravarServidor } from "@/lib/acaoServer";
import { type Resultado, sucesso, falha, mensagemErro } from "@/lib/resultado";
import type { ElevadorStatus } from "@/lib/supabase";

const STATUS_VALIDOS: ElevadorStatus[] = [
  "livre",
  "ocupado",
  "aguardando",
  "pronto",
];

type DadosOcupar = {
  placa: string;
  carro: string;
  servico: string;
  mecanico: string;
  previsto_min: number | null;
};

export async function ocuparElevador(
  id: number,
  dados: DadosOcupar
): Promise<Resultado> {
  try {
    await exigirSessao();
    const { data: atual } = await supabaseAdmin
      .from("elevadores")
      .select("status, ocupado_em, pausado_em")
      .eq("id", id)
      .single();
    const eraLivre = !atual || atual.status === "livre";
    const previsto =
      dados.previsto_min && dados.previsto_min > 0 ? dados.previsto_min : null;
    const { error } = await supabaseAdmin
      .from("elevadores")
      .update({
        status: atual && atual.status !== "livre" ? atual.status : "ocupado",
        placa: dados.placa || null,
        carro: dados.carro || null,
        servico: dados.servico || null,
        mecanico: dados.mecanico || null,
        previsto_min: previsto,
        ocupado_em: eraLivre ? new Date().toISOString() : atual?.ocupado_em,
        pausado_em: eraLivre ? null : atual?.pausado_em,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return falha("Não deu pra salvar o elevador.");
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

export async function mudarStatus(
  id: number,
  status: ElevadorStatus
): Promise<Resultado> {
  if (!STATUS_VALIDOS.includes(status)) return falha("Status inválido.");
  return gravarServidor(() =>
    supabaseAdmin
      .from("elevadores")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id)
  );
}

// Pausa/retoma o cronômetro. Ao retomar, empurra ocupado_em pra descontar a pausa.
export async function pausarElevador(
  id: number,
  pausar: boolean
): Promise<Resultado> {
  try {
    await exigirSessao();
    const { data: el } = await supabaseAdmin
      .from("elevadores")
      .select("ocupado_em, pausado_em")
      .eq("id", id)
      .single();
    if (!el) return falha("Elevador não encontrado.");

    let patch: Record<string, unknown>;
    if (pausar) {
      patch = { pausado_em: new Date().toISOString() };
    } else {
      const pausadoMs = el.pausado_em
        ? Date.now() - new Date(el.pausado_em).getTime()
        : 0;
      patch = {
        pausado_em: null,
        ocupado_em: el.ocupado_em
          ? new Date(
              new Date(el.ocupado_em).getTime() + Math.max(0, pausadoMs)
            ).toISOString()
          : el.ocupado_em,
      };
    }
    const { error } = await supabaseAdmin
      .from("elevadores")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return falha("Não deu pra pausar/retomar.");
    return sucesso(undefined);
  } catch (e) {
    return falha(mensagemErro(e));
  }
}

// ----- Operações ATÔMICAS (funções PostgreSQL — ver migração) -----

export async function liberarElevador(id: number): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("liberar_elevador", { p_elevador_id: id })
  );
}

export async function moverParaAlinhamento(id: number): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("mover_para_alinhamento", { p_elevador_id: id })
  );
}

export async function voltarParaAguardando(id: number): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("voltar_para_aguardando", { p_elevador_id: id })
  );
}
