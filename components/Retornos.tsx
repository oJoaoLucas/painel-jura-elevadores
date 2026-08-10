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

type Props = {
  itens: Retorno[];
  onAdd: (dados: {
    placa: string;
    carro: string;
    data: string;
    descricao: string;
  }) => void;
};

// Carros que voltaram (re-serviço). Registro rápido na recepção + contador do
// mês; a lista completa e a exclusão ficam no Relatório.
export default function Retornos({ itens, onAdd }: Props) {
  const { avisar } = useDialog();
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

  // Contador do mês corrente (ex.: "julho": 3)
  const agora = new Date();
  const mesNome = agora.toLocaleDateString("pt-BR", { month: "long" });
  const prefixoMes = `${agora.getFullYear()}-${String(
    agora.getMonth() + 1
  ).padStart(2, "0")}`;
  const totalMes = itens.filter((r) => r.data.startsWith(prefixoMes)).length;

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
      <div className="space-y-2">
        <div className="flex min-w-0 gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            className="w-24 shrink-0 rounded-lg border border-jura-border bg-jura-input px-2 py-2 font-mono uppercase outline-none focus:border-jura-red"
          />
          <input
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            placeholder="Carro (Gol 1.0)"
            className="min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
          />
        </div>

        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="O que aconteceu? (opcional)"
          rows={2}
          className="w-full resize-y rounded-lg border border-jura-border bg-jura-input px-3 py-2 leading-snug outline-none focus:border-jura-red"
        />

        <div className="flex min-w-0 gap-2">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            title="Data do retorno (já vem com a data de hoje)"
            className="min-w-0 shrink rounded-lg border border-jura-border bg-jura-input px-2 py-2 font-mono text-sm outline-none focus:border-jura-red"
          />
          <button
            onClick={registrar}
            className="min-w-0 flex-1 truncate rounded-lg bg-jura-red px-3 py-2 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          >
            + Registrar
          </button>
        </div>
      </div>

      {/* Total do mês corrente */}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-lg bg-jura-input/60 px-3 py-2">
        <span className="min-w-0 truncate text-sm text-jura-muted">
          Voltaram em <span className="capitalize">{mesNome}</span>
        </span>
        <span className="shrink-0 font-mono text-xl font-black tabular-nums text-jura-ink">
          {totalMes}
        </span>
      </div>
    </section>
  );
}
