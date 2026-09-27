"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@/components/Dialog";
import { IconAlert, IconCheck, IconClock, IconUndo } from "@/components/Icon";
import {
  MOTIVO_REPASSE,
  carregarConversa,
  dataCurta,
  formatarTelefone,
  linkWhatsApp,
  resumoPedido,
  tempoDesde,
  type Conversa,
  type EstadoBot,
  type MensagemConversa,
  type PausadoBot,
  type PedidoBot,
  type RetornoBot,
} from "@/lib/bot";

// Blocos do Jurinha (bot do WhatsApp) usados na Recepção e na aba "Bot".

const MIN_ALERTA = 30; // pedido sem resposta há mais que isso fica vermelho

const ESTADO: Record<EstadoBot, { rotulo: string; cor: string }> = {
  aguardando_atendente: { rotulo: "Aguardando atendente", cor: "#e0a106" },
  humano: { rotulo: "Com atendente", cor: "#3b82f6" },
  bot: { rotulo: "Com o Jurinha", cor: "#2ea043" },
};

function useAgora(ms = 30_000) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return agora;
}

function Contato({ nome, telefone }: { nome: string | null; telefone: string }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className="truncate font-semibold text-jura-ink">{nome || "Cliente"}</span>
      <a
        href={linkWhatsApp(telefone)}
        target="_blank"
        rel="noreferrer"
        title="Abrir conversa no WhatsApp"
        className="rounded border border-jura-wa/40 px-1.5 py-0.5 font-mono text-xs text-jura-wa hover:bg-jura-wa/10"
      >
        {formatarTelefone(telefone)}
      </a>
    </div>
  );
}

function Selo({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{ borderColor: `${cor}66`, color: cor }}
    >
      {children}
    </span>
  );
}

function BotaoVoltarBot({ nome, onRetomar }: { nome: string | null; onRetomar: () => Promise<void> }) {
  const { confirmar, avisar } = useDialog();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      disabled={ocupado}
      onClick={async () => {
        const ok = await confirmar({
          titulo: "Voltar o Jurinha?",
          mensagem: `O Jurinha volta a responder ${nome || "este cliente"} na próxima mensagem dele. Use só quando o atendimento humano já terminou.`,
          confirmar: "Voltar bot",
        });
        if (!ok) return;
        setOcupado(true);
        try {
          await onRetomar();
        } catch (e) {
          await avisar(e instanceof Error ? e.message : "Não deu pra voltar o bot.");
        } finally {
          setOcupado(false);
        }
      }}
      className="font-btn inline-flex shrink-0 items-center gap-1.5 rounded-md border border-jura-border bg-jura-input px-2.5 py-1.5 text-xs font-semibold text-jura-ink hover:border-jura-green hover:text-jura-green disabled:opacity-50"
    >
      <IconUndo className="h-3.5 w-3.5" />
      {ocupado ? "Voltando…" : "Voltar bot"}
    </button>
  );
}

function BotaoVeio({
  valor,
  onMarcar,
}: {
  valor: boolean | null;
  onMarcar: (v: boolean | null) => Promise<void>;
}) {
  const { avisar } = useDialog();
  const marcar = async (v: boolean) => {
    try {
      await onMarcar(valor === v ? null : v); // clicar de novo desmarca
    } catch (e) {
      await avisar(e instanceof Error ? e.message : "Não deu pra salvar.");
    }
  };
  const base = "rounded-md border px-2 py-1 text-[11px] font-semibold";
  return (
    <div className="flex gap-1" role="group" aria-label="O cliente veio?">
      <button
        onClick={() => marcar(true)}
        aria-pressed={valor === true}
        className={`${base} ${valor === true ? "border-jura-green bg-jura-green text-white" : "border-jura-border text-jura-muted hover:text-jura-green"}`}
      >
        Veio
      </button>
      <button
        onClick={() => marcar(false)}
        aria-pressed={valor === false}
        className={`${base} ${valor === false ? "border-jura-red bg-jura-red text-white" : "border-jura-border text-jura-muted hover:text-jura-red"}`}
      >
        Não veio
      </button>
    </div>
  );
}

export function ItemPedido({
  p,
  agora,
  onRetomar,
  onAbrirConversa,
  onCompareceu,
  onArquivar,
}: {
  p: PedidoBot;
  agora: number;
  onRetomar?: (tel: string) => Promise<void>;
  onAbrirConversa?: (tel: string) => void;
  onCompareceu?: (id: number, valor: boolean | null) => Promise<void>;
  onArquivar?: (id: number) => Promise<void>;
}) {
  const { confirmar, avisar } = useDialog();
  const { titulo, detalhe } = resumoPedido(p);
  const minSemResposta = p.respondido_em ? 0 : (agora - new Date(p.criado_em).getTime()) / 60000;
  const motivo = MOTIVO_REPASSE[p.motivo_repasse];
  const pausado = p.estado !== "bot" && (!p.pausado_ate || new Date(p.pausado_ate).getTime() > agora);
  const urgenteAberto = p.urgente && !p.respondido_em;

  return (
    <li
      className={`flex items-start justify-between gap-3 rounded-lg border bg-jura-card p-3 ${
        urgenteAberto ? "border-jura-red shadow-[0_0_0_1px_#C8102E]" : "border-jura-border"
      }`}
    >
      <div className="min-w-0 space-y-1">
        {p.urgente && (
          <p className="inline-flex items-center gap-1 rounded bg-jura-red px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            <IconAlert className="h-3 w-3" /> Urgente
          </p>
        )}
        <Contato nome={p.nome} telefone={p.telefone} />
        <p className="text-base font-bold text-jura-amber">{titulo}</p>
        {detalhe && <p className="text-sm text-jura-muted">{detalhe}</p>}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {p.respondido_em ? (
            <Selo cor="#2ea043">
              <IconCheck className="h-3 w-3" /> Respondido
            </Selo>
          ) : (
            <Selo cor={minSemResposta > MIN_ALERTA ? "#ff6b6b" : "#e0a106"}>
              <IconClock className="h-3 w-3" /> Sem resposta {tempoDesde(p.criado_em, agora)}
            </Selo>
          )}
          {p.fora_horario && <Selo cor="#9aa3ad">fora do horário</Selo>}
          {motivo && (
            <Selo cor="#9aa3ad">
              <IconAlert className="h-3 w-3" /> {motivo}
            </Selo>
          )}
          <span className="text-[11px] text-jura-muted">{dataCurta(p.criado_em)}</span>
        </div>
        {(onAbrirConversa || onCompareceu || onArquivar) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {onAbrirConversa && (
              <button
                onClick={() => onAbrirConversa(p.telefone)}
                className="rounded-md border border-jura-border px-2 py-1 text-[11px] font-semibold text-jura-ink hover:border-jura-amber hover:text-jura-amber"
              >
                Ver conversa
              </button>
            )}
            {onCompareceu && <BotaoVeio valor={p.compareceu} onMarcar={(v) => onCompareceu(p.id, v)} />}
            {onArquivar && (
              <button
                onClick={async () => {
                  const ok = await confirmar({
                    titulo: "Tirar este pedido da lista?",
                    mensagem: "Ele some do painel e dos números, mas continua guardado no banco.",
                    confirmar: "Tirar",
                  });
                  if (!ok) return;
                  try {
                    await onArquivar(p.id);
                  } catch (e) {
                    await avisar(e instanceof Error ? e.message : "Não deu pra tirar o pedido.");
                  }
                }}
                className="ml-auto rounded-md px-2 py-1 text-[11px] font-semibold text-jura-muted hover:text-jura-red"
              >
                Tirar da lista
              </button>
            )}
          </div>
        )}
      </div>
      {onRetomar && pausado && <BotaoVoltarBot nome={p.nome} onRetomar={() => onRetomar(p.telefone)} />}
    </li>
  );
}

/** Janela com a conversa inteira do cliente com o Jurinha. */
export function ModalConversa({
  telefone,
  onFechar,
  onRetomar,
  onNuncaBot,
}: {
  telefone: string;
  onFechar: () => void;
  onRetomar: (tel: string) => Promise<void>;
  onNuncaBot: (tel: string, valor: boolean) => Promise<void>;
}) {
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const { confirmar, avisar } = useDialog();
  const fimRef = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try {
      setConversa(await carregarConversa(telefone));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não deu pra carregar a conversa.");
    }
  }, [telefone]);

  useEffect(() => {
    carregar();
  }, [carregar]);
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [conversa]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const cliente = conversa?.cliente;
  const pausado = cliente && cliente.estado !== "bot";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversa com o cliente"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3"
      onClick={(e) => e.target === e.currentTarget && onFechar()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col rounded-xl border border-jura-border bg-jura-panel shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-jura-border p-4">
          <Contato nome={cliente?.nome ?? null} telefone={telefone} />
          <div className="flex flex-wrap items-center gap-2">
            {cliente && <Selo cor={ESTADO[cliente.estado].cor}>{ESTADO[cliente.estado].rotulo}</Selo>}
            <button onClick={onFechar} className="rounded-md border border-jura-border px-2.5 py-1 text-sm font-semibold text-jura-muted hover:text-jura-ink">
              Fechar
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {erro && <p className="text-sm text-jura-muted">{erro}</p>}
          {!conversa && !erro && <p className="text-sm text-jura-muted">Carregando…</p>}
          {conversa?.mensagens.length === 0 && <p className="text-sm text-jura-muted">Sem mensagens registradas.</p>}
          {conversa?.mensagens.map((m) => <Balao key={m.id} m={m} />)}
          <div ref={fimRef} />
        </div>

        {cliente && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-jura-border p-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-jura-ink">
              <input
                type="checkbox"
                checked={cliente.nunca_bot}
                onChange={async (e) => {
                  const valor = e.target.checked;
                  if (valor) {
                    const ok = await confirmar({
                      titulo: "Nunca usar o Jurinha com este número?",
                      mensagem: "Use para fornecedor, família ou cliente especial. O bot não responde mais esse número (as mensagens continuam registradas).",
                      confirmar: "Não usar bot",
                    });
                    if (!ok) return;
                  }
                  try {
                    await onNuncaBot(telefone, valor);
                    await carregar();
                  } catch (err) {
                    await avisar(err instanceof Error ? err.message : "Não deu pra salvar.");
                  }
                }}
                className="h-4 w-4 accent-jura-red"
              />
              Nunca usar o bot com este número
            </label>
            {pausado && (
              <BotaoVoltarBot
                nome={cliente.nome}
                onRetomar={async () => {
                  await onRetomar(telefone);
                  await carregar();
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const AUTOR: Record<MensagemConversa["autor"], { rotulo: string; lado: string; cor: string }> = {
  cliente: { rotulo: "Cliente", lado: "mr-auto bg-jura-card", cor: "text-jura-muted" },
  bot: { rotulo: "Jurinha", lado: "ml-auto bg-[#1f3a2a]", cor: "text-jura-green" },
  humano: { rotulo: "Atendente", lado: "ml-auto bg-[#1f2c44]", cor: "text-jura-blue" },
};

function Balao({ m }: { m: MensagemConversa }) {
  const a = AUTOR[m.autor];
  const imagem = m.tipo === "imagem" && m.midia_url;
  const audio = m.tipo === "audio" && m.midia_url;
  return (
    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${a.lado}`}>
      <p className={`mb-0.5 text-[11px] font-semibold ${a.cor}`}>
        {a.rotulo} · {dataCurta(m.criado_em)}
      </p>
      {imagem && (
        <a href={m.midia_url!} target="_blank" rel="noreferrer">
          {/* link assinado e temporário do Supabase: o next/image não serve aqui */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={m.midia_url!} alt={m.descricao_midia ?? "Foto enviada pelo cliente"} className="mb-1 max-h-60 rounded" />
        </a>
      )}
      {audio && <audio controls src={m.midia_url!} className="mb-1 w-full" />}
      {m.tipo === "documento" && m.midia_url && (
        <a href={m.midia_url} target="_blank" rel="noreferrer" className="mb-1 block text-jura-amber underline">
          Abrir documento
        </a>
      )}
      {m.tipo === "audio" && m.transcricao && <p className="italic text-jura-ink">🎤 “{m.transcricao}”</p>}
      {m.tipo !== "texto" && m.tipo !== "audio" && m.descricao_midia && (
        <p className="text-xs italic text-jura-muted">{m.descricao_midia.slice(0, 400)}</p>
      )}
      {m.tipo === "texto" && <p className="whitespace-pre-wrap text-jura-ink">{m.conteudo}</p>}
      {m.tipo === "outro" && m.conteudo && <p className="text-xs text-jura-muted">{m.conteudo.slice(0, 200)}</p>}
    </div>
  );
}

/** Feriados e dias em que a loja não abre (o Jurinha trata como fora do horário). */
export function DiasFechados({
  dias,
  onSalvar,
  onRemover,
}: {
  dias: { data: string; motivo: string }[];
  onSalvar: (data: string, motivo: string) => Promise<void>;
  onRemover: (data: string) => Promise<void>;
}) {
  const [data, setData] = useState("");
  const [motivo, setMotivo] = useState("");
  const { avisar } = useDialog();
  const exec = async (f: () => Promise<void>) => {
    try {
      await f();
    } catch (e) {
      await avisar(e instanceof Error ? e.message : "Não deu pra salvar.");
    }
  };
  return (
    <section className="rounded-xl bg-jura-panel p-5 shadow-card">
      <h2 className="section-title mb-1 text-lg">Feriados e dias fechados</h2>
      <p className="mb-4 text-sm text-jura-muted">Nesses dias o Jurinha avisa que o atendente responde quando a loja abrir.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!data) return;
          exec(async () => {
            await onSalvar(data, motivo);
            setData("");
            setMotivo("");
          });
        }}
        className="mb-4 flex flex-col gap-2 sm:flex-row"
      >
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
          className="rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-amber"
        />
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo (ex.: Feriado de Natal)"
          maxLength={80}
          className="flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-amber"
        />
        <button type="submit" className="rounded-lg bg-jura-red px-4 py-2 text-sm font-bold text-white hover:bg-jura-redDark">
          Adicionar
        </button>
      </form>
      {dias.length === 0 ? (
        <p className="text-jura-muted/70">Nenhum dia fechado cadastrado.</p>
      ) : (
        <ul className="space-y-1.5">
          {dias.map((d) => (
            <li key={d.data} className="flex items-center justify-between gap-2 rounded-lg border border-jura-border bg-jura-card px-3 py-2 text-sm">
              <span>
                <span className="font-mono font-semibold">{new Date(`${d.data}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                <span className="text-jura-muted"> · {d.motivo}</span>
              </span>
              <button onClick={() => exec(() => onRemover(d.data))} className="text-xs font-semibold text-jura-muted hover:text-jura-red">
                Remover
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Números em que o Jurinha nunca responde (fornecedor, família, cliente especial). */
export function NumerosSemBot({
  numeros,
  onAdicionar,
  onRemover,
}: {
  numeros: { telefone: string; nome: string | null }[];
  onAdicionar: (tel: string) => Promise<void>;
  onRemover: (tel: string) => Promise<void>;
}) {
  const [tel, setTel] = useState("");
  const { avisar } = useDialog();
  const exec = async (f: () => Promise<void>) => {
    try {
      await f();
    } catch (e) {
      await avisar(e instanceof Error ? e.message : "Não deu pra salvar.");
    }
  };
  return (
    <section className="rounded-xl bg-jura-panel p-5 shadow-card">
      <h2 className="section-title mb-1 text-lg">Números sem bot</h2>
      <p className="mb-4 text-sm text-jura-muted">Fornecedores, família, mecânicos e clientes especiais: o Jurinha não responde esses números.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          let d = tel.replace(/\D/g, "");
          if (d.length === 10 || d.length === 11) d = `55${d}`; // DDD + número → com 55
          if (d.length < 12) return void avisar("Digite o número com DDD, ex.: (19) 99999-9999");
          exec(async () => {
            await onAdicionar(d);
            setTel("");
          });
        }}
        className="mb-4 flex gap-2"
      >
        <input
          value={tel}
          onChange={(e) => setTel(e.target.value)}
          inputMode="tel"
          placeholder="(19) 99999-9999"
          className="flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono outline-none focus:border-jura-amber"
        />
        <button type="submit" className="rounded-lg bg-jura-red px-4 py-2 text-sm font-bold text-white hover:bg-jura-redDark">
          Adicionar
        </button>
      </form>
      {numeros.length === 0 ? (
        <p className="text-jura-muted/70">Nenhum número na lista.</p>
      ) : (
        <ul className="space-y-1.5">
          {numeros.map((n) => (
            <li key={n.telefone} className="flex items-center justify-between gap-2 rounded-lg border border-jura-border bg-jura-card px-3 py-2 text-sm">
              <Contato nome={n.nome} telefone={n.telefone} />
              <button onClick={() => exec(() => onRemover(n.telefone))} className="shrink-0 text-xs font-semibold text-jura-muted hover:text-jura-red">
                Tirar da lista
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ItemPausado({
  c,
  onRetomar,
}: {
  c: PausadoBot;
  onRetomar: (tel: string) => Promise<void>;
}) {
  const estado = ESTADO[c.estado];
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-jura-border bg-jura-card p-3">
      <div className="min-w-0 space-y-1">
        <Contato nome={c.nome} telefone={c.telefone} />
        <div className="flex flex-wrap items-center gap-1.5">
          <Selo cor={estado.cor}>{estado.rotulo}</Selo>
          {c.motivo_pausa === "iniciada_pela_loja" && <Selo cor="#9aa3ad">conversa iniciada pela loja</Selo>}
        </div>
        {c.pausado_ate && (
          <p className="text-xs text-jura-muted">Volta sozinho em {dataCurta(c.pausado_ate)}</p>
        )}
      </div>
      <BotaoVoltarBot nome={c.nome} onRetomar={() => onRetomar(c.telefone)} />
    </li>
  );
}

/** Interruptor geral do Jurinha. */
export function ChaveJurinha({
  ativo,
  onMudar,
}: {
  ativo: boolean;
  onMudar: (v: boolean) => Promise<void>;
}) {
  const { confirmar, avisar } = useDialog();
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      disabled={ocupado}
      aria-pressed={ativo}
      onClick={async () => {
        const ok = await confirmar({
          titulo: ativo ? "Desligar o Jurinha?" : "Ligar o Jurinha?",
          mensagem: ativo
            ? "Ninguém mais recebe resposta automática no WhatsApp até você ligar de novo. As mensagens continuam sendo registradas."
            : "O Jurinha volta a responder os clientes que não estão com atendente.",
          confirmar: ativo ? "Desligar" : "Ligar",
        });
        if (!ok) return;
        setOcupado(true);
        try {
          await onMudar(!ativo);
        } catch (e) {
          await avisar(e instanceof Error ? e.message : "Não deu pra mudar.");
        } finally {
          setOcupado(false);
        }
      }}
      className={`font-btn inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
        ativo
          ? "border-jura-green/60 text-jura-green hover:bg-jura-green/10"
          : "border-jura-red bg-jura-red text-white hover:bg-jura-redDark"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${ativo ? "bg-jura-green" : "bg-white"}`} />
      {ativo ? "Jurinha ligado" : "Jurinha desligado"}
    </button>
  );
}

/** Bloco compacto da Recepção: pedidos esperando atendente + atalho para a aba Bot. */
export function JurinhaRecepcao({
  pedidos,
  pausados,
  ativo,
  erro,
  onRetomar,
  onAbrirConversa,
  onArquivar,
}: {
  pedidos: PedidoBot[];
  pausados: PausadoBot[];
  ativo: boolean | null;
  erro: string | null;
  onRetomar: (tel: string) => Promise<void>;
  onAbrirConversa?: (tel: string) => void;
  onArquivar?: (id: number) => Promise<void>;
}) {
  const agora = useAgora();
  const esperando = pedidos.filter((p) => !p.respondido_em && agora - new Date(p.criado_em).getTime() < 7 * 86400000);

  return (
    <section className="h-full rounded-xl bg-jura-panel p-5 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title text-lg">
          Jurinha — WhatsApp{esperando.length ? ` (${esperando.length})` : ""}
        </h2>
        <div className="flex items-center gap-2">
          {ativo === false && <Selo cor="#ff6b6b">desligado</Selo>}
          <Link
            href="/bot"
            className="font-btn rounded-md border border-jura-border px-2.5 py-1 text-xs font-semibold text-jura-muted hover:border-jura-red hover:text-jura-ink"
          >
            Ver tudo
          </Link>
        </div>
      </div>

      {erro ? (
        <p className="text-sm text-jura-muted">{erro}</p>
      ) : esperando.length === 0 ? (
        <p className="text-jura-muted/70">
          Nenhum pedido esperando resposta.
          {pausados.length > 0 && ` ${pausados.length} conversa${pausados.length > 1 ? "s" : ""} com o bot pausado.`}
        </p>
      ) : (
        <ul className="space-y-2">
          {esperando.slice(0, 6).map((p) => (
            <ItemPedido key={p.id} p={p} agora={agora} onRetomar={onRetomar} onAbrirConversa={onAbrirConversa} onArquivar={onArquivar} />
          ))}
          {esperando.length > 6 && (
            <li className="text-center text-sm text-jura-muted">
              + {esperando.length - 6} na aba Bot
            </li>
          )}
        </ul>
      )}
    </section>
  );
}

export { useAgora };

/** Quem não manda mensagem há 30 dias ou mais: lista para a loja entrar em contato. */
export function RetornoLista({
  itens,
  onFeito,
  onAbrirConversa,
}: {
  itens: RetornoBot[];
  onFeito: (tel: string) => Promise<void>;
  onAbrirConversa?: (tel: string) => void;
}) {
  const { avisar } = useDialog();
  const [aba, setAba] = useState<"anotado" | "conversa">("anotado");
  const anotados = itens.filter((r) => r.anotado);
  const soConversa = itens.filter((r) => !r.anotado);
  const lista = aba === "anotado" ? anotados : soConversa;
  const resumo = (r: RetornoBot) => {
    const p = r.ultimo_pedido;
    if (!p) return null;
    const carro = [p.modelo, p.ano].filter(Boolean).join(" ");
    const oque =
      p.trilho === "pneu"
        ? `Pneus ${p.quantidade ? `${p.quantidade}x ` : ""}${p.medida ?? ""}`.trim()
        : p.trilho === "servico"
          ? p.servico ?? "Serviço"
          : p.assunto ?? "Atendimento";
    return [oque, carro].filter(Boolean).join(" · ");
  };
  return (
    <section className="rounded-xl bg-jura-panel p-5 shadow-card">
      <h2 className="section-title mb-1 text-lg">Retorno — 30 dias sem falar{itens.length ? ` (${itens.length})` : ""}</h2>
      <p className="mb-3 text-sm text-jura-muted">
        Clientes que mandaram a última mensagem há 30 dias ou mais. O Jurinha não manda nada sozinho: quem entra em
        contato é a loja. Depois de falar, marque &quot;Já entrei em contato&quot;.
      </p>
      <div className="mb-4 flex gap-1" role="tablist" aria-label="Tipo de retorno">
        {(
          [
            ["anotado", `Pediram algo (${anotados.length})`],
            ["conversa", `Só conversaram (${soConversa.length})`],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => setAba(id)}
            className={`rounded-md px-3 py-1 text-sm font-semibold ${
              aba === id ? "bg-jura-red text-white" : "text-jura-muted hover:text-jura-ink"
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {lista.length === 0 ? (
        <p className="text-jura-muted/70">
          {aba === "anotado" ? "Ninguém com pedido anotado nesta lista agora." : "Ninguém nesta lista agora."}
        </p>
      ) : (
        <ul className="space-y-2">
          {lista.map((r) => (
            <li key={r.telefone} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-jura-border bg-jura-card p-3">
              <div className="min-w-0 space-y-1">
                <Contato nome={r.nome} telefone={r.telefone} />
                {resumo(r) && <p className="text-sm font-semibold text-jura-amber">{resumo(r)}</p>}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Selo cor="#e0a106">
                    <IconClock className="h-3 w-3" /> última mensagem há {r.dias} dias
                  </Selo>
                  {r.ultimo_pedido?.compareceu === true && <Selo cor="#2ea043">veio da última vez</Selo>}
                  {r.ultimo_pedido?.compareceu === false && <Selo cor="#9aa3ad">não veio da última vez</Selo>}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {onAbrirConversa && (
                  <button
                    onClick={() => onAbrirConversa(r.telefone)}
                    className="rounded-md border border-jura-border px-2 py-1 text-[11px] font-semibold text-jura-ink hover:border-jura-amber hover:text-jura-amber"
                  >
                    Ver conversa
                  </button>
                )}
                <button
                  onClick={async () => {
                    try {
                      await onFeito(r.telefone);
                    } catch (e) {
                      await avisar(e instanceof Error ? e.message : "Não deu pra salvar.");
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-jura-green/60 px-2 py-1 text-[11px] font-semibold text-jura-green hover:bg-jura-green/10"
                >
                  <IconCheck className="h-3 w-3" /> Já entrei em contato
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
