// Mapeia eventos do app pros nomes dos arquivos em public/audios/
// (sem a extensão — quem toca usa tocarAudio() de lib/som.ts).
import type { Elevador } from "@/lib/supabase";

function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Mecânico -> sufixo do arquivo. Nem sempre bate com o nome cadastrado
// (ex: "Wagner" foi gravado foneticamente como "vagner").
const ALIAS_MECANICO: Record<string, string> = {
  wagner: "vagner",
};

// "atencao_mecanico_<x>" pro mecânico, ou null se não tiver nome.
export function arquivoMecanico(nome: string): string | null {
  const chave = semAcento(nome.trim().toLowerCase());
  if (!chave) return null;
  return `atencao_mecanico_${ALIAS_MECANICO[chave] || chave}`;
}

export type EventoElevador =
  | "ocupado"
  | "liberado"
  | "pausado"
  | "despausado"
  | "aguardando_veiculo"
  | "teve_atualizacao";

// "elevador_<id>_<evento>"
export function arquivoElevador(id: number, evento: EventoElevador): string {
  return `elevador_${id}_${evento}`;
}

// Compara o elevador ANTES e DEPOIS de uma atualização e decide qual evento
// de áudio corresponde. Retorna null quando não há nada pra anunciar
// (ex: já estava livre e continua livre).
export function eventoElevador(
  anterior: Elevador | undefined,
  novo: Elevador
): EventoElevador | null {
  const eraLivre = !anterior || anterior.status === "livre";

  if (novo.status === "livre") {
    return eraLivre ? null : "liberado";
  }

  if (eraLivre) {
    // Carro novo chegando no elevador
    return novo.status === "aguardando" ? "aguardando_veiculo" : "ocupado";
  }

  // Já estava ocupado — status mudou?
  if (anterior!.status !== novo.status) {
    return novo.status === "aguardando" ? "aguardando_veiculo" : "teve_atualizacao";
  }

  // Status igual — cronômetro pausou ou retomou?
  if (!anterior!.pausado_em && novo.pausado_em) return "pausado";
  if (anterior!.pausado_em && !novo.pausado_em) return "despausado";

  // Sobrou: edição de serviço/carro/mecânico sem mudar status nem pausa
  return "teve_atualizacao";
}
