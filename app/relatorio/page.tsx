"use client";

import { useEffect, useState } from "react";
import { supabase, type Historico, type Retorno } from "@/lib/supabase";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";

type Periodo = "hoje" | "7dias" | "30dias" | "90dias";
type Aba = "atendimento" | "retorno";

const PERIODOS: { id: Periodo; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "7dias", label: "7 dias" },
  { id: "30dias", label: "30 dias" },
  { id: "90dias", label: "90 dias" },
];

const DIAS: Record<Periodo, number> = {
  hoje: 0,
  "7dias": 6,
  "30dias": 29,
  "90dias": 89,
};

// Data inicial do período em "YYYY-MM-DD" (fuso local) — usada nos retornos,
// que guardam só a data (sem hora).
function desdeData(periodo: Periodo): string {
  const d = new Date();
  d.setDate(d.getDate() - DIAS[periodo]);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

export default function RelatorioPage() {
  const { confirmar, avisar } = useDialog();
  const [aba, setAba] = useState<Aba>("atendimento");
  const [historico, setHistorico] = useState<Historico[]>([]);
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [periodo, setPeriodo] = useState<Periodo>("hoje");
  const [carregando, setCarregando] = useState(true);

  // Abre direto no Re-serviço quando vem do botão "Consultar" da recepção
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("aba");
    if (p === "retorno") setAba("retorno");
  }, []);

  useEffect(() => {
    setCarregando(true);

    if (aba === "atendimento") {
      const desde = new Date();
      if (periodo === "hoje") desde.setHours(0, 0, 0, 0);
      else desde.setDate(desde.getDate() - DIAS[periodo]);
      supabase
        .from("historico")
        .select("*")
        .gte("saida", desde.toISOString())
        .order("saida", { ascending: false })
        .then(({ data }) => {
          setHistorico((data as Historico[]) || []);
          setCarregando(false);
        });
    } else {
      supabase
        .from("retornos")
        .select("*")
        .gte("data", desdeData(periodo))
        .order("data", { ascending: false })
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setRetornos((data as Retorno[]) || []);
          setCarregando(false);
        });
    }
  }, [periodo, aba]);

  // Exclui um retorno registrado por engano
  const excluirRetorno = async (r: Retorno) => {
    const ok = await confirmar({
      titulo: "Excluir retorno",
      mensagem: `Apagar o registro de "${r.carro || r.placa || "—"}"?`,
      confirmar: "Excluir",
      tom: "perigo",
    });
    if (!ok) return;
    const { error } = await supabase.from("retornos").delete().eq("id", r.id);
    if (error) {
      await avisar("Não deu pra excluir. Confira a internet e tente de novo.");
      return;
    }
    setRetornos((cur) => cur.filter((x) => x.id !== r.id));
  };

  // Métricas de atendimento
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

      {/* Abas: atendimentos x carros que voltaram */}
      <div className="flex gap-2 border-b border-jura-border pb-3">
        {([
          { id: "atendimento", label: "Atendimentos" },
          { id: "retorno", label: "Re-serviço" },
        ] as { id: Aba; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className="font-btn rounded-md px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors"
            style={{
              backgroundColor: aba === t.id ? "#C8102E" : "transparent",
              color: aba === t.id ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Filtro de período */}
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriodo(p.id)}
            className="rounded border px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors"
            style={{
              borderColor: periodo === p.id ? "#cc0000" : "#222222",
              backgroundColor: periodo === p.id ? "#cc0000" : "transparent",
              color: periodo === p.id ? "#fff" : "rgba(255,255,255,0.6)",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="text-white/40">Carregando…</p>
      ) : aba === "retorno" ? (
        /* ---------- Re-serviço (carros que voltaram) ---------- */
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metrica
              titulo="Carros que voltaram"
              valor={String(retornos.length)}
              cor="#cc0000"
            />
          </div>

          <section className="rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-4 text-lg">Retornos no período</h2>
            {retornos.length === 0 ? (
              <p className="text-white/40">
                Nenhum carro voltou no período. 👍
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-white/50">
                    <tr className="border-b border-jura-border">
                      <th className="py-2 pr-4">Data</th>
                      <th className="py-2 pr-4">Carro</th>
                      <th className="py-2 pr-4">Placa</th>
                      <th className="py-2 pr-4">O que aconteceu</th>
                      <th className="py-2 text-right">Excluir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retornos.map((r) => (
                      <tr key={r.id} className="border-b border-jura-border/50">
                        <td className="whitespace-nowrap py-2 pr-4 font-mono">
                          {r.data.split("-").reverse().join("/")}
                        </td>
                        <td className="py-2 pr-4 font-semibold">
                          {r.carro || "—"}
                        </td>
                        <td className="py-2 pr-4 font-mono uppercase text-white/70">
                          {r.placa || "—"}
                        </td>
                        <td className="whitespace-pre-line py-2 pr-4 text-white/70">
                          {r.descricao || "—"}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            onClick={() => excluirRetorno(r)}
                            className="rounded border border-jura-border px-2 py-0.5 text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
                            title="Excluir este retorno"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        /* ---------- Atendimentos ---------- */
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
