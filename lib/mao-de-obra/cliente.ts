"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { estaLogado, logout, ouvirAuth, senhaSalva } from "@/lib/auth";
import { calcular, comServicosManuais, somarSemanas, type RelatorioMes, type RelatorioSemana } from "./calcular";
import type { LinhaServico, Periodo } from "./parser";
import type { Regra, StatusRegra } from "./regras";

// Dados da mão de obra vêm de /api/mao-de-obra (servidor, com a senha da recepção).
// O navegador recalcula tudo (semana, mês, ranking) a partir das linhas + regras.

type LinhaApi = { codigo_servico: number; nome_servico: string; tecnico: string; valor_centavos: number };
type SemanaApi = {
  id: string;
  periodo_inicio: string;
  periodo_fim: string;
  mes_referencia: string;
  origem: "pdf" | "manual";
  nome_arquivo: string | null;
  criado_em: string;
  servicos_manual: Record<string, number> | null;
  linhas: LinhaApi[];
};

export type Semana = {
  id: string;
  periodo: Periodo;
  mesReferencia: string;
  origem: "pdf" | "manual";
  nomeArquivo: string | null;
  relatorio: RelatorioSemana;
};

export type Mes = {
  mesReferencia: string;
  semanas: Semana[]; // da mais antiga para a mais nova
  total: RelatorioMes;
};

export type RespostaEnvio =
  | { ok: true; id: string }
  | { ok: false; tipo: "ja_existe"; periodo: Periodo; origem: string }
  | { ok: false; tipo: "escolher_mes"; periodo: Periodo; opcoes: string[] }
  | { ok: false; tipo: "erro"; erro: string };

async function chamar(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), "x-jura-senha": senhaSalva() },
    cache: "no-store",
  });
  if (res.status === 401) {
    logout();
    throw new Error("Entre de novo com a senha da recepção.");
  }
  return res;
}

async function json<T>(res: Response): Promise<T> {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.erro ?? "Não deu pra falar com o servidor.");
  return j as T;
}

const paraLinha = (l: LinhaApi): LinhaServico => ({
  numeroVenda: null,
  codigo: l.codigo_servico,
  nome: l.nome_servico,
  tecnico: l.tecnico,
  valorCentavos: l.valor_centavos,
});

export function useMaoDeObra() {
  const [dados, setDados] = useState<{ regras: Regra[]; semanas: SemanaApi[] } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    if (!estaLogado()) return;
    try {
      setDados(await json(await chamar("/api/mao-de-obra")));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    recarregar();
    return ouvirAuth(() => (estaLogado() ? recarregar() : setDados(null)));
  }, [recarregar]);

  const { semanas, meses } = useMemo(() => {
    if (!dados) return { semanas: [] as Semana[], meses: [] as Mes[] };
    const semanas: Semana[] = dados.semanas.map((s) => ({
      id: s.id,
      periodo: { inicio: s.periodo_inicio, fim: s.periodo_fim },
      mesReferencia: s.mes_referencia,
      origem: s.origem,
      nomeArquivo: s.nome_arquivo,
      relatorio: comServicosManuais(calcular(s.linhas.map(paraLinha), dados.regras), s.servicos_manual, dados.regras),
    }));
    const porMes = new Map<string, Semana[]>();
    for (const s of semanas) porMes.set(s.mesReferencia, [...(porMes.get(s.mesReferencia) ?? []), s]);
    const meses: Mes[] = [...porMes]
      .map(([mesReferencia, lista]) => {
        const ordem = [...lista].sort((a, b) => a.periodo.inicio.localeCompare(b.periodo.inicio));
        return { mesReferencia, semanas: ordem, total: somarSemanas(ordem.map((s) => s.relatorio)) };
      })
      .sort((a, b) => b.mesReferencia.localeCompare(a.mesReferencia));
    return { semanas, meses };
  }, [dados]);

  const enviarPdf = async (arquivo: File, extra: { substituir?: boolean; mes?: string } = {}): Promise<RespostaEnvio> => {
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    if (extra.substituir) fd.append("substituir", "1");
    if (extra.mes) fd.append("mes", extra.mes);
    const res = await chamar("/api/mao-de-obra", { method: "POST", body: fd });
    const j = await res.json().catch(() => ({}));
    if (res.status === 409) return { ok: false, ...j };
    if (!res.ok) return { ok: false, tipo: "erro", erro: j.erro ?? "Não deu pra processar o PDF." };
    await recarregar();
    return { ok: true, id: j.id };
  };

  const acao = async (corpo: Record<string, unknown>) => {
    await json(await chamar("/api/mao-de-obra", { method: "POST", body: JSON.stringify(corpo), headers: { "Content-Type": "application/json" } }));
    await recarregar();
  };

  return {
    carregado: !!dados,
    erro,
    semanas,
    meses,
    enviarPdf,
    decidir: (codigo: number, status: StatusRegra) => acao({ acao: "regra", codigo, status }),
    excluir: (id: string) => acao({ acao: "excluir", id }),
    reprocessar: (id: string) => acao({ acao: "reprocessar", id }),
  };
}
