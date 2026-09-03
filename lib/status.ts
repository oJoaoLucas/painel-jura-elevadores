import type { Elevador, ElevadorStatus } from "@/lib/supabase";

// Garante os 4 slots fixos de elevador (preenche os que faltarem com "livre").
export function slotsElevador(elevadores: Elevador[]): Elevador[] {
  return [1, 2, 3, 4].map(
    (id) =>
      elevadores.find((e) => e.id === id) || {
        id,
        status: "livre",
        placa: null,
        carro: null,
        servico: null,
        mecanico: null,
        ocupado_em: null,
        pausado_em: null,
        previsto_min: null,
        updated_at: "",
      }
  );
}

type Meta = {
  label: string;
  cor: string; // borda + badge
  fundo: string; // fundo do card
  pulsa?: boolean;
};

export const STATUS_META: Record<ElevadorStatus, Meta> = {
  livre: { label: "Livre", cor: "#2ea043", fundo: "#1b2620" },
  // Amarelo = carro sendo atendido normalmente
  ocupado: { label: "Ocupado", cor: "#e0a106", fundo: "#241f10" },
  aguardando: { label: "Aguard. peça", cor: "#3b82f6", fundo: "#1a2230" },
  pronto: { label: "Pronto", cor: "#22c55e", fundo: "#1b2620", pulsa: true },
};

// Vermelho = carro parado tempo demais (sobrepõe a cor normal do status)
export const COR_ALERTA = "#d11f1f";
// Versão mais clara pra texto do alerta sobre fundo escuro (contraste na TV)
export const COR_ALERTA_TEXTO = "#ff6b66";
// Azul = cronômetro pausado (almoço/fechado) — sobrepõe a cor do status
export const COR_PAUSA = "#3b82f6";
export const FUNDO_PAUSA = "#1a2230";

// Momento em que a contagem "termina": se pausado, congela em pausado_em.
export function fimContagem(pausadoEm: string | null, agora: Date): Date {
  return pausadoEm ? new Date(pausadoEm) : agora;
}

// Tempo decorrido formatado (ex: "1h20", "45min")
export function tempoDecorrido(desde: string | null, agora: Date): string {
  if (!desde) return "";
  const ms = agora.getTime() - new Date(desde).getTime();
  if (ms < 0) return "";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h > 0) return `${h}h${min.toString().padStart(2, "0")}`;
  return `${min}min`;
}

// "Quanto falta" pra terminar, comparando tempo decorrido com a estimativa.
// Retorna null se não dá pra estimar. atrasado = já passou do previsto.
export function estimativaRestante(
  desde: string | null,
  agora: Date,
  estimativaMin: number
): { texto: string; atrasado: boolean } | null {
  if (!desde || estimativaMin <= 0) return null;
  const decorridoMin = Math.floor(
    (agora.getTime() - new Date(desde).getTime()) / 60000
  );
  const rest = estimativaMin - decorridoMin;
  if (rest > 0) {
    const h = Math.floor(rest / 60);
    const m = rest % 60;
    return {
      texto: h > 0 ? `~${h}h${m.toString().padStart(2, "0")} restantes` : `~${m}min restantes`,
      atrasado: false,
    };
  }
  return { texto: "passou do previsto", atrasado: true };
}

// Progresso (0-100%) em relação ao tempo previsto, pra barra no card.
// fase: "ok" (verde) < 85% · "perto" (âmbar) 85-100% · "estourou" (vermelho) >100%.
export function progressoPrevisto(
  desde: string | null,
  agora: Date,
  previstoMin: number | null
): { pct: number; fase: "ok" | "perto" | "estourou" } | null {
  if (!desde || !previstoMin || previstoMin <= 0) return null;
  const decorridoMin = (agora.getTime() - new Date(desde).getTime()) / 60000;
  const pct = Math.max(0, Math.min(100, (decorridoMin / previstoMin) * 100));
  const fase =
    decorridoMin >= previstoMin
      ? "estourou"
      : decorridoMin >= previstoMin * 0.85
        ? "perto"
        : "ok";
  return { pct, fase };
}

// Formata um ISO pra "HH:MM" (hora local) — pro campo de início editável.
export function formatarHora(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

// Recombina um ISO existente com um novo horário "HH:MM", mantendo a data
// original (só a hora/minuto mudam quando a recepção edita o início).
export function combinarHora(
  baseIso: string | null,
  hhmm: string
): string | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return baseIso;
  const base = baseIso ? new Date(baseIso) : new Date();
  base.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
  return base.toISOString();
}

// Carro está ocupando há mais tempo que o limite de alerta?
export function carroParado(
  desde: string | null,
  agora: Date,
  alertaHoras: number
): boolean {
  if (!desde) return false;
  const ms = agora.getTime() - new Date(desde).getTime();
  return ms >= alertaHoras * 3600000;
}
