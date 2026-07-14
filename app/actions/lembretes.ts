"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gravarServidor } from "@/lib/acaoServer";
import { type Resultado, falha } from "@/lib/resultado";

export async function adicionarLembrete(
  texto: string,
  destinatario: string,
  prioridade: "normal" | "urgente"
): Promise<Resultado> {
  const t = (texto || "").trim();
  if (!t) return falha("Escreva o recado.");
  if (prioridade !== "normal" && prioridade !== "urgente")
    return falha("Prioridade inválida.");
  return gravarServidor(() =>
    supabaseAdmin
      .from("lembretes")
      .insert({ texto: t, destinatario: destinatario || null, prioridade })
  );
}

export async function removerLembrete(id: string): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("lembretes").delete().eq("id", id)
  );
}
