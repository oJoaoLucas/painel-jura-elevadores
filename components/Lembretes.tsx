"use client";

import { useState } from "react";
import type { Lembrete } from "@/lib/supabase";
import { useMecanicos } from "@/components/MecanicosProvider";
import AutoFitBox from "@/components/AutoFitBox";
import { IconAlert, IconMegaphone } from "@/components/Icon";
import { useDialog } from "@/components/Dialog";

type Props = {
  lembretes: Lembrete[];
  mode?: "painel" | "admin";
  onAdd?: (texto: string, destinatario: string, prioridade: "normal" | "urgente") => void;
  onRemove?: (id: string) => void;
};

// Na TV, lembretes somem sozinhos depois de 12h pra não acumular lixo.
const HORAS_VISIVEL = 12;

export default function Lembretes({
  lembretes,
  mode = "painel",
  onAdd,
  onRemove,
}: Props) {
  const { confirmar } = useDialog();
  const MECANICOS = useMecanicos();
  const [texto, setTexto] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [prioridade, setPrioridade] = useState<"normal" | "urgente">("normal");

  const ordenados = [...lembretes].sort((a, b) => {
    // urgentes primeiro, depois mais recentes
    if (a.prioridade !== b.prioridade) return a.prioridade === "urgente" ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // ----- Modo Painel (TV) -----
  if (mode === "painel") {
    const agora = Date.now();
    const visiveis = ordenados.filter(
      (l) => agora - new Date(l.created_at).getTime() < HORAS_VISIVEL * 3600000
    );
    return (
      <div
        className="flex h-full flex-col rounded-lg border border-jura-border bg-jura-card p-4"
        style={{ borderLeft: "5px solid #d11f1f" }}
      >
        <h2 className="section-title mb-3 flex items-center gap-2 text-lg">
          <IconMegaphone className="h-[1.1em] w-[1.1em] shrink-0 text-jura-red" />
          Lembretes — Recepção
        </h2>
        <div className="min-h-0 flex-1">
          {visiveis.length === 0 ? (
            <p className="text-jura-muted/60">Nenhum lembrete pendente.</p>
          ) : (
            <AutoFitBox
              className="items-start"
              max={30}
              dep={visiveis.map((l) => l.id + l.texto).join()}
            >
              <ul className="space-y-[0.5em]">
                {visiveis.map((l) => {
                  const urgente = l.prioridade === "urgente";
                  return (
                    <li
                      key={l.id}
                      className="flex items-start gap-[0.5em]"
                      style={{ color: urgente ? "#ff8a8a" : "#eef1f4" }}
                    >
                      <span className="mt-[0.15em] shrink-0">
                        {urgente ? (
                          <IconAlert className="h-[0.95em] w-[0.95em]" />
                        ) : (
                          <IconMegaphone className="h-[0.95em] w-[0.95em] text-jura-amber" />
                        )}
                      </span>
                      <span>
                        {l.destinatario && (
                          <span className="font-bold text-jura-amber">
                            {l.destinatario}:{" "}
                          </span>
                        )}
                        {l.texto}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </AutoFitBox>
          )}
        </div>
      </div>
    );
  }

  // ----- Modo Admin (Recepção) -----
  const handleAdd = () => {
    if (!texto.trim()) return;
    onAdd?.(texto.trim(), destinatario.trim(), prioridade);
    setTexto("");
    setDestinatario("");
    setPrioridade("normal");
  };

  return (
    <div
      className="rounded-lg border border-jura-border bg-jura-card p-4"
      style={{ borderLeft: "5px solid #cc8800" }}
    >
      <h2 className="section-title mb-4 text-lg">Lembretes — Recepção</h2>

      <div className="mb-4 space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={destinatario}
            onChange={(e) => setDestinatario(e.target.value)}
            className="rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-amber sm:w-48"
          >
            <option value="">Geral (todos)</option>
            {MECANICOS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex: Civic da Ana está pronto"
            className="flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-amber"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={prioridade}
            onChange={(e) =>
              setPrioridade(e.target.value as "normal" | "urgente")
            }
            className="rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-amber"
          >
            <option value="normal">Normal</option>
            <option value="urgente">Urgente</option>
          </select>
          <button
            onClick={handleAdd}
            className="flex-1 rounded bg-jura-amber px-4 py-2 font-bold uppercase tracking-wide text-black transition-opacity hover:opacity-90"
          >
            Enviar lembrete
          </button>
        </div>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-white/40">Nenhum lembrete.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((l) => {
            const urgente = l.prioridade === "urgente";
            return (
              <li
                key={l.id}
                className="flex items-start gap-2 rounded border bg-black/30 px-3 py-2"
                style={{ borderColor: urgente ? "#cc0000" : "#222222" }}
              >
                <span>{urgente ? "⚠️" : "📢"}</span>
                <span className="flex-1">
                  {l.destinatario && (
                    <span className="font-bold text-jura-amber">
                      {l.destinatario}:{" "}
                    </span>
                  )}
                  {l.texto}
                </span>
                <button
                  onClick={async () => {
                    if (
                      await confirmar({
                        mensagem: "Remover este lembrete?",
                        confirmar: "Remover",
                        tom: "perigo",
                      })
                    )
                      onRemove?.(l.id);
                  }}
                  className="rounded border border-jura-red px-2 py-0.5 text-sm text-jura-red transition-colors hover:bg-jura-red hover:text-white"
                  title="Remover"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
