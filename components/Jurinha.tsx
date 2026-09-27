"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/Dialog";
import { IconAlert, IconCheck, IconClock, IconUndo } from "@/components/Icon";
import {
  MOTIVO_REPASSE,
  dataCurta,
  formatarTelefone,
  linkWhatsApp,
  resumoPedido,
  tempoDesde,
  type EstadoBot,
  type PausadoBot,
  type PedidoBot,
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

export function ItemPedido({
  p,
  agora,
  onRetomar,
}: {
  p: PedidoBot;
  agora: number;
  onRetomar?: (tel: string) => Promise<void>;
}) {
  const { titulo, detalhe } = resumoPedido(p);
  const minSemResposta = p.respondido_em ? 0 : (agora - new Date(p.criado_em).getTime()) / 60000;
  const motivo = MOTIVO_REPASSE[p.motivo_repasse];
  const pausado = p.estado !== "bot" && (!p.pausado_ate || new Date(p.pausado_ate).getTime() > agora);

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-jura-border bg-jura-card p-3">
      <div className="min-w-0 space-y-1">
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
      </div>
      {onRetomar && pausado && <BotaoVoltarBot nome={p.nome} onRetomar={() => onRetomar(p.telefone)} />}
    </li>
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
}: {
  pedidos: PedidoBot[];
  pausados: PausadoBot[];
  ativo: boolean | null;
  erro: string | null;
  onRetomar: (tel: string) => Promise<void>;
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
            <ItemPedido key={p.id} p={p} agora={agora} onRetomar={onRetomar} />
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
