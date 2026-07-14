"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gravarServidor } from "@/lib/acaoServer";
import type { Resultado } from "@/lib/resultado";

export async function adicionarFila(
  placa: string,
  carro: string
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("fila_adicionar", {
      p_placa: placa || "—",
      p_carro: carro || "—",
    })
  );
}

export async function removerFila(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("fila_alinhamento").delete().eq("id", id)
  );
}

// Troca a ordem de dois carros na fila — ATÔMICO (função PostgreSQL).
export async function trocarOrdemFila(
  idA: string,
  idB: string
): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.rpc("fila_trocar_ordem", { p_a: idA, p_b: idB })
  );
}
