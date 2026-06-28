"use client";

import { useState } from "react";
import type { FilaItem } from "@/lib/supabase";
import AutoFitBox from "@/components/AutoFitBox";
import { useDialog } from "@/components/Dialog";

type Props = {
  itens: FilaItem[];
  mode?: "painel" | "admin";
  onAdd?: (placa: string, carro: string) => void;
  onRemove?: (id: string) => void;
  onMove?: (id: string, dir: "up" | "down") => void;
};

export default function FilaAlinhamento({
  itens,
  mode = "painel",
  onAdd,
  onRemove,
  onMove,
}: Props) {
  const { confirmar, avisar } = useDialog();
  const [placa, setPlaca] = useState("");
  const [carro, setCarro] = useState("");

  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);

  // ----- Modo Painel (TV) -----
  if (mode === "painel") {
    return (
      <div
        className="flex h-full flex-col rounded-lg border border-jura-border bg-jura-card p-4"
        style={{ borderLeft: "5px solid #d11f1f" }}
      >
        <h2 className="section-title mb-3 flex items-center gap-2 text-lg">
          Fila — Alinhamento
          {ordenados.length > 0 && (
            <span className="rounded bg-jura-red/15 px-2 py-0.5 font-mono text-sm font-bold text-jura-red">
              {ordenados.length}
            </span>
          )}
        </h2>
        <div className="min-h-0 flex-1">
          {ordenados.length === 0 ? (
            <p className="text-jura-muted/60">Nenhum carro na fila.</p>
          ) : (
            <AutoFitBox
              className="items-stretch"
              max={40}
              dep={ordenados.map((i) => i.id + i.carro + i.placa).join()}
            >
              {/* Pista horizontal: PRÓXIMO em destaque + demais como fichas */}
              <div className="flex h-full w-full items-stretch gap-[0.6em]">
                {/* Próximo — cartão grande */}
                <div className="flex shrink-0 flex-col justify-center rounded-lg border border-jura-red bg-jura-red/10 px-[0.8em] py-[0.4em]">
                  <span className="eyebrow text-[0.55em] text-jura-red">
                    Próximo
                  </span>
                  <span className="font-display text-[1.4em] font-bold uppercase leading-none text-jura-ink">
                    {ordenados[0].carro || ordenados[0].placa}
                  </span>
                  {ordenados[0].carro && ordenados[0].placa && (
                    <span className="plate mt-[0.25em] self-start text-[0.5em]">
                      {ordenados[0].placa}
                    </span>
                  )}
                </div>

                {/* Demais — fichas numeradas em sequência */}
                <div className="flex min-w-0 flex-1 flex-wrap content-center gap-[0.5em]">
                  {ordenados.slice(1).map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-[0.45em] rounded-lg border border-jura-border bg-jura-bg/60 px-[0.6em] py-[0.3em]"
                    >
                      <span className="font-mono text-[0.8em] font-bold text-jura-red">
                        {i + 2}
                      </span>
                      <span className="font-semibold text-jura-ink">
                        {item.carro || item.placa}
                      </span>
                      {item.carro && item.placa && (
                        <span className="plate text-[0.6em]">{item.placa}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </AutoFitBox>
          )}
        </div>
      </div>
    );
  }

  // ----- Modo Admin (Recepção) -----
  const handleAdd = async () => {
    // Placa é opcional — basta informar o carro (ou a placa)
    if (!placa.trim() && !carro.trim()) {
      await avisar("Informe ao menos o carro.");
      return;
    }
    onAdd?.(placa.trim(), carro.trim());
    setPlaca("");
    setCarro("");
  };

  return (
    <div
      className="rounded-lg border border-jura-border bg-jura-card p-4"
      style={{ borderLeft: "5px solid #cc0000" }}
    >
      <h2 className="section-title mb-4 text-lg">Fila — Alinhamento</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          value={placa}
          onChange={(e) => setPlaca(e.target.value.toUpperCase())}
          placeholder="Placa (opcional)"
          className="min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono uppercase outline-none focus:border-jura-red"
        />
        <input
          value={carro}
          onChange={(e) => setCarro(e.target.value)}
          placeholder="Carro"
          className="min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          className="shrink-0 whitespace-nowrap rounded bg-jura-red px-4 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          Adicionar
        </button>
      </div>

      {ordenados.length === 0 ? (
        <p className="text-white/40">Nenhum carro na fila.</p>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((item, i) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded border border-jura-border bg-black/30 px-3 py-2"
            >
              <span className="font-bold text-jura-red">{i + 1}.</span>
              <span className="font-semibold">{item.carro || item.placa}</span>
              {item.carro && item.placa && (
                <>
                  <span className="text-white/40">·</span>
                  <span className="font-mono uppercase text-white/70">
                    {item.placa}
                  </span>
                </>
              )}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => onMove?.(item.id, "up")}
                  disabled={i === 0}
                  className="rounded border border-jura-border px-2 py-1 text-sm disabled:opacity-30"
                  title="Subir"
                >
                  ▲
                </button>
                <button
                  onClick={() => onMove?.(item.id, "down")}
                  disabled={i === ordenados.length - 1}
                  className="rounded border border-jura-border px-2 py-1 text-sm disabled:opacity-30"
                  title="Descer"
                >
                  ▼
                </button>
                <button
                  onClick={async () => {
                    if (
                      await confirmar({
                        mensagem: `Remover "${item.carro || item.placa}" da fila de alinhamento?`,
                        confirmar: "Remover",
                        tom: "perigo",
                      })
                    )
                      onRemove?.(item.id);
                  }}
                  className="rounded border border-jura-red px-2 py-1 text-sm text-jura-red transition-colors hover:bg-jura-red hover:text-white"
                  title="Remover"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
