"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gravarServidor } from "@/lib/acaoServer";
import type { Resultado } from "@/lib/resultado";

type DadosAguardando = {
  placa: string;
  carro: string;
  servico: string;
  mecanico: string;
};

export async function adicionarAguardando(
  dados: DadosAguardando
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("aguardando").insert({
      placa: dados.placa || null,
      carro: dados.carro || null,
      servico: dados.servico || null,
      mecanico: dados.mecanico || null,
    })
  );
}

export async function removerAguardando(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("aguardando").delete().eq("id", id)
  );
}

// ----- Operações ATÔMICAS (funções PostgreSQL — ver migração) -----

export async function aguardandoParaElevador(
  itemId: string,
  elevadorId: number
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("aguardando_para_elevador", {
      p_aguardando_id: itemId,
      p_elevador_id: elevadorId,
    })
  );
}

export async function aguardandoParaAlinhamento(
  itemId: string
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("aguardando_para_alinhamento", {
      p_aguardando_id: itemId,
    })
  );
}
