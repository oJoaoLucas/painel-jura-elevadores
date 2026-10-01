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
  formatarHora,
  combinarHora,
} from "@/lib/status";

// Cores da barra de progresso do tempo previsto
const COR_FASE = { ok: "#2ea043", perto: "#e0a106", estourou: "#d11f1f" };
import { montarServico, separarServico } from "@/lib/constantes";
import ServicoSelector from "@/components/ServicoSelector";
import AutoFitBox from "@/components/AutoFitBox";
import RelogioAnimado from "@/components/RelogioAnimado";
import { setDrag, getDrag } from "@/lib/dnd";
import {
  IconCheck,
  IconUser,
  IconClock,
  IconPause,
  IconJuraLift,
  IconEngineAlert,
  IconGrip,
  IconUndo,
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
      ocupado_em?: string | null;
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
  // Sem serviço informado: carro e tempo vão grandes pro meio do card
  const foco = !livre && servicoLinhas.length === 0;
  const corTempo = pausado
    ? COR_PAUSA
    : alerta
      ? COR_ALERTA_TEXTO
      : "rgba(255,255,255,0.85)";
  // No modo foco o rodapé só aparece se tiver mecânico ou aviso pra mostrar
  const mostrarRodape =
    !livre && (!foco || pausado || alerta || !!elevador.mecanico);

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
        <div
          key="livre"
          className="flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2"
        >
          <span className="tv-livre-entra" style={{ color: meta.cor }}>
            <IconCheck className="h-20 w-20" />
          </span>
          <span className="eyebrow text-2xl text-jura-green/80">Livre</span>
        </div>
      ) : foco ? (
        <div
          key={`foco-${elevador.ocupado_em}`}
          className="tv-entra relative flex min-h-0 w-full flex-1 flex-col items-center px-3 py-3"
        >
          {/* Carro + placa — grande, no centro */}
          <div className="min-h-0 w-full flex-[4]">
            <AutoFitBox
              max={150}
              dep={`${elevador.carro}|${elevador.placa}`}
              className="items-end justify-center"
            >
              <div className="flex flex-col items-center gap-[0.12em] text-center">
                <span className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-wider text-jura-ink">
                  {elevador.carro || "—"}
                </span>
                {elevador.placa && (
                  <span className="plate text-[0.28em]">{elevador.placa}</span>
                )}
              </div>
            </AutoFitBox>
          </div>

          <div className="my-[4%] h-px w-2/5 shrink-0 bg-white/10" />

          {/* Relógio animado + tempo grande */}
          <div className="min-h-0 w-full flex-[5]">
            <AutoFitBox
              max={110}
              dep={`${tempo}|${restante?.texto ?? ""}`}
              className="items-start justify-center"
            >
              <div
                className="flex flex-col items-center"
                style={{ color: corTempo }}
              >
                <span className="flex items-center gap-[0.25em] font-mono font-extrabold leading-none tabular-nums">
                  <RelogioAnimado
                    parado={pausado}
                    className="text-[0.85em]"
                  />
                  <span key={tempo} className="tv-tempo-troca">
                    {tempo || "0min"}
                  </span>
                </span>
                {restante && (
                  <span className="mt-[0.3em] whitespace-nowrap text-[0.28em] font-semibold text-jura-muted">
                    {restante.texto}
                  </span>
                )}
              </div>
            </AutoFitBox>
          </div>
        </div>
      ) : (
        <div
          key={`servico-${elevador.ocupado_em}`}
          className="tv-entra relative flex min-h-0 w-full flex-1 flex-col px-3 py-2"
        >
          {/* Carro + placa — grande no topo; encolhe se o nome for comprido */}
          <div className="h-14 shrink-0 border-b border-white/10 pb-1.5">
            <AutoFitBox
              max={48}
              dep={`${elevador.carro}|${elevador.placa}`}
              className="items-center"
            >
              <div className="flex items-center gap-[0.25em]">
                <span className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-wider text-jura-ink">
                  {elevador.carro || "—"}
                </span>
                {elevador.placa && (
                  <span className="plate shrink-0 text-[0.4em]">
                    {elevador.placa}
                  </span>
                )}
              </div>
            </AutoFitBox>
          </div>

          {/* Serviços — lista que preenche o espaço, sem cortar */}
          <div className="min-h-0 flex-1 pt-2">
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
          </div>
        </div>
      )}

      {/* Rodapé: tempo grande + restante à esquerda; à direita a luz da
          injeção (demorando), o ícone de pausa ou o mecânico */}
      {mostrarRodape && (
        <div
          className={`relative flex items-center justify-between gap-3 border-t px-3 ${
            foco ? "py-1.5" : "py-2"
          } ${alerta ? "alerta-surge border-jura-red/40" : "border-white/10"}`}
          style={
            alerta
              ? {
                  backgroundColor: "rgba(209, 31, 31, 0.14)",
                  boxShadow: `inset 3px 0 0 ${COR_ALERTA}`,
                }
              : undefined
          }
        >
          {foco ? (
            // Tempo já está grande no centro: aqui só o mecânico
            <span className="flex min-w-0 items-center gap-1 text-base text-jura-muted">
              {elevador.mecanico && (
                <>
                  <IconUser className="h-4 w-4 shrink-0" />
                  <span className="truncate">{elevador.mecanico}</span>
                </>
              )}
            </span>
          ) : (
            tempo && (
              <span
                className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5"
                style={{ color: corTempo }}
              >
                <span className="flex shrink-0 items-center gap-2 font-mono text-4xl font-extrabold leading-none tabular-nums">
                  <RelogioAnimado parado={pausado} className="text-[0.85em]" />
                  <span key={tempo} className="tv-tempo-troca">
                    {tempo}
                  </span>
                </span>
                {restante && (
                  <span className="whitespace-nowrap text-lg font-semibold text-jura-muted">
                    {restante.texto}
                  </span>
                )}
              </span>
            )
          )}

          {alerta ? (
            <span
              className="luz-injecao shrink-0"
              style={{ color: COR_ALERTA_TEXTO }}
              title="Carro muito tempo no elevador"
            >
              <IconEngineAlert className={foco ? "h-8 w-8" : "h-10 w-10"} />
            </span>
          ) : pausado ? (
            <span className="shrink-0" style={{ color: COR_PAUSA }}>
              <IconPause className={foco ? "h-7 w-7" : "h-8 w-8"} />
            </span>
          ) : (
            !foco &&
            elevador.mecanico && (
              <span className="flex min-w-0 shrink items-center gap-1 text-base text-jura-muted">
                <IconUser className="h-4 w-4 shrink-0" />
                <span className="truncate">{elevador.mecanico}</span>
              </span>
            )
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
  const [horaInicio, setHoraInicio] = useState("");
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
    setHoraInicio(formatarHora(elevador.ocupado_em));
  }, [
    elevador.placa,
    elevador.carro,
    elevador.servico,
    elevador.mecanico,
    elevador.previsto_min,
    elevador.ocupado_em,
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
      // só reenvia o início editado quando o carro já estava no elevador;
      // pra um carro novo o horário é sempre "agora" (ver ocuparElevador)
      ocupado_em: livre ? null : combinarHora(elevador.ocupado_em, horaInicio),
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

  const campoPrevisto = (
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
  );

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
      className={`flex min-w-0 flex-col rounded-xl border-2 p-3 shadow-card transition-colors duration-300 motion-reduce:transition-none sm:p-4 ${
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
              <IconGrip className="h-5 w-5" />
            </span>
          )}
          <span className="truncate font-title text-2xl leading-none tracking-wide">
            Elevador {elevador.id}
          </span>
        </span>
        <span
          className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold uppercase text-white"
          style={{
            backgroundColor: pausado ? COR_PAUSA : alerta ? COR_ALERTA : meta.cor,
          }}
        >
          {pausado ? "Pausado" : alerta ? "Demorando" : meta.label}
        </span>
      </div>

      {/* Tempo no elevador + horário de início (editável) na mesma linha */}
      {!livre && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {tempo && (
            <p
              className="flex min-w-0 flex-wrap items-center gap-1 font-mono text-sm font-bold"
              style={{
                color: pausado ? COR_PAUSA : alerta ? COR_ALERTA_TEXTO : "#9aa3ad",
              }}
            >
              <IconClock className="h-4 w-4 shrink-0" />
              {tempo} no elevador
              {pausado
                ? " · tempo pausado"
                : alerta
                  ? " · passou do limite"
                  : restante
                    ? ` · ${restante.texto}`
                    : ""}
            </p>
          )}
          <label className="ml-auto flex items-center gap-1.5 text-sm text-jura-muted">
            desde
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              title="Horário em que o carro entrou. Editar e salvar recalcula o tempo."
              className="w-[6.5rem] rounded-lg border border-jura-border bg-jura-input px-2 py-1 text-center font-mono text-sm text-jura-ink outline-none focus:border-jura-red"
            />
          </label>
        </div>
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
          emLinha
        />

        {livre && campoPrevisto}
      </div>

      {/* Status (Ocupado / Pronto) separado das ações */}
      {!livre && (
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div
            role="group"
            aria-label="Status do elevador"
            className="flex rounded-lg border border-jura-border bg-black/30 p-0.5"
          >
            {(["ocupado", "pronto"] as const).map((s) => {
              const ativo = elevador.status === s;
              return (
                <button
                  key={s}
                  onClick={() => handleStatus(s)}
                  aria-pressed={ativo}
                  className="rounded-md px-3 py-1 text-sm font-semibold transition-colors"
                  style={{
                    backgroundColor: ativo ? STATUS_META[s].cor : "transparent",
                    color: ativo ? "#fff" : STATUS_META[s].cor,
                  }}
                >
                  {STATUS_META[s].label}
                </button>
              );
            })}
          </div>
          {campoPrevisto}
          <button
            onClick={handleAguardando}
            className="ml-auto flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-jura-muted transition-colors hover:bg-white/5 hover:text-jura-ink"
            title="Tira o carro do elevador e manda de volta pra Carros aguardando"
          >
            <IconUndo className="h-4 w-4" />
            Voltar pra espera
          </button>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        <button
          onClick={handleOcupar}
          className="min-w-0 flex-[1.4] truncate rounded-lg bg-jura-red px-3 py-2 text-sm font-bold uppercase tracking-wide text-white hover:opacity-90"
        >
          {livre ? "Ocupar" : "Salvar"}
        </button>
        {!livre && (
          <button
            onClick={() => onPausar?.(elevador.id, !pausado)}
            className="min-w-0 flex-1 truncate rounded-lg border px-2 py-2 text-sm font-semibold sm:px-3"
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
            className="min-w-0 flex-1 truncate rounded-lg border border-jura-green px-2 py-2 text-sm font-semibold text-jura-green hover:bg-jura-green hover:text-white sm:px-3"
          >
            Liberar
          </button>
        )}
      </div>
    </div>
  );
}
