"use client";

import { useState } from "react";
import Link from "next/link";
import type { Retorno } from "@/lib/supabase";
import { useDialog } from "@/components/Dialog";
import { IconChart } from "@/components/Icon";

// Data de hoje em "YYYY-MM-DD" (fuso local) pro input type=date
export function hojeISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}

// Mostra "14/07" a partir de "2026-07-14"
function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

type Props = {
  itens: Retorno[];
  onAdd: (dados: {
    placa: string;
    carro: string;
    data: string;
    descricao: string;
  }) => void;
  onRemove: (id: string) => void;
};

// Carros que voltaram (re-serviço). Registro rápido na recepção;
// a consulta por período fica no Relatório.
export default function Retornos({ itens, onAdd, onRemove }: Props) {
  const { confirmar, avisar } = useDialog();
  const [placa, setPlaca] = useState("");
  const [carro, setCarro] = useState("");
  const [data, setData] = useState(hojeISO());
  const [descricao, setDescricao] = useState("");

  const registrar = async () => {
    if (!placa.trim() && !carro.trim()) {
      await avisar("Preencha ao menos a placa ou o carro.");
      return;
    }
    onAdd({
      placa: placa.trim(),
      carro: carro.trim(),
      data: data || hojeISO(),
      descricao: descricao.trim(),
    });
    setPlaca("");
    setCarro("");
    setData(hojeISO());
    setDescricao("");
  };

  // Na recepção mostra só os últimos; o histórico completo fica no Relatório.
  const recentes = itens.slice(0, 5);

  return (
    <section className="rounded-xl bg-jura-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title text-lg">Carros que voltaram</h2>
        <Link
          href="/relatorio?aba=retorno"
          className="font-btn flex items-center gap-1.5 rounded-md border border-jura-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
        >
          <IconChart className="h-4 w-4" />
          Consultar
        </Link>
      </div>

      {/* Cadastro */}
      <div className="space-y-2.5">
        <div className="flex min-w-0 flex-wrap gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            className="w-24 shrink-0 rounded-lg border border-jura-border bg-jura-input px-2 py-2 font-mono uppercase outline-none focus:border-jura-red sm:w-32 sm:px-3"
          />
          <input
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            placeholder="Carro (Gol 1.0)"
            className="min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
          />
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            title="Data do retorno (já vem com a data de hoje)"
            className="shrink-0 rounded-lg border border-jura-border bg-jura-input px-2 py-2 font-mono text-sm outline-none focus:border-jura-red"
          />
        </div>

        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="O que aconteceu? (opcional)"
          rows={2}
          className="w-full resize-y rounded-lg border border-jura-border bg-jura-input px-3 py-2 leading-snug outline-none focus:border-jura-red"
        />

        <button
          onClick={registrar}
          className="w-full rounded-lg bg-jura-red px-4 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:w-auto"
        >
          + Registrar retorno
        </button>
      </div>

      {/* Últimos registros */}
      {recentes.length > 0 && (
        <ul className="mt-5 space-y-2">
          {recentes.map((r) => (
            <li
              key={r.id}
              className="flex items-start gap-3 rounded-lg bg-jura-input/60 px-3 py-2"
            >
              <span className="shrink-0 font-mono text-sm font-bold text-jura-red">
                {dataCurta(r.data)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {r.carro || "—"}
                  {r.placa && (
                    <span className="ml-1.5 font-mono text-xs font-normal uppercase text-white/50">
                      {r.placa}
                    </span>
                  )}
                </p>
                {r.descricao && (
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-snug text-jura-muted">
                    {r.descricao}
                  </p>
                )}
              </div>
              <button
                onClick={async () => {
                  if (
                    await confirmar({
                      mensagem: `Remover o retorno de "${r.carro || r.placa}"?`,
                      confirmar: "Remover",
                      tom: "perigo",
                    })
                  )
                    onRemove(r.id);
                }}
                className="shrink-0 rounded border border-jura-border px-1.5 text-xs text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
                title="Remover"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {itens.length > recentes.length && (
        <p className="mt-3 text-xs text-jura-muted">
          Mostrando os {recentes.length} mais recentes de {itens.length}. Veja
          todos em Consultar.
        </p>
      )}
    </section>
  );
}
