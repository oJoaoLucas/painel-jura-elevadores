"use client";

import { useEffect, useState } from "react";
import type { Historico } from "@/lib/supabase";
import NavMenu from "@/components/NavMenu";
import { carregarHistorico } from "@/app/actions/relatorio";
import type { Periodo } from "@/lib/tempo";
import {
  agregarServicos,
  agregarPorMecanico,
  tempoMedioMs,
  formatarDuracao,
} from "@/lib/metricas";

export default function RelatorioPage() {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErro(false);
    carregarHistorico(periodo).then((r) => {
      if (!vivo) return;
      if (r.ok) setHistorico(r.dado);
      else setErro(true);
      setCarregando(false);
    });
    return () => {
      vivo = false;
    };
  }, [periodo]);

  // Métricas (funções puras em lib/metricas.ts)
  const total = historico.length;
  const mediaTxt = formatarDuracao(tempoMedioMs(historico));
  const servicos = agregarServicos(historico);
  const mecanicos = agregarPorMecanico(historico);

  return (
    <main className="gestao space-y-8 px-4 pb-12 sm:px-6">
      <NavMenu titulo="Relatório" />

      {/* Filtro de período */}
      <div className="flex gap-2">
        {(["hoje", "7dias", "30dias"] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className="rounded border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors"
            style={{
              borderColor: periodo === p ? "#cc0000" : "#222222",
              backgroundColor: periodo === p ? "#cc0000" : "transparent",
              color: periodo === p ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            {p === "hoje" ? "Hoje" : p === "7dias" ? "7 dias" : "30 dias"}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-white/40">Carregando…</p>
      ) : erro ? (
        <p className="text-jura-red">
          Não deu pra carregar o relatório. Confira a conexão e tente de novo.
        </p>
      ) : (
        <>
          {/* Cards de métrica */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metrica titulo="Carros atendidos" valor={String(total)} cor="#cc0000" />
            <Metrica titulo="Tempo médio" valor={mediaTxt} cor="#1a6b1a" />
            <Metrica
              titulo="Serviço top"
              valor={servicos[0]?.[0] || "—"}
              cor="#cc8800"
            />
          </div>

          {/* Por mecânico */}
          <Lista titulo="Carros por mecânico" itens={mecanicos} cor="#2ea043" />

          {/* Tabela de histórico */}
          <section className="rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-4 text-lg">Histórico</h2>
            {historico.length === 0 ? (
              <p className="text-white/40">Nenhum carro no período.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr className="border-b border-jura-border">
                      <th className="py-2 pr-4">Carro</th>
                      <th className="py-2 pr-4">Placa</th>
                      <th className="py-2 pr-4">Serviço</th>
                      <th className="py-2 pr-4">Mecânico</th>
                      <th className="py-2 pr-4">Tempo</th>
                      <th className="py-2">Saída</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((h) => (
                      <tr key={h.id} className="border-b border-jura-border/50">
                        <td className="py-2 pr-4 font-semibold">{h.carro || "—"}</td>
                        <td className="py-2 pr-4 font-mono uppercase text-white/70">
                          {h.placa || "—"}
                        </td>
                        <td className="py-2 pr-4 text-jura-amber">
                          {h.servico || "—"}
                        </td>
                        <td className="py-2 pr-4 text-white/70">
                          {h.mecanico || "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono">
                          {h.entrada && h.saida
                            ? formatarDuracao(
                                new Date(h.saida).getTime() -
                                  new Date(h.entrada).getTime()
                              )
                            : "—"}
                        </td>
                        <td className="py-2 text-white/60">
                          {h.saida
                            ? new Date(h.saida).toLocaleString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Metrica({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div
      className="rounded-xl border-l-4 bg-jura-card p-5"
      style={{ borderColor: cor }}
    >
      <p className="eyebrow text-sm text-jura-muted">{titulo}</p>
      <p className="mt-1 truncate text-3xl font-black">{valor}</p>
    </div>
  );
}

function Lista({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: [string, number][];
  cor: string;
}) {
  const max = itens[0]?.[1] || 1;
  return (
    <section className="rounded-xl bg-jura-card p-6">
      <h2 className="section-title mb-4 text-lg">{titulo}</h2>
      {itens.length === 0 ? (
        <p className="text-white/40">Sem dados.</p>
      ) : (
        <ul className="space-y-2">
          {itens.map(([nome, qtd]) => (
            <li key={nome} className="flex items-center gap-3">
              <span className="w-40 truncate">{nome}</span>
              <div className="h-4 flex-1 overflow-hidden rounded bg-black/40">
                <div
                  className="h-full rounded"
                  style={{ width: `${(qtd / max) * 100}%`, backgroundColor: cor }}
                />
              </div>
              <span className="w-8 text-right font-bold tabular-nums">{qtd}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
