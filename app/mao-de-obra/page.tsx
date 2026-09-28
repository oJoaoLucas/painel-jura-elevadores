"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";
import { IconAlert, IconCheck } from "@/components/Icon";
import { Carregando, Esqueleto } from "@/components/Esqueleto";
import { useMaoDeObra, type Mes, type Semana } from "@/lib/mao-de-obra/cliente";
import { nomeDoMes, periodoCurto, reais, textoMesWhatsApp, textoWhatsApp } from "@/lib/mao-de-obra/formatar";
import { copiarTexto } from "@/lib/orcamento";
import { SEM_TECNICO } from "@/lib/mao-de-obra/parser";
import type { ItemValor } from "@/lib/mao-de-obra/calcular";

// Relatório de mão de obra: sobe o PDF "Relação de Comissões - Analítico" do
// SisMaster (todo sábado) e o painel monta o texto do WhatsApp, o mês e o ranking.

type Aba = "semana" | "mes" | "comparar";
const CORES_MES = ["#C8102E", "#FFC400", "#3b82f6", "#2ea043", "#a855f7", "#22d3ee"];
const mesAno = (m: string) => `${nomeDoMes(m).charAt(0)}${nomeDoMes(m).slice(1).toLowerCase()}/${m.slice(2, 4)}`;

export default function MaoDeObraPage() {
  const mo = useMaoDeObra();
  const { confirmar, avisar } = useDialog();
  const [aba, setAba] = useState<Aba>("semana");
  const [semanaId, setSemanaId] = useState<string | null>(null);
  const [mesSel, setMesSel] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [escolha, setEscolha] = useState<{ arquivo: File; opcoes: string[]; substituir: boolean } | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Ao carregar: abre a semana e o mês mais recentes
  useEffect(() => {
    if (!semanaId && mo.semanas.length) setSemanaId(mo.semanas[0].id);
    if (!mesSel && mo.meses.length) setMesSel(mo.meses[0].mesReferencia);
  }, [mo.semanas, mo.meses, semanaId, mesSel]);

  const semana = mo.semanas.find((s) => s.id === semanaId) ?? null;
  const mes = mo.meses.find((m) => m.mesReferencia === (aba === "semana" ? semana?.mesReferencia : mesSel)) ?? null;

  async function enviar(arquivo: File, extra: { substituir?: boolean; mes?: string } = {}) {
    setEnviando(true);
    try {
      const r = await mo.enviarPdf(arquivo, extra);
      if (r.ok) {
        setSemanaId(r.id);
        setAba("semana");
        setEscolha(null);
      } else if (r.tipo === "ja_existe") {
        const ok = await confirmar({
          titulo: "Semana já enviada",
          mensagem: `A semana ${periodoCurto(r.periodo)} já está salva${r.origem === "manual" ? " (lançada à mão)" : ""}. Substituir pelo PDF novo?`,
          confirmar: "Substituir",
        });
        if (ok) await enviar(arquivo, { ...extra, substituir: true });
      } else if (r.tipo === "escolher_mes") {
        setEscolha({ arquivo, opcoes: r.opcoes, substituir: !!extra.substituir });
      } else {
        await avisar(r.erro, "Não deu pra ler o PDF");
      }
    } catch (e) {
      await avisar(e instanceof Error ? e.message : "Falha ao enviar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthGate>
      <main className="gestao space-y-5 px-4 pb-12 sm:px-6">
        <NavMenu
          titulo="Mão de obra"
          acoes={
            <>
              <input
                ref={input}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) enviar(f);
                }}
              />
              <button
                onClick={() => input.current?.click()}
                disabled={enviando}
                className="rounded-lg bg-jura-red px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50"
              >
                {enviando ? "Lendo PDF…" : "Enviar PDF do SisMaster"}
              </button>
            </>
          }
        />

        {escolha && (
          <section className="rounded-xl border border-jura-amber/60 bg-jura-amber/10 p-4">
            <p className="font-semibold">Essa semana cruza dois meses. Em qual mês ela conta?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {escolha.opcoes.map((m) => (
                <button
                  key={m}
                  onClick={() => enviar(escolha.arquivo, { mes: m, substituir: escolha.substituir })}
                  className="rounded-md border border-jura-amber px-3 py-1.5 text-sm font-bold text-jura-amber hover:bg-jura-amber hover:text-black"
                >
                  {nomeDoMes(m)} / {m.slice(0, 4)}
                </button>
              ))}
              <button onClick={() => setEscolha(null)} className="px-3 py-1.5 text-sm text-jura-muted hover:text-jura-ink">
                Cancelar
              </button>
            </div>
          </section>
        )}

        {mo.erro && <p className="rounded-lg border border-jura-red/50 bg-jura-red/10 px-4 py-3 text-sm">{mo.erro}</p>}

        {!mo.carregado && !mo.erro ? (
          <Carregando className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Esqueleto className="h-96 rounded-xl" />
            <Esqueleto className="h-96 rounded-xl" />
          </Carregando>
        ) : mo.semanas.length === 0 ? (
          <p className="rounded-xl border border-dashed border-jura-border p-8 text-center text-jura-muted">
            Nenhuma semana ainda. Clique em &quot;Enviar PDF do SisMaster&quot; e escolha o &quot;Relação de Comissões - Analítico&quot;.
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <Historico
              meses={mo.meses}
              semanaId={aba === "semana" ? semanaId : null}
              mesSel={aba === "mes" ? mesSel : null}
              onSemana={(id) => {
                setSemanaId(id);
                setAba("semana");
              }}
              onMes={(m) => {
                setMesSel(m);
                setAba("mes");
              }}
            />

            <div className="min-w-0 space-y-5">
              <div className="flex gap-1" role="tablist" aria-label="Visão">
                {(
                  [
                    ["semana", "Semana"],
                    ["mes", "Mês e ranking"],
                    ["comparar", "Comparar meses"],
                  ] as const
                ).map(([id, rotulo]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={aba === id}
                    onClick={() => setAba(id)}
                    className={`rounded-md px-3 py-1.5 text-sm font-semibold ${aba === id ? "bg-jura-red text-white" : "text-jura-muted hover:text-jura-ink"}`}
                  >
                    {rotulo}
                  </button>
                ))}
              </div>

              {aba === "semana" && semana && mes && (
                <VisaoSemana
                  semana={semana}
                  mes={mes}
                  onDecidir={async (codigo, entra) => {
                    try {
                      await mo.decidir(codigo, entra ? "incluido" : "excluido");
                    } catch (e) {
                      await avisar(e instanceof Error ? e.message : "Não deu pra salvar.");
                    }
                  }}
                  onReprocessar={async () => {
                    try {
                      await mo.reprocessar(semana.id);
                    } catch (e) {
                      await avisar(e instanceof Error ? e.message : "Não deu pra reprocessar.");
                    }
                  }}
                  onExcluir={async () => {
                    const ok = await confirmar({
                      titulo: "Excluir semana",
                      mensagem: `Apaga a semana ${periodoCurto(semana.periodo)} e tira ela do total do mês.`,
                      confirmar: "Excluir",
                      tom: "perigo",
                    });
                    if (!ok) return;
                    try {
                      await mo.excluir(semana.id);
                      setSemanaId(null);
                    } catch (e) {
                      await avisar(e instanceof Error ? e.message : "Não deu pra excluir.");
                    }
                  }}
                />
              )}
              {aba === "mes" && mes && <VisaoMes mes={mes} />}
              {aba === "comparar" && <Comparar meses={mo.meses} />}
            </div>
          </div>
        )}
      </main>
    </AuthGate>
  );
}

function Historico({
  meses,
  semanaId,
  mesSel,
  onSemana,
  onMes,
}: {
  meses: Mes[];
  semanaId: string | null;
  mesSel: string | null;
  onSemana: (id: string) => void;
  onMes: (m: string) => void;
}) {
  return (
    <aside className="space-y-4 rounded-xl bg-jura-panel p-4 shadow-card lg:self-start">
      <h2 className="section-title text-lg">Histórico</h2>
      {meses.map((m) => (
        <div key={m.mesReferencia}>
          <button
            onClick={() => onMes(m.mesReferencia)}
            className={`flex w-full items-baseline justify-between rounded-md px-2 py-1.5 text-left ${
              mesSel === m.mesReferencia ? "bg-jura-red/15 text-jura-ink" : "hover:bg-white/5"
            }`}
          >
            <span className="font-bold">{mesAno(m.mesReferencia)}</span>
            <span className="font-mono text-sm text-jura-amber">{reais(m.total.totalCentavos)}</span>
          </button>
          <ul className="anima-lista mt-1 space-y-0.5 border-l border-jura-border pl-2">
            {m.semanas.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => onSemana(s.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm ${
                    semanaId === s.id ? "bg-white/10 text-jura-ink" : "text-jura-muted hover:bg-white/5 hover:text-jura-ink"
                  }`}
                >
                  <span>
                    {periodoCurto(s.periodo).replace(/\/\d{4}$/, "")}
                    {s.relatorio.pendentes.length > 0 && <span className="ml-1 text-jura-amber" title="Tem serviço sem decisão">●</span>}
                  </span>
                  <span className="font-mono text-xs">{reais(s.relatorio.totalCentavos)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </aside>
  );
}

function BotaoCopiar({ texto, rotulo }: { texto: string; rotulo: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={async () => {
        await copiarTexto(texto);
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 rounded-md bg-jura-wa px-3 py-1.5 text-sm font-bold text-black hover:opacity-90"
    >
      {ok ? (
        <>
          <IconCheck className="h-4 w-4" /> Copiado!
        </>
      ) : (
        rotulo
      )}
    </button>
  );
}

function VisaoSemana({
  semana,
  mes,
  onDecidir,
  onReprocessar,
  onExcluir,
}: {
  semana: Semana;
  mes: Mes;
  onDecidir: (codigo: number, entra: boolean) => Promise<void>;
  onReprocessar: () => Promise<void>;
  onExcluir: () => Promise<void>;
}) {
  const r = semana.relatorio;
  // total do mês até esta semana (as semanas seguintes ainda não existiam quando a loja mandou)
  const ate = mes.semanas.filter((s) => s.periodo.inicio <= semana.periodo.inicio);
  const texto = textoWhatsApp({
    periodo: semana.periodo,
    relatorio: r,
    mesReferencia: semana.mesReferencia,
    semanasDoMes: ate.map((s) => s.relatorio.totalCentavos),
  });

  return (
    <div className="space-y-5">
      {r.pendentes.length > 0 && (
        <section className="rounded-xl border border-jura-amber/60 bg-jura-amber/10 p-4">
          <h3 className="flex items-center gap-2 font-bold text-jura-amber">
            <IconAlert className="h-4 w-4" /> Serviço sem decisão — ainda não entra na soma
          </h3>
          <p className="mb-3 text-sm text-jura-muted">A decisão vale para todas as semanas, as antigas e as próximas.</p>
          <ul className="space-y-2">
            {r.pendentes.map((p) => (
              <li key={p.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-jura-card px-3 py-2">
                <span>
                  <span className="font-semibold">{p.nome}</span>{" "}
                  <span className="text-sm text-jura-muted">
                    (cód. {p.codigo} · {p.vezes}x · {reais(p.centavos)})
                  </span>
                </span>
                <span className="flex gap-2">
                  <button
                    onClick={() => onDecidir(p.codigo, true)}
                    className="rounded-md border border-jura-green px-3 py-1 text-sm font-bold text-jura-green hover:bg-jura-green hover:text-white"
                  >
                    Entra
                  </button>
                  <button
                    onClick={() => onDecidir(p.codigo, false)}
                    className="rounded-md border border-jura-border px-3 py-1 text-sm font-bold text-jura-muted hover:border-jura-red hover:text-jura-red"
                  >
                    Não entra
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl bg-jura-panel p-5 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title text-lg">Semana {periodoCurto(semana.periodo)}</h2>
          <BotaoCopiar texto={texto} rotulo="Copiar para WhatsApp" />
        </div>
        {semana.origem === "manual" && (
          <p className="mb-3 text-sm text-jura-muted">Lançada à mão (sem PDF). Envie o PDF desta semana para substituir e ter o detalhe completo.</p>
        )}
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-jura-input p-4 font-sans text-sm leading-relaxed text-jura-ink">{texto}</pre>

        {r.excluidos.length > 0 && (
          <div className="mt-4 text-sm text-jura-muted">
            <p className="font-semibold text-jura-ink/80">Observação — não entraram na soma:</p>
            <p>{r.excluidos.map((e) => `${e.nome} (${reais(e.centavos)})`).join(" · ")}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3 border-t border-jura-border pt-3 text-sm">
          {semana.origem === "pdf" && (
            <button onClick={onReprocessar} className="font-semibold text-jura-muted hover:text-jura-ink" title="Lê de novo o texto guardado do PDF">
              Reprocessar
            </button>
          )}
          <button onClick={onExcluir} className="font-semibold text-jura-muted hover:text-jura-red">
            Excluir semana
          </button>
          {semana.nomeArquivo && <span className="ml-auto text-xs text-jura-muted/70">{semana.nomeArquivo}</span>}
        </div>
      </section>
    </div>
  );
}

const MEDALHAS = ["🥇", "🥈", "🥉"];

function VisaoMes({ mes }: { mes: Mes }) {
  const t = mes.total;
  const pessoas = t.porTecnico.filter((x) => x.nome !== SEM_TECNICO);
  const semTecnico = t.porTecnico.find((x) => x.nome === SEM_TECNICO);
  const maior = Math.max(1, ...pessoas.map((p) => p.centavos));
  const texto = textoMesWhatsApp({
    mesReferencia: mes.mesReferencia,
    mes: t,
    semanas: mes.semanas.map((s) => ({ periodo: s.periodo, centavos: s.relatorio.totalCentavos })),
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Numero titulo={`Total de ${mesAno(mes.mesReferencia)}`} valor={reais(t.totalCentavos)} cor="#C8102E" />
        <Numero titulo="Semanas" valor={String(t.semanas)} cor="#FFC400" />
        <Numero titulo="Média por semana" valor={reais(Math.round(t.totalCentavos / Math.max(1, t.semanas)))} cor="#3b82f6" />
      </div>

      <section className="rounded-xl bg-jura-panel p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-title text-lg">Ranking de técnicos — {mesAno(mes.mesReferencia)}</h2>
          <BotaoCopiar texto={texto} rotulo="Copiar resumo do mês" />
        </div>
        <ol className="anima-lista space-y-2">
          {pessoas.map((p, i) => (
            <li key={p.nome} className="flex items-center gap-3">
              <span className="w-8 text-center text-xl" aria-label={`${i + 1}º lugar`}>
                {MEDALHAS[i] ?? <span className="font-mono text-sm text-jura-muted">{i + 1}º</span>}
              </span>
              <span className="w-24 shrink-0 truncate font-bold">{p.nome}</span>
              <div className="h-7 flex-1 overflow-hidden rounded bg-black/30">
                <div
                  className="h-full rounded"
                  style={{ width: `${(p.centavos / maior) * 100}%`, backgroundColor: i === 0 ? "#FFC400" : "#C8102E" }}
                />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-sm font-bold">{reais(p.centavos)}</span>
              <span className="hidden w-12 shrink-0 text-right text-xs text-jura-muted sm:block">
                {Math.round((p.centavos / Math.max(1, t.totalCentavos)) * 100)}%
              </span>
            </li>
          ))}
        </ol>
        {semTecnico && (
          <p className="mt-3 text-sm text-jura-muted">
            Sem técnico lançado no SisMaster: <span className="font-mono">{reais(semTecnico.centavos)}</span>
          </p>
        )}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <Barras titulo="Por tipo de serviço" itens={t.porServico} cor="#3b82f6" />
        <Barras
          titulo="Semanas do mês"
          itens={mes.semanas.map((s) => ({ nome: periodoCurto(s.periodo).replace(/\/\d{4}$/, ""), centavos: s.relatorio.totalCentavos }))}
          cor="#2ea043"
          semOrdenar
        />
      </div>
    </div>
  );
}

function Numero({ titulo, valor, cor }: { titulo: string; valor: string; cor: string }) {
  return (
    <div className="rounded-xl border-l-4 bg-jura-card p-4" style={{ borderColor: cor }}>
      <p className="eyebrow text-sm text-jura-muted">{titulo}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{valor}</p>
    </div>
  );
}

function Barras({ titulo, itens, cor, semOrdenar }: { titulo: string; itens: ItemValor[]; cor: string; semOrdenar?: boolean }) {
  const lista = semOrdenar ? itens : [...itens].sort((a, b) => b.centavos - a.centavos);
  const maior = Math.max(1, ...lista.map((i) => i.centavos));
  return (
    <section className="rounded-xl bg-jura-panel p-5 shadow-card">
      <h3 className="section-title mb-3 text-base">{titulo}</h3>
      <ul className="space-y-2">
        {lista.map((i) => (
          <li key={i.nome} className="flex items-center gap-3 text-sm">
            <span className="w-44 shrink-0 truncate" title={i.nome}>
              {i.nome}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded bg-black/30">
              <div className="h-full rounded" style={{ width: `${(i.centavos / maior) * 100}%`, backgroundColor: cor }} />
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-xs">{reais(i.centavos)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Comparar({ meses }: { meses: Mes[] }) {
  const ultimos = useMemo(() => [...meses].slice(0, 6).reverse(), [meses]); // mais antigo → mais novo
  const cor = (i: number) => CORES_MES[(i + CORES_MES.length - ultimos.length) % CORES_MES.length];
  const maiorMes = Math.max(1, ...ultimos.map((m) => m.total.totalCentavos));
  const tecnicos = useMemo(() => {
    const soma = new Map<string, number>();
    for (const m of ultimos) for (const t of m.total.porTecnico) if (t.nome !== SEM_TECNICO) soma.set(t.nome, (soma.get(t.nome) ?? 0) + t.centavos);
    return [...soma].sort((a, b) => b[1] - a[1]).map(([nome]) => nome);
  }, [ultimos]);
  const valor = (m: Mes, nome: string) => m.total.porTecnico.find((t) => t.nome === nome)?.centavos ?? 0;
  const maiorTec = Math.max(1, ...ultimos.flatMap((m) => tecnicos.map((n) => valor(m, n))));

  if (ultimos.length < 2) {
    return (
      <p className="rounded-xl border border-dashed border-jura-border p-8 text-center text-jura-muted">
        A comparação aparece quando tiver pelo menos dois meses. Por enquanto só tem {mesAno(ultimos[0]?.mesReferencia ?? "2026-01-01")}.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl bg-jura-panel p-5 shadow-card">
        <h3 className="section-title mb-4 text-base">Total por mês</h3>
        <div className="flex h-56 items-end gap-3">
          {ultimos.map((m, i) => {
            const ant = ultimos[i - 1]?.total.totalCentavos;
            const variacao = ant ? Math.round(((m.total.totalCentavos - ant) / ant) * 100) : null;
            return (
              <div key={m.mesReferencia} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <span className="font-mono text-xs font-bold">{reais(m.total.totalCentavos).replace(",00", "")}</span>
                {variacao !== null && (
                  <span className={`text-[11px] font-semibold ${variacao >= 0 ? "text-jura-green" : "text-jura-red"}`}>
                    {variacao >= 0 ? "▲" : "▼"} {Math.abs(variacao)}%
                  </span>
                )}
                <div
                  className="w-full max-w-16 rounded-t"
                  style={{ height: `${(m.total.totalCentavos / maiorMes) * 75}%`, backgroundColor: cor(i) }}
                  title={`${mesAno(m.mesReferencia)}: ${reais(m.total.totalCentavos)}`}
                />
                <span className="text-xs text-jura-muted">{mesAno(m.mesReferencia)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl bg-jura-panel p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="section-title text-base">Técnicos mês a mês</h3>
          <div className="flex flex-wrap gap-3 text-xs">
            {ultimos.map((m, i) => (
              <span key={m.mesReferencia} className="flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: cor(i) }} /> {mesAno(m.mesReferencia)}
              </span>
            ))}
          </div>
        </div>
        <ul className="space-y-4">
          {tecnicos.map((nome) => (
            <li key={nome}>
              <p className="mb-1 text-sm font-bold">{nome}</p>
              <div className="space-y-1">
                {ultimos.map((m, i) => (
                  <div key={m.mesReferencia} className="flex items-center gap-2">
                    <div className="h-2.5 flex-1 overflow-hidden rounded bg-black/30">
                      <div className="h-full rounded" style={{ width: `${(valor(m, nome) / maiorTec) * 100}%`, backgroundColor: cor(i) }} />
                    </div>
                    <span className="w-24 shrink-0 text-right font-mono text-[11px] text-jura-muted">{reais(valor(m, nome))}</span>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
