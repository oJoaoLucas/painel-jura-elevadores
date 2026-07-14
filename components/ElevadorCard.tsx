"use client";

import { useState, useEffect } from "react";
import type { Elevador, ElevadorStatus } from "@/lib/supabase";
import {
  STATUS_META,
  COR_ALERTA,
  COR_ALERTA_TEXTO,
  COR_PAUSA,
  FUNDO_PAUSA,
  fimContagem,
  tempoDecorrido,
  carroParado,
  estimativaRestante,
  progressoPrevisto,
} from "@/lib/status";

// Cores da barra de progresso do tempo previsto
const COR_FASE = { ok: "#2ea043", perto: "#e0a106", estourou: "#d11f1f" };
import { montarServico, separarServico } from "@/lib/constantes";
import ServicoSelector from "@/components/ServicoSelector";
import AutoFitBox from "@/components/AutoFitBox";
import { setDrag, getDrag } from "@/lib/dnd";
import {
  IconCheck,
  IconUser,
  IconClock,
  IconPause,
  IconJuraLift,
  IconEngineAlert,
} from "@/components/Icon";
import { useDialog } from "@/components/Dialog";

type Props = {
  elevador: Elevador;
  mode?: "painel" | "admin";
  agora?: Date | null;
  alertaHoras?: number;
  onOcupar?: (
    id: number,
    dados: {
      placa: string;
      carro: string;
      servico: string;
      mecanico: string;
      previsto_min: number | null;
    }
  ) => void;
  onStatus?: (id: number, status: ElevadorStatus) => void;
  onPausar?: (id: number, pausar: boolean) => void;
  onLiberar?: (id: number) => void;
  onMoverAlinhamento?: (id: number) => void;
  onVoltarAguardando?: (id: number) => void;
  // Arrastar: soltou um carro aguardando neste elevador (livre).
  onSoltarAguardando?: (aguardandoId: string, elevadorId: number) => void;
};

export default function ElevadorCard(props: Props) {
  const { elevador, mode = "painel", agora, alertaHoras = 3 } = props;
  if (mode === "painel") {
    return (
      <ElevadorPainel
        elevador={elevador}
        agora={agora ?? new Date()}
        alertaHoras={alertaHoras}
      />
    );
  }
  return (
    <ElevadorAdminCard
      {...props}
      agora={agora ?? new Date()}
      alertaHoras={alertaHoras}
    />
  );
}

// ---------------- Painel (TV) — preenche o quadrado todo ----------------

function ElevadorPainel({
  elevador,
  agora,
  alertaHoras,
}: {
  elevador: Elevador;
  agora: Date;
  alertaHoras: number;
}) {
  const meta = STATUS_META[elevador.status];
  const livre = elevador.status === "livre";
  const pausado = !livre && !!elevador.pausado_em;
  // Pausado congela a contagem em pausado_em (almoço/fechado não conta)
  const fim = fimContagem(elevador.pausado_em, agora);
  const alerta =
    !livre && !pausado && carroParado(elevador.ocupado_em, fim, alertaHoras);
  const tempo = tempoDecorrido(elevador.ocupado_em, fim);
  const restante =
    !pausado && !alerta && elevador.previsto_min
      ? estimativaRestante(elevador.ocupado_em, fim, elevador.previsto_min)
      : null;
  const prog = progressoPrevisto(elevador.ocupado_em, fim, elevador.previsto_min);
  const servicoLinhas = (elevador.servico || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const cor = pausado ? COR_PAUSA : alerta ? COR_ALERTA : meta.cor;

  return (
    <div
      className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border shadow-card transition-colors ${
        meta.pulsa && !pausado ? "pulsa-pronto" : ""
      } ${alerta ? "pulsa-alerta" : ""}`}
      style={{
        borderColor: pausado ? COR_PAUSA : alerta ? COR_ALERTA : "#353c46",
        backgroundColor: pausado ? FUNDO_PAUSA : meta.fundo,
      }}
    >
      {/* Número do box "pintado" no fundo */}
      <span
        className="bay-ghost absolute -bottom-3 right-1 text-[8rem]"
        style={{ color: cor, opacity: 0.07 }}
      >
        {elevador.id}
      </span>

      {/* Faixa de status no topo */}
      <div
        className="relative flex items-center justify-between px-3 py-1.5 shadow-strip"
        style={{ backgroundColor: cor }}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <IconJuraLift className="h-5 w-5 shrink-0 text-white/90" />
          <span className="eyebrow truncate text-xl text-white">
            Elevador <span className="font-extrabold">{elevador.id}</span>
          </span>
        </span>
        <span className="eyebrow shrink-0 whitespace-nowrap text-base text-white/90">
          {pausado ? "Pausado" : alerta ? "Demorando" : meta.label}
        </span>
      </div>

      {/* Centro */}
      {livre ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2">
          <span style={{ color: meta.cor }}>
            <IconCheck className="h-20 w-20" />
          </span>
          <span className="eyebrow text-2xl text-jura-green/80">Livre</span>
        </div>
      ) : (
        <div className="relative flex min-h-0 w-full flex-1 flex-col px-3 py-2">
          {/* Carro + placa — pequeno, no canto */}
          <div className="flex items-center gap-2 border-b border-white/10 pb-1.5">
            <span className="truncate font-display text-3xl font-bold uppercase tracking-wider text-jura-ink">
              {elevador.carro || "—"}
            </span>
            {elevador.placa && (
              <span className="plate shrink-0 text-sm">{elevador.placa}</span>
            )}
          </div>

          {/* Serviços — lista que preenche o espaço, sem cortar */}
          <div className="min-h-0 flex-1 pt-2">
            {servicoLinhas.length === 0 ? (
              <span className="text-xl text-jura-muted/60">
                Sem serviço informado
              </span>
            ) : (
              <AutoFitBox className="items-start" dep={servicoLinhas.join("|")}>
                <ul className="w-full space-y-[0.3em]">
                  {servicoLinhas.map((linha, i) => (
                    <li
                      key={i}
                      className="whitespace-nowrap font-semibold leading-tight text-white"
                    >
                      {linha}
                    </li>
                  ))}
                </ul>
              </AutoFitBox>
            )}
          </div>
        </div>
      )}

      {/* Rodapé: mecânico (ou aviso de parado) + tempo */}
      {!livre && (
        <div
          className={`relative flex items-center justify-between border-t px-3 py-1 ${
            alerta ? "alerta-surge border-jura-red/40" : "border-white/10"
          }`}
          style={
            alerta
              ? {
                  backgroundColor: "rgba(209, 31, 31, 0.14)",
                  boxShadow: `inset 3px 0 0 ${COR_ALERTA}`,
                }
              : undefined
          }
        >
          <span className="flex min-w-0 items-center gap-1 truncate text-sm">
            {pausado ? (
              <span
                className="flex items-center gap-1.5 font-bold uppercase tracking-wide"
                style={{ color: COR_PAUSA }}
              >
                <IconPause className="h-4 w-4 shrink-0" />
                <span className="truncate">Tempo pausado</span>
              </span>
            ) : alerta ? (
              <span
                className="flex items-center gap-1.5 font-bold uppercase tracking-wide"
                style={{ color: COR_ALERTA_TEXTO }}
              >
                <IconEngineAlert className="h-4 w-4 shrink-0" />
                <span className="truncate">Carro muito tempo no elevador</span>
              </span>
            ) : (
              elevador.mecanico && (
                <span className="flex items-center gap-1 text-jura-muted">
                  <IconUser className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{elevador.mecanico}</span>
                </span>
              )
            )}
          </span>
          {tempo && (
            <span className="flex shrink-0 flex-col items-end leading-tight">
              <span
                className="flex items-center gap-1 font-mono text-sm font-bold tabular-nums"
                style={{
                  color: pausado
                    ? COR_PAUSA
                    : alerta
                      ? COR_ALERTA_TEXTO
                      : "rgba(255,255,255,0.55)",
                }}
              >
                <IconClock className="h-3.5 w-3.5" />
                {tempo}
              </span>
              {restante && (
                <span className="font-semibold text-[0.7em] text-jura-muted">
                  {restante.texto}
                </span>
              )}
            </span>
          )}
        </div>
      )}

      {/* Barra de progresso do tempo previsto (enche conforme o tempo passa) */}
      {!livre && prog && (
        <div className="h-2 w-full shrink-0 bg-black/40">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${prog.pct}%`, backgroundColor: COR_FASE[prog.fase] }}
          />
        </div>
      )}
    </div>
  );
}

// ---------------- Admin (Recepção) — bloco grande ----------------

function ElevadorAdminCard({
  elevador,
  agora,
  alertaHoras,
  onOcupar,
  onStatus,
  onPausar,
  onLiberar,
  onMoverAlinhamento,
  onVoltarAguardando,
  onSoltarAguardando,
}: Props & { agora: Date; alertaHoras: number }) {
  const meta = STATUS_META[elevador.status];
  const livre = elevador.status === "livre";
  const pausado = !livre && !!elevador.pausado_em;
  const fim = fimContagem(elevador.pausado_em, agora);
  const alerta =
    !livre && !pausado && carroParado(elevador.ocupado_em, fim, alertaHoras);
  const tempo = tempoDecorrido(elevador.ocupado_em, fim);
  const restante =
    !pausado && !alerta && elevador.previsto_min
      ? estimativaRestante(elevador.ocupado_em, fim, elevador.previsto_min)
      : null;
  const prog = progressoPrevisto(elevador.ocupado_em, fim, elevador.previsto_min);
  const { confirmar, avisar } = useDialog();

  const [placa, setPlaca] = useState("");
  const [carro, setCarro] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [mecanico, setMecanico] = useState("");
  const [previstoH, setPrevistoH] = useState("");
  const [previstoM, setPrevistoM] = useState("");
  const [sobre, setSobre] = useState(false); // arrastando um carro por cima

  useEffect(() => {
    setPlaca(elevador.placa || "");
    setCarro(elevador.carro || "");
    const { selecionados, extra } = separarServico(elevador.servico);
    setSelecionados(selecionados);
    setExtra(extra);
    setMecanico(elevador.mecanico || "");
    const pm = elevador.previsto_min || 0;
    setPrevistoH(Math.floor(pm / 60) ? String(Math.floor(pm / 60)) : "");
    setPrevistoM(pm % 60 ? String(pm % 60) : "");
  }, [
    elevador.placa,
    elevador.carro,
    elevador.servico,
    elevador.mecanico,
    elevador.previsto_min,
  ]);

  const toggle = (s: string) =>
    setSelecionados((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );

  const handleOcupar = async () => {
    if (!carro.trim() && !placa.trim()) {
      await avisar("Preencha ao menos a placa ou o carro.");
      return;
    }
    const total =
      (parseInt(previstoH, 10) || 0) * 60 + (parseInt(previstoM, 10) || 0);
    onOcupar?.(elevador.id, {
      placa: placa.trim(),
      carro: carro.trim(),
      servico: montarServico(selecionados, extra),
      mecanico,
      previsto_min: total > 0 ? total : null,
    });
  };

  const handleStatus = async (s: ElevadorStatus) => {
    onStatus?.(elevador.id, s);
    if (s === "pronto") {
      const ok = await confirmar({
        titulo: `Elevador ${elevador.id} pronto`,
        mensagem:
          "Mover este carro para a FILA DE ALINHAMENTO e liberar o elevador?",
        confirmar: "Mover pra fila",
        tom: "ok",
      });
      if (ok) onMoverAlinhamento?.(elevador.id);
    }
  };

  const handleLiberar = async () => {
    const ok = await confirmar({
      titulo: `Liberar Elevador ${elevador.id}`,
      mensagem: "O carro vai para o histórico. Confirmar?",
      confirmar: "Liberar",
      tom: "ok",
    });
    if (ok) onLiberar?.(elevador.id);
  };

  const handleAguardando = async () => {
    const ok = await confirmar({
      titulo: `Elevador ${elevador.id}`,
      mensagem:
        "Tirar o carro do elevador e mandar de volta para Carros aguardando?",
      confirmar: "Mandar pra espera",
    });
    if (ok) onVoltarAguardando?.(elevador.id);
  };

  return (
    <div
      onDragOver={
        livre
          ? (e) => {
              e.preventDefault();
              setSobre(true);
            }
          : undefined
      }
      onDragLeave={livre ? () => setSobre(false) : undefined}
      onDrop={
        livre
          ? (e) => {
              e.preventDefault();
              setSobre(false);
              const p = getDrag(e);
              if (p?.tipo === "aguardando")
                onSoltarAguardando?.(p.id, elevador.id);
            }
          : undefined
      }
      className={`flex min-w-0 flex-col rounded-xl border-2 p-3 shadow-card sm:p-4 ${
        alerta ? "pulsa-alerta" : ""
      } ${livre && sobre ? "ring-2 ring-jura-green" : ""}`}
      style={{
        borderColor: pausado ? COR_PAUSA : alerta ? COR_ALERTA : meta.cor,
        backgroundColor: pausado ? FUNDO_PAUSA : meta.fundo,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          {!livre && (
            <span
              draggable
              onDragStart={(e) =>
                setDrag(e, { tipo: "elevador", id: elevador.id })
              }
              className="shrink-0 cursor-grab select-none text-jura-muted hover:text-jura-ink active:cursor-grabbing"
              title="Arraste pra fila de alinhamento"
            >
              ⠿
            </span>
          )}
          <span className="truncate font-display text-xl font-extrabold uppercase tracking-wider">
            Elevador {elevador.id}
          </span>
        </span>
        <span
          className="shrink-0 whitespace-nowrap rounded-md px-2.5 py-0.5 text-xs font-bold uppercase text-white"
          style={{
            backgroundColor: pausado ? COR_PAUSA : alerta ? COR_ALERTA : meta.cor,
          }}
        >
          {pausado ? "Pausado" : alerta ? "Demorando" : meta.label}
        </span>
      </div>

      {!livre && tempo && (
        <p
          className="mb-2 flex flex-wrap items-center gap-1 font-mono text-sm font-bold"
          style={{
            color: pausado
              ? COR_PAUSA
              : alerta
                ? COR_ALERTA
                : "rgba(255,255,255,0.5)",
          }}
        >
          ⏱ {tempo} no elevador
          {pausado
            ? " — tempo pausado"
            : alerta
              ? " — carro muito tempo no elevador!"
              : restante
                ? ` · ${restante.texto}`
                : ""}
        </p>
      )}

      {/* Barra de progresso do tempo previsto */}
      {!livre && prog && (
        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${prog.pct}%`, backgroundColor: COR_FASE[prog.fase] }}
          />
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex min-w-0 gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            className="w-24 shrink-0 rounded-lg border border-jura-border bg-jura-input px-2 py-2 font-mono uppercase outline-none focus:border-jura-red sm:w-36 sm:px-3"
          />
          <input
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            placeholder="Carro (Gol 1.0)"
            className="min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
          />
        </div>

        <ServicoSelector
          selecionados={selecionados}
          extra={extra}
          mecanico={mecanico}
          onToggle={toggle}
          onExtra={setExtra}
          onMecanico={setMecanico}
          compacto
        />

        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-jura-muted">Tempo previsto</label>
          <input
            type="number"
            min={0}
            value={previstoH}
            onChange={(e) => setPrevistoH(e.target.value)}
            placeholder="0"
            className="w-14 rounded-lg border border-jura-border bg-jura-input px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-jura-red"
          />
          <span className="text-sm text-jura-muted">h</span>
          <input
            type="number"
            min={0}
            max={59}
            value={previstoM}
            onChange={(e) => setPrevistoM(e.target.value)}
            placeholder="0"
            className="w-14 rounded-lg border border-jura-border bg-jura-input px-2 py-1.5 text-center font-mono text-sm outline-none focus:border-jura-red"
          />
          <span className="text-sm text-jura-muted">min (opcional)</span>
        </div>
      </div>

      {/* Ações (só quando já ocupado) */}
      {!livre && (
        <div className="mt-3 flex gap-2">
          {/* Ocupado (status) */}
          <button
            onClick={() => handleStatus("ocupado")}
            className="min-w-0 flex-1 truncate rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors"
            style={{
              borderColor: STATUS_META.ocupado.cor,
              backgroundColor:
                elevador.status === "ocupado"
                  ? STATUS_META.ocupado.cor
                  : "transparent",
              color:
                elevador.status === "ocupado" ? "#fff" : STATUS_META.ocupado.cor,
            }}
          >
            Ocupado
          </button>

          {/* Aguardando (ação: volta pra fila de Carros aguardando) */}
          <button
            onClick={handleAguardando}
            className="min-w-0 flex-1 truncate rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors hover:bg-jura-blue hover:text-white"
            style={{
              borderColor: STATUS_META.aguardando.cor,
              color: STATUS_META.aguardando.cor,
            }}
          >
            Aguardando
          </button>

          {/* Pronto (status) */}
          <button
            onClick={() => handleStatus("pronto")}
            className="min-w-0 flex-1 truncate rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors"
            style={{
              borderColor: STATUS_META.pronto.cor,
              backgroundColor:
                elevador.status === "pronto"
                  ? STATUS_META.pronto.cor
                  : "transparent",
              color:
                elevador.status === "pronto" ? "#fff" : STATUS_META.pronto.cor,
            }}
          >
            Pronto
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleOcupar}
          className="min-w-0 flex-1 truncate rounded-md bg-jura-red px-2 py-1.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:px-3"
        >
          {livre ? "Ocupar" : "Salvar"}
        </button>
        {!livre && (
          <button
            onClick={() => onPausar?.(elevador.id, !pausado)}
            className="min-w-0 flex-1 truncate rounded-md border px-2 py-1.5 text-sm font-bold uppercase tracking-wide transition-colors sm:px-3"
            style={{
              borderColor: COR_PAUSA,
              backgroundColor: pausado ? COR_PAUSA : "transparent",
              color: pausado ? "#fff" : COR_PAUSA,
            }}
            title={
              pausado
                ? "Retomar a contagem de tempo"
                : "Pausar a contagem de tempo (almoço/fechado)"
            }
          >
            {pausado ? "Retomar" : "Pausar"}
          </button>
        )}
        {!livre && (
          <button
            onClick={handleLiberar}
            className="min-w-0 flex-1 truncate rounded-md border border-jura-green px-2 py-1.5 text-sm font-bold uppercase tracking-wide text-jura-green transition-colors hover:bg-jura-green hover:text-white sm:px-3"
          >
            Liberar
          </button>
        )}
      </div>
    </div>
  );
}
