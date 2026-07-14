"use server";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gravarServidor } from "@/lib/acaoServer";
import { type Resultado, falha } from "@/lib/resultado";
import type { Config } from "@/lib/supabase";

// Só estes campos podem ser gravados, cada um com sua validação.
type PatchConfig = Partial<
  Pick<
    Config,
    | "som_ativo"
    | "volume"
    | "alerta_horas"
    | "radio_ativa"
    | "radio_estacao"
    | "radio_volume"
    | "tv_reload"
  >
>;

function validar(patch: PatchConfig): string | null {
  if (patch.volume !== undefined && (patch.volume < 0 || patch.volume > 1))
    return "Volume deve ficar entre 0 e 1.";
  if (
    patch.radio_volume !== undefined &&
    (patch.radio_volume < 0 || patch.radio_volume > 1)
  )
    return "Volume da rádio deve ficar entre 0 e 1.";
  if (
    patch.alerta_horas !== undefined &&
    (!Number.isInteger(patch.alerta_horas) ||
      patch.alerta_horas < 1 ||
      patch.alerta_horas > 24)
  )
    return "Alerta deve ser de 1 a 24 horas.";
  if (
    patch.radio_estacao !== undefined &&
    (!Number.isInteger(patch.radio_estacao) || patch.radio_estacao < 0)
  )
    return "Estação inválida.";
  return null;
}

export async function atualizarConfig(patch: PatchConfig): Promise<Resultado> {
  const erro = validar(patch);
  if (erro) return falha(erro);
  return gravarServidor(() =>
    supabaseAdmin.from("config").update(patch).eq("id", 1)
  );
}

// Bump do sinal que faz a TV recarregar (não precisa validação).
export async function atualizarTV(): Promise<Resultado> {
  return gravarServidor(() =>
    supabaseAdmin.from("config").update({ tv_reload: Date.now() }).eq("id", 1)
  );
}
