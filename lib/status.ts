import type { ElevadorStatus } from "@/lib/supabase";

type Meta = {
  label: string;
  cor: string; // borda + badge
  fundo: string; // fundo do card
  pulsa?: boolean;
};

export const STATUS_META: Record<ElevadorStatus, Meta> = {
  livre: { label: "Livre", cor: "#2ea043", fundo: "#1b2620" },
  ocupado: { label: "Ocupado", cor: "#d11f1f", fundo: "#241b1e" },
  aguardando: { label: "Aguard. peça", cor: "#3b82f6", fundo: "#1a2230" },
  pronto: { label: "Pronto", cor: "#22c55e", fundo: "#1b2620", pulsa: true },
};

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
