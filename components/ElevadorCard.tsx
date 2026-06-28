"use client";

import { useState, useEffect } from "react";
import type { Elevador, ElevadorStatus } from "@/lib/supabase";
import { STATUS_META, tempoDecorrido, carroParado } from "@/lib/status";
import { montarServico, separarServico } from "@/lib/constantes";
import ServicoSelector from "@/components/ServicoSelector";
import AutoFitBox from "@/components/AutoFitBox";
import { IconCheck, IconUser, IconClock } from "@/components/Icon";
import { useDialog } from "@/components/Dialog";

type Props = {
  elevador: Elevador;
  mode?: "painel" | "admin";
  agora?: Date | null;
  alertaHoras?: number;
  onOcupar?: (
    id: number,
    dados: { placa: string; carro: string; servico: string; mecanico: string }
  ) => void;
  onStatus?: (id: number, status: ElevadorStatus) => void;
  onLiberar?: (id: number) => void;
  onMoverAlinhamento?: (id: number) => void;
  onVoltarAguardando?: (id: number) => void;
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
  const alerta = !livre && carroParado(elevador.ocupado_em, agora, alertaHoras);
  const tempo = tempoDecorrido(elevador.ocupado_em, agora);
  const servicoLinhas = (elevador.servico || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const cor = alerta ? "#e0a106" : meta.cor;

  return (
    <div
      className={`relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border shadow-card transition-colors ${
        meta.pulsa ? "pulsa-pronto" : ""
      } ${alerta ? "pulsa-alerta" : ""}`}
      style={{
        borderColor: alerta ? "#e0a106" : "#353c46",
        backgroundColor: meta.fundo,
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
        <span className="eyebrow truncate text-xl text-white">
          Elevador <span className="font-extrabold">{elevador.id}</span>
        </span>
        <span className="eyebrow shrink-0 whitespace-nowrap text-base text-white/90">
          {alerta ? "Parado" : meta.label}
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
            <span className="truncate font-display text-2xl font-bold uppercase tracking-wide text-jura-ink">
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
                      className="whitespace-nowrap font-semibold leading-tight text-jura-amber"
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

      {/* Rodapé: mecânico + tempo */}
      {!livre && (
        <div className="relative flex items-center justify-between border-t border-white/10 px-3 py-1">
          <span className="flex min-w-0 items-center gap-1 truncate text-sm text-jura-muted">
            {elevador.mecanico && (
              <>
                <IconUser className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{elevador.mecanico}</span>
              </>
            )}
          </span>
          {tempo && (
            <span
              className="flex shrink-0 items-center gap-1 font-mono text-sm font-bold tabular-nums"
              style={{ color: alerta ? "#ffce4d" : "rgba(255,255,255,0.55)" }}
            >
              <IconClock className="h-3.5 w-3.5" />
              {tempo}
            </span>
          )}
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
  onLiberar,
  onMoverAlinhamento,
  onVoltarAguardando,
}: Props & { agora: Date; alertaHoras: number }) {
  const meta = STATUS_META[elevador.status];
  const livre = elevador.status === "livre";
  const alerta = !livre && carroParado(elevador.ocupado_em, agora, alertaHoras);
  const tempo = tempoDecorrido(elevador.ocupado_em, agora);
  const { confirmar, avisar } = useDialog();

  const [placa, setPlaca] = useState("");
  const [carro, setCarro] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [mecanico, setMecanico] = useState("");

  useEffect(() => {
    setPlaca(elevador.placa || "");
    setCarro(elevador.carro || "");
    const { selecionados, extra } = separarServico(elevador.servico);
    setSelecionados(selecionados);
    setExtra(extra);
    setMecanico(elevador.mecanico || "");
  }, [elevador.placa, elevador.carro, elevador.servico, elevador.mecanico]);

  const toggle = (s: string) =>
    setSelecionados((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );

  const handleOcupar = async () => {
    if (!carro.trim() && !placa.trim()) {
      await avisar("Preencha ao menos a placa ou o carro.");
      return;
    }
    onOcupar?.(elevador.id, {
      placa: placa.trim(),
      carro: carro.trim(),
      servico: montarServico(selecionados, extra),
      mecanico,
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
      className={`flex flex-col rounded-xl border-2 p-4 shadow-card ${
        alerta ? "pulsa-alerta" : ""
      }`}
      style={{
        borderColor: alerta ? "#cc8800" : meta.cor,
        backgroundColor: meta.fundo,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-xl font-extrabold uppercase tracking-wider">
          Elevador {elevador.id}
        </span>
        <span
          className="rounded-md px-2.5 py-0.5 text-xs font-bold uppercase text-white"
          style={{ backgroundColor: meta.cor }}
        >
          {meta.label}
        </span>
      </div>

      {!livre && tempo && (
        <p
          className="mb-2 font-mono text-sm"
          style={{ color: alerta ? "#ffb733" : "rgba(255,255,255,0.5)" }}
        >
          ⏱ {tempo} no elevador{alerta ? " — carro parado!" : ""}
        </p>
      )}

      <div className="space-y-2.5">
        <div className="flex gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            className="w-36 rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono uppercase outline-none focus:border-jura-red"
          />
          <input
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            placeholder="Carro (Gol 1.0)"
            className="flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
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
      </div>

      {/* Ações (só quando já ocupado) */}
      {!livre && (
        <div className="mt-3 flex gap-2">
          {/* Ocupado (status) */}
          <button
            onClick={() => handleStatus("ocupado")}
            className="flex-1 rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors"
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
            className="flex-1 rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors hover:bg-jura-blue hover:text-white"
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
            className="flex-1 rounded-md border px-1 py-1 text-xs font-bold uppercase transition-colors"
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
          className="flex-1 rounded-md bg-jura-red px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          {livre ? "Ocupar" : "Salvar"}
        </button>
        {!livre && (
          <button
            onClick={handleLiberar}
            className="flex-1 rounded-md border border-jura-green px-3 py-1.5 text-sm font-bold uppercase tracking-wide text-jura-green transition-colors hover:bg-jura-green hover:text-white"
          >
            Liberar
          </button>
        )}
      </div>
    </div>
  );
}
