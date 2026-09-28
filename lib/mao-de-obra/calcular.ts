// Linhas do PDF + regras atuais → relatório da semana. Os totais são sempre
// calculados (nada fica gravado): decidir um pendente recalcula todas as semanas.

import type { LinhaServico } from "./parser";
import type { Regra } from "./regras";

export type ItemValor = { nome: string; centavos: number };
export type Pendente = { codigo: number; nome: string; centavos: number; vezes: number };

export type RelatorioSemana = {
  porTecnico: ItemValor[];
  porServico: ItemValor[];
  totalCentavos: number;
  /** Serviços que apareceram mas não entram na soma (só para a observação). */
  excluidos: ItemValor[];
  /** Serviços sem decisão ainda: não somam até alguém decidir. */
  pendentes: Pendente[];
};

export const doMaiorProMenor =(a: ItemValor, b: ItemValor) => b.centavos - a.centavos || a.nome.localeCompare(b.nome, "pt-BR");

function somar(mapa: Map<string, number>, chave: string, valor: number) {
  mapa.set(chave, (mapa.get(chave) ?? 0) + valor);
}

const lista = (mapa: Map<string, number>) => [...mapa].map(([nome, centavos]) => ({ nome, centavos })).sort(doMaiorProMenor);

export function calcular(linhas: LinhaServico[], regras: Regra[]): RelatorioSemana {
  const regra = new Map(regras.map((r) => [r.codigo, r]));
  const tecnicos = new Map<string, number>();
  const servicos = new Map<string, number>();
  const excluidos = new Map<string, number>();
  const pendentes = new Map<number, Pendente>();
  let total = 0;

  for (const l of linhas) {
    const r = regra.get(l.codigo);
    const nome = r?.nome ?? l.nome;
    const status = r?.status ?? "pendente"; // código novo: ninguém decidiu ainda

    if (status === "incluido") {
      somar(tecnicos, l.tecnico, l.valorCentavos);
      somar(servicos, nome, l.valorCentavos); // aparece mesmo com R$ 0,00
      total += l.valorCentavos;
    } else if (status === "excluido") {
      somar(excluidos, nome, l.valorCentavos);
    } else {
      const p = pendentes.get(l.codigo) ?? { codigo: l.codigo, nome, centavos: 0, vezes: 0 };
      p.centavos += l.valorCentavos;
      p.vezes += 1;
      pendentes.set(l.codigo, p);
    }
  }

  return {
    // técnico sem valor (só fez serviço que não entra) não aparece; "SEM TÉCNICO" idem
    porTecnico: lista(tecnicos).filter((t) => t.centavos > 0),
    porServico: lista(servicos),
    totalCentavos: total,
    excluidos: lista(excluidos),
    pendentes: [...pendentes.values()].sort((a, b) => b.centavos - a.centavos),
  };
}

/**
 * Semana lançada à mão: as linhas só têm o total por técnico; o detalhe por
 * serviço vem de `servicosManual` ({ código: centavos }), com o nome da regra.
 */
export function comServicosManuais(r: RelatorioSemana, servicosManual: Record<string, number> | null, regras: Regra[]): RelatorioSemana {
  if (!servicosManual) return r;
  const nome = new Map(regras.map((g) => [String(g.codigo), g.nome]));
  return {
    ...r,
    porServico: Object.entries(servicosManual)
      .map(([codigo, centavos]) => ({ nome: nome.get(codigo) ?? `SERVIÇO ${codigo}`, centavos }))
      .sort(doMaiorProMenor),
  };
}

export type RelatorioMes = {
  porTecnico: ItemValor[];
  porServico: ItemValor[];
  totalCentavos: number;
  semanas: number;
};

/** Soma as semanas de um mês (técnicos e serviços pelo nome). */
export function somarSemanas(semanas: RelatorioSemana[]): RelatorioMes {
  const tecnicos = new Map<string, number>();
  const servicos = new Map<string, number>();
  let total = 0;
  for (const s of semanas) {
    for (const t of s.porTecnico) somar(tecnicos, t.nome, t.centavos);
    for (const v of s.porServico) somar(servicos, v.nome, v.centavos);
    total += s.totalCentavos;
  }
  return { porTecnico: lista(tecnicos), porServico: lista(servicos), totalCentavos: total, semanas: semanas.length };
}
