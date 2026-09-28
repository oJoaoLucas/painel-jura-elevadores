// Relatório → texto do WhatsApp, no formato exato que a loja já manda.

import type { RelatorioMes, RelatorioSemana } from "./calcular";
import { SEM_TECNICO, type Periodo } from "./parser";

const MESES = [
  "JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO",
  "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO",
];

/** 2060700 → "R$ 20.607,00" */
export function reais(centavos: number): string {
  return `R$ ${(centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-09-21" + "2026-09-26" → "21/09 a 26/09/2026" (ano nos dois lados se virar o ano). */
export function periodoCurto({ inicio, fim }: Periodo): string {
  const [ai, mi, di] = inicio.split("-");
  const [af, mf, df] = fim.split("-");
  return ai === af ? `${di}/${mi} a ${df}/${mf}/${af}` : `${di}/${mi}/${ai} a ${df}/${mf}/${af}`;
}

/** "2026-09-01" → "SETEMBRO" */
export function nomeDoMes(mesReferencia: string): string {
  return MESES[Number(mesReferencia.slice(5, 7)) - 1];
}

export function textoWhatsApp(o: {
  periodo: Periodo;
  relatorio: RelatorioSemana;
  mesReferencia: string;
  /** Total de cada semana já salva do mês, em ordem (inclui esta). */
  semanasDoMes: number[];
}): string {
  const r = o.relatorio;
  const linhas = ["RELATÓRIO SEMANAL - MÃO DE OBRA", periodoCurto(o.periodo), "", "POR TÉCNICO"];
  for (const t of r.porTecnico) linhas.push(`${t.nome}: ${reais(t.centavos)}`);
  linhas.push("", "POR TIPO DE SERVIÇO");
  for (const s of r.porServico) linhas.push(`${s.nome}: ${reais(s.centavos)}`);
  linhas.push("", `TOTAL GERAL: ${reais(r.totalCentavos)}`);

  const totalMes = o.semanasDoMes.reduce((a, b) => a + b, 0);
  linhas.push("", `TOTAL MÊS DE ${nomeDoMes(o.mesReferencia)}: ${reais(totalMes)}`);
  if (o.semanasDoMes.length > 1) linhas.push(`(${o.semanasDoMes.map(reais).join(" + ")})`);
  return linhas.join("\n");
}

/** Resumo do mês para o WhatsApp: ranking de técnicos, serviços e semanas. */
export function textoMesWhatsApp(o: {
  mesReferencia: string;
  mes: RelatorioMes;
  semanas: { periodo: Periodo; centavos: number }[];
}): string {
  const ano = o.mesReferencia.slice(0, 4);
  const linhas = [
    "RELATÓRIO MENSAL - MÃO DE OBRA",
    `${nomeDoMes(o.mesReferencia)}/${ano} (${o.semanas.length} ${o.semanas.length === 1 ? "semana" : "semanas"})`,
    "",
    "RANKING DE TÉCNICOS",
  ];
  let pos = 0;
  for (const t of o.mes.porTecnico) {
    linhas.push(t.nome === SEM_TECNICO ? `${t.nome}: ${reais(t.centavos)}` : `${++pos}º ${t.nome}: ${reais(t.centavos)}`);
  }
  linhas.push("", "POR TIPO DE SERVIÇO");
  for (const s of o.mes.porServico) linhas.push(`${s.nome}: ${reais(s.centavos)}`);
  linhas.push("", "SEMANAS");
  for (const s of o.semanas) linhas.push(`${periodoCurto(s.periodo).replace(/\/\d{4}$/, "")}: ${reais(s.centavos)}`);
  linhas.push("", `TOTAL DO MÊS: ${reais(o.mes.totalCentavos)}`);
  return linhas.join("\n");
}
