// Estado da conexão do WhatsApp do Jurinha, para o cartão da aba Bot.
// Quem grava é o n8n (workflow "Jurinha — saúde", a cada 2 min) em bot.status; o painel só lê.
// Função pura (sem React) para poder testar.

export type EstadoWhatsApp = "conectado" | "desconectado" | "sem_instancia" | "evolution_fora" | "desconhecido";

export type StatusWhatsApp = {
  whatsapp: EstadoWhatsApp | string;
  detalhe: string | null;
  atualizado_em: string;
  segundos: number;
};

/** Sem sinal do computador depois deste tempo (o n8n avisa a cada 2 min). */
export const MIN_SEM_SINAL = 6;

export type SituacaoWhatsApp = {
  nivel: "ok" | "atencao" | "erro";
  titulo: string;
  texto: string;
  /** Minutos desde o último sinal do computador (null se não há sinal). */
  minutos: number | null;
};

export function duracaoCurta(minutos: number): string {
  if (minutos < 1) return "menos de 1 min";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} dias`;
}

export function situacaoWhatsApp(s: StatusWhatsApp | null | undefined, agora = Date.now()): SituacaoWhatsApp {
  const quando = s ? Date.parse(s.atualizado_em) : NaN;
  if (!s || Number.isNaN(quando)) {
    return { nivel: "atencao", titulo: "Aguardando o primeiro sinal", texto: "O computador do Jurinha ainda não avisou o painel.", minutos: null };
  }
  const minutos = Math.max(0, Math.floor((agora - quando) / 60_000));

  if (minutos >= MIN_SEM_SINAL) {
    return {
      nivel: "erro",
      titulo: "Sem sinal do computador",
      texto: `Há ${duracaoCurta(minutos)} o computador do Jurinha não avisa que está ligado, então o bot está parado. Confira se ele está ligado, com internet e com o Docker aberto.`,
      minutos,
    };
  }

  switch (s.whatsapp) {
    case "conectado":
      return { nivel: "ok", titulo: "WhatsApp conectado", texto: `O Jurinha está atendendo. Última checagem há ${duracaoCurta(minutos)}.`, minutos };
    case "desconectado":
      return {
        nivel: "erro",
        titulo: "WhatsApp desconectado",
        texto: "O número saiu do WhatsApp. No computador do bot, abra http://localhost:8080/manager e leia o QR code de novo.",
        minutos,
      };
    case "sem_instancia":
      return { nivel: "atencao", titulo: "WhatsApp ainda não conectado", texto: "Falta criar a conexão e ler o QR code no computador do bot.", minutos };
    case "evolution_fora":
      return {
        nivel: "erro",
        titulo: "Programa do WhatsApp parado",
        texto: "A Evolution não responde. No computador do bot, reinicie o Docker.",
        minutos,
      };
    default:
      return { nivel: "atencao", titulo: "Aguardando o primeiro sinal", texto: "O estado do WhatsApp ainda não foi conferido.", minutos };
  }
}
