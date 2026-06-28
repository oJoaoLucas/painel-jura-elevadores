"use client";

import { useState } from "react";
import type { Aguardando as AguardandoItem } from "@/lib/supabase";
import { montarServico } from "@/lib/constantes";
import ServicoSelector from "@/components/ServicoSelector";
import { useDialog } from "@/components/Dialog";

type Props = {
  itens: AguardandoItem[];
  elevadoresLivres: number[];
  onAdd: (dados: {
    placa: string;
    carro: string;
    servico: string;
    mecanico: string;
  }) => void;
  onRemove: (id: string) => void;
  onMover: (item: AguardandoItem, elevadorId: number) => void;
  onMoverAlinhamento: (item: AguardandoItem) => void;
  // Quando usado como bloco lateral estreito, força layout em 1 coluna.
  vertical?: boolean;
};

export default function Aguardando({
  itens,
  elevadoresLivres,
  onAdd,
  onRemove,
  onMover,
  onMoverAlinhamento,
  vertical = false,
}: Props) {
  const { confirmar, avisar } = useDialog();
  const [placa, setPlaca] = useState("");
  const [carro, setCarro] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [mecanico, setMecanico] = useState("");

  const toggle = (s: string) =>
    setSelecionados((cur) =>
      cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]
    );

  const limpar = () => {
    setPlaca("");
    setCarro("");
    setSelecionados([]);
    setExtra("");
    setMecanico("");
  };

  const handleAdd = async () => {
    if (!carro.trim() && !placa.trim()) {
      await avisar("Preencha ao menos a placa ou o carro.");
      return;
    }
    onAdd({
      placa: placa.trim(),
      carro: carro.trim(),
      servico: montarServico(selecionados, extra),
      mecanico,
    });
    limpar();
  };

  return (
    <section className="h-full min-w-0 rounded-xl bg-jura-panel p-5 shadow-card">
      <h2 className="section-title mb-1 text-lg">Carros aguardando</h2>
      <p className="mb-4 text-sm text-white/40">
        Cadastre quem chegou e depois jogue no elevador livre com um clique.
      </p>

      {/* Formulário de cadastro */}
      <div className={`mb-5 grid gap-3 ${vertical ? "" : "lg:grid-cols-2"}`}>
        <div className="flex min-w-0 gap-2">
          <input
            value={placa}
            onChange={(e) => setPlaca(e.target.value.toUpperCase())}
            placeholder="Placa"
            className="w-28 shrink-0 rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono uppercase outline-none focus:border-jura-red"
          />
          <input
            value={carro}
            onChange={(e) => setCarro(e.target.value)}
            placeholder="Carro (Gol 1.0)"
            className="w-full min-w-0 flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
          />
        </div>
        <div className={vertical ? "" : "lg:row-span-2"}>
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
        <button
          onClick={handleAdd}
          className="h-fit rounded-lg bg-jura-red px-4 py-2.5 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
        >
          + Adicionar à espera
        </button>
      </div>

      {/* Blocos de carros aguardando */}
      {itens.length === 0 ? (
        <p className="text-white/40">Nenhum carro aguardando.</p>
      ) : (
        <div
          className={`grid gap-3 ${
            vertical ? "" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {itens.map((item) => (
            <div
              key={item.id}
              className="flex flex-col rounded-lg bg-jura-card p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold">
                    {item.carro || "—"}
                  </p>
                  {item.placa && (
                    <p className="font-mono text-sm uppercase text-white/60">
                      {item.placa}
                    </p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    if (
                      await confirmar({
                        mensagem: `Remover "${item.carro || item.placa}" da lista de aguardando?`,
                        confirmar: "Remover",
                        tom: "perigo",
                      })
                    )
                      onRemove(item.id);
                  }}
                  className="shrink-0 rounded border border-jura-red px-2 py-0.5 text-sm text-jura-red transition-colors hover:bg-jura-red hover:text-white"
                  title="Remover"
                >
                  ✕
                </button>
              </div>

              {item.servico && (
                <p className="mt-2 whitespace-pre-line text-sm leading-snug text-jura-amber">
                  {item.servico}
                </p>
              )}
              {item.mecanico && (
                <p className="mt-1 text-sm text-white/60">{item.mecanico}</p>
              )}

              {/* Mover para elevador ou direto pro alinhamento */}
              <div className="mt-auto pt-3">
                <div className="flex flex-wrap gap-1.5">
                  {elevadoresLivres.length === 0 ? (
                    <span className="text-xs text-white/40">
                      Nenhum elevador livre
                    </span>
                  ) : (
                    elevadoresLivres.map((id) => (
                      <button
                        key={id}
                        onClick={() => onMover(item, id)}
                        className="rounded-md border border-jura-green px-2.5 py-1 text-sm font-bold text-jura-green transition-colors hover:bg-jura-green hover:text-white"
                      >
                        → Elev {id}
                      </button>
                    ))
                  )}
                  <button
                    onClick={() => onMoverAlinhamento(item)}
                    className="rounded-md border border-jura-blue px-2.5 py-1 text-sm font-bold text-jura-blue transition-colors hover:bg-jura-blue hover:text-white"
                  >
                    → Alinhamento
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
