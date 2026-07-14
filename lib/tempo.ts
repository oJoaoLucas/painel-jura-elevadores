// Datas no fuso de São Paulo (America/Sao_Paulo), independente do fuso do
// dispositivo. Usado pelos filtros do relatório ("Hoje" tem que ser o dia
// da oficina, não o do navegador).

export type Periodo = "hoje" | "7dias" | "30dias";

// Offset de SP (em ms) num dado instante — robusto a mudança de horário de verão.
function offsetSPms(ref: Date): number {
  const sp = new Date(ref.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const utc = new Date(ref.toLocaleString("en-US", { timeZone: "UTC" }));
  return sp.getTime() - utc.getTime();
}

// Instante (UTC) da meia-noite do dia de "agora" no fuso de SP.
export function inicioDiaSP(agora: Date): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const val = (t: string) => partes.find((p) => p.type === t)!.value;
  const y = Number(val("year"));
  const m = Number(val("month"));
  const d = Number(val("day"));
  const offset = offsetSPms(agora);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offset);
}

// Início do período do relatório (instante UTC) considerando o fuso de SP.
export function periodoDesde(periodo: Periodo, agora: Date = new Date()): Date {
  const inicioHoje = inicioDiaSP(agora);
  if (periodo === "hoje") return inicioHoje;
  const dias = periodo === "7dias" ? 6 : 29; // hoje + N dias anteriores
  return new Date(inicioHoje.getTime() - dias * 24 * 60 * 60 * 1000);
}
