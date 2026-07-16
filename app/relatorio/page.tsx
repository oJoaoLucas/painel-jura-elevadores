"use client";

import { useEffect, useState } from "react";
import { supabase, type Historico } from "@/lib/supabase";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";

type Periodo = "hoje" | "7dias" | "30dias";

export default function RelatorioPage() {
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const desde = new Date();
    if (periodo === "hoje") desde.setHours(0, 0, 0, 0);
    else if (periodo === "7dias") desde.setDate(desde.getDate() - 7);
    else desde.setDate(desde.getDate() - 30);

    setCarregando(true);
    supabase
      .from("historico")
      .select("*")
      .gte("saida", desde.toISOString())
      .order("saida", { ascending: false })
      .then(({ data }) => {
        setHistorico((data as Historico[]) || []);
        setCarregando(false);
      });
  }, [periodo]);

  // Métricas
  const total = historico.length;

  const duracoes = historico
    .filter((h) => h.entrada && h.saida)
    .map((h) => new Date(h.saida!).getTime() - new Date(h.entrada!).getTime())
    .filter((ms) => ms > 0);
  const mediaMs =
    duracoes.length > 0
      ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length
      : 0;
  const mediaTxt = formatarDuracao(mediaMs);

  // Serviços mais feitos
  const porServico = new Map<string, number>();
  historico.forEach((h) => {
    const s = (h.servico || "—").trim() || "—";
    porServico.set(s, (porServico.get(s) || 0) + 1);
  });
  const servicos = [...porServico.entries()].sort((a, b) => b[1] - a[1]);

  // Por mecânico
  const porMecanico = new Map<string, number>();
  historico.forEach((h) => {
    const m = (h.mecanico || "—").trim() || "—";
    porMecanico.set(m, (porMecanico.get(m) || 0) + 1);
  });
  const mecanicos = [...porMecanico.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <AuthGate>
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
    </AuthGate>
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

function formatarDuracao(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h > 0) return `${h}h${min.toString().padStart(2, "0")}`;
  return `${min}min`;
}
