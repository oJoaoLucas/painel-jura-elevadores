"use client";

import { type Config } from "@/lib/supabase";
import { ESTACOES, estacaoSegura } from "@/lib/radio";

// Controle da rádio da TV pela recepção. A TV reage via realtime. Volume aqui
// é o da MÚSICA (o volume dos beeps fica em Configurações).
export default function RadioControle({
  config,
  onSalvar,
}: {
  config: Config;
  onSalvar: (patch: Partial<Config>) => void;
}) {
  const idx = estacaoSegura(config.radio_estacao);
  const ativa = config.radio_ativa;

  const salvar = onSalvar;

  return (
    <section className="rounded-xl bg-jura-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="section-title text-lg">Rádio da TV</h2>
        <button
          onClick={() => salvar({ radio_ativa: !ativa })}
          className="rounded-md px-4 py-1.5 text-sm font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: ativa ? "#2ea043" : "#6b7280" }}
        >
          {ativa ? "● No ar" : "Desligada"}
        </button>
      </div>

      {/* Estações */}
      <div className="flex flex-wrap gap-2">
        {ESTACOES.map((e, i) => {
          const sel = i === idx;
          return (
            <button
              key={e.url}
              onClick={() =>
                salvar({ radio_estacao: i, radio_ativa: true })
              }
              className="rounded-full border px-3 py-1.5 text-sm font-semibold uppercase tracking-wide transition-colors"
              style={{
                borderColor: sel ? "#C8102E" : "#353c46",
                backgroundColor: sel ? "#C8102E" : "transparent",
                color: sel ? "#fff" : "rgba(255,255,255,0.72)",
              }}
            >
              {e.nome}
            </button>
          );
        })}
      </div>

      {/* Volume da música */}
      <div className="mt-5">
        <label className="mb-2 block font-semibold">
          Volume da música: {Math.round((config.radio_volume ?? 0.4) * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.radio_volume ?? 0.4}
          onChange={(e) => salvar({ radio_volume: Number(e.target.value) })}
          className="w-full accent-jura-red"
        />
        <p className="mt-2 text-sm text-jura-muted">
          O beep abaixa a música sozinho por 1 segundo pra o aviso ser ouvido. O
          volume dos beeps fica em Configurações.
        </p>
      </div>
    </section>
  );
}
