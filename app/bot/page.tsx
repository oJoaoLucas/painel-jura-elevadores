"use client";

import { useState } from "react";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import {
  ChaveJurinha,
  DiasFechados,
  ItemPausado,
  ItemPedido,
  ModalConversa,
  NumerosSemBot,
  RetornoLista,
  UsoKapsoCard,
  useAgora,
  useVerMais,
} from "@/components/Jurinha";
import MiniOrcamento, { type AlvoOrcamento } from "@/components/MiniOrcamento";
import { useBot } from "@/lib/bot";

// Aba "Bot": tudo do Jurinha (WhatsApp) — pedidos, conversas pausadas,
// conversa inteira, veio/não veio, feriados, números sem bot e o liga/desliga.

const PERIODOS = [7, 30, 90] as const;

export default function BotPage() {
  const [dias, setDias] = useState<(typeof PERIODOS)[number]>(30);
  const [retornoDias, setRetornoDias] = useState<15 | 30>(30);
  const {
    dados, erro, retomar, definirAtivo, marcarCompareceu, definirNuncaBot, salvarDiaFechado, removerDiaFechado,
    arquivarPedido, marcarRetorno,
  } = useBot(dias, retornoDias);
  const agora = useAgora();
  const [filtro, setFiltro] = useState<"todos" | "sem_resposta">("todos");
  const [conversaDe, setConversaDe] = useState<string | null>(null);

  const [alvo, setAlvo] = useState<AlvoOrcamento | null>(null);

  const pedidos = (dados?.pedidos ?? []).filter((p) => filtro === "todos" || !p.respondido_em);
  const verPedidos = useVerMais(pedidos, 8);
  const verPausados = useVerMais(dados?.pausados ?? []);
  const n = dados?.numeros;

  return (
    <AuthGate>
      <main className="gestao space-y-5 px-4 pb-12 sm:px-6">
        <NavMenu
          titulo="Bot"
          acoes={
            dados && <ChaveJurinha ativo={dados.config.bot_ativo} onMudar={definirAtivo} />
          }
        />

        {erro && (
          <p className="rounded-lg border border-jura-red/50 bg-jura-red/10 px-4 py-3 text-sm text-jura-ink">
            {erro}
          </p>
        )}
        {!dados && !erro && <p className="text-jura-muted">Carregando o Jurinha…</p>}

        {dados && n && (
          <>
            <section aria-label="Números do Jurinha" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="section-title text-lg">Números</h2>
                <div className="flex gap-1">
                  {PERIODOS.map((p) => (
                    <button
                      key={p}
                      onClick={() => setDias(p)}
                      aria-pressed={dias === p}
                      className={`rounded-md px-3 py-1 text-sm font-semibold ${
                        dias === p ? "bg-jura-red text-white" : "text-jura-muted hover:text-jura-ink"
                      }`}
                    >
                      {p} dias
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <Metrica titulo="Pedidos" valor={n.total} cor="#C8102E" />
                <Metrica titulo="Pneus" valor={n.pneu} cor="#FFC400" />
                <Metrica titulo="Serviços" valor={n.servico} cor="#3b82f6" />
                <Metrica titulo="Sem resposta" valor={n.sem_resposta} cor="#e0a106" />
                <Metrica titulo="Preço bloqueado" valor={n.bloqueios_preco} cor="#9aa3ad" />
              </div>
              {dados.uso && <UsoKapsoCard uso={dados.uso} />}
              <div className="grid gap-4 lg:grid-cols-2">
                <Barras
                  titulo="Medidas mais pedidas"
                  itens={n.top_medidas.map((m) => [m.medida, m.pedidos, m.pneus ? `${m.pneus} pneus` : ""])}
                  cor="#FFC400"
                />
                <Barras
                  titulo="Serviços mais pedidos"
                  itens={n.top_servicos.map((s) => [s.servico, s.pedidos, ""])}
                  cor="#3b82f6"
                />
              </div>
            </section>

            <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
              <section className="rounded-xl bg-jura-panel p-5 shadow-card">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="section-title text-lg">Pedidos do Jurinha</h2>
                  <div className="flex gap-1">
                    {(
                      [
                        ["todos", "Todos"],
                        ["sem_resposta", "Sem resposta"],
                      ] as const
                    ).map(([id, rotulo]) => (
                      <button
                        key={id}
                        onClick={() => setFiltro(id)}
                        aria-pressed={filtro === id}
                        className={`rounded-md px-3 py-1 text-sm font-semibold ${
                          filtro === id ? "bg-jura-red text-white" : "text-jura-muted hover:text-jura-ink"
                        }`}
                      >
                        {rotulo}
                      </button>
                    ))}
                  </div>
                </div>
                {pedidos.length === 0 ? (
                  <p className="text-jura-muted/70">Nenhum pedido.</p>
                ) : (
                  <ul className="space-y-2">
                    {verPedidos.visiveis.map((p) => (
                      <ItemPedido
                        key={p.id}
                        p={p}
                        agora={agora}
                        onRetomar={retomar}
                        onAbrirConversa={setConversaDe}
                        onCompareceu={marcarCompareceu}
                        onArquivar={(id) => arquivarPedido(id)}
                        onOrcar={(p) => {
                          setAlvo({ id: p.id, nome: p.nome, telefone: p.telefone, medida: p.medida, quantidade: p.quantidade });
                          document.getElementById("mini-orcamento")?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      />
                    ))}
                  </ul>
                )}
                {verPedidos.botao}
              </section>

              <div className="space-y-6">
              <MiniOrcamento alvo={alvo} onLimpar={() => setAlvo(null)} />

              <section className="rounded-xl bg-jura-panel p-5 shadow-card">
                <h2 className="section-title mb-1 text-lg">
                  Bot pausado{dados.pausados.length ? ` (${dados.pausados.length})` : ""}
                </h2>
                <p className="mb-4 text-sm text-jura-muted">
                  Conversas em que alguém da loja respondeu ou que esperam atendente. O Jurinha volta
                  sozinho depois de {dados.config.pausa_dias} dias sem mensagem da loja.
                </p>
                {dados.pausados.length === 0 ? (
                  <p className="text-jura-muted/70">Nenhuma conversa pausada.</p>
                ) : (
                  <ul className="space-y-2">
                    {verPausados.visiveis.map((c) => (
                      <ItemPausado key={c.telefone} c={c} onRetomar={retomar} />
                    ))}
                  </ul>
                )}
                {verPausados.botao}
              </section>
              </div>
            </div>

            <RetornoLista
              itens={dados.retorno}
              dias={retornoDias}
              onMudarDias={setRetornoDias}
              onFeito={marcarRetorno}
              onAbrirConversa={setConversaDe}
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <DiasFechados dias={dados.dias_fechados} onSalvar={salvarDiaFechado} onRemover={removerDiaFechado} />
              <NumerosSemBot
                numeros={dados.ignorados}
                onAdicionar={(tel) => definirNuncaBot(tel, true)}
                onRemover={(tel) => definirNuncaBot(tel, false)}
              />
            </div>
          </>
        )}

        {conversaDe && (
          <ModalConversa
            telefone={conversaDe}
            onFechar={() => setConversaDe(null)}
            onRetomar={retomar}
            onNuncaBot={definirNuncaBot}
          />
        )}
      </main>
    </AuthGate>
  );
}

function Metrica({ titulo, valor, cor }: { titulo: string; valor: number; cor: string }) {
  return (
    <div className="rounded-xl border-l-4 bg-jura-card p-4" style={{ borderColor: cor }}>
      <p className="eyebrow text-sm text-jura-muted">{titulo}</p>
      <p className="mt-1 text-3xl font-black tabular-nums">{valor}</p>
    </div>
  );
}

function Barras({
  titulo,
  itens,
  cor,
}: {
  titulo: string;
  itens: [string, number, string][];
  cor: string;
}) {
  const max = Math.max(1, ...itens.map((i) => i[1]));
  return (
    <section className="rounded-xl bg-jura-card p-5">
      <h3 className="section-title mb-3 text-base">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="text-jura-muted/60">Sem dados no período.</p>
      ) : (
        <ul className="space-y-2">
          {itens.map(([nome, qtd, extra]) => (
            <li key={nome} className="flex items-center gap-3 text-sm">
              <span className="w-40 truncate font-mono">{nome}</span>
              <div className="h-3 flex-1 overflow-hidden rounded bg-black/40">
                <div className="h-full rounded" style={{ width: `${(qtd / max) * 100}%`, backgroundColor: cor }} />
              </div>
              <span className="w-8 text-right font-bold tabular-nums">{qtd}</span>
              {extra && <span className="hidden w-16 text-right text-xs text-jura-muted sm:inline">{extra}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
