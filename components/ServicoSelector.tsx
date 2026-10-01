"use client";

import { SERVICOS_PADRAO } from "@/lib/constantes";
import { useMecanicos } from "@/components/MecanicosProvider";
import IconeJura, { type NomeIcone } from "@/components/IconeJura";

// Ícone da marca pra cada serviço padrão
const ICONE_SERVICO: Record<string, NomeIcone> = {
  Alinhamento: "alinhamento",
  Balanceamento: "balanceamento",
  Rodízio: "pneu",
  "Troca de óleo": "oleo",
  "Suspensão": "suspensao",
  Freios: "freio",
};

// Caixas de seleção de serviço + campo livre + mecânico.
// Estado é controlado pelo componente pai.
export default function ServicoSelector({
  selecionados,
  extra,
  mecanico,
  onToggle,
  onExtra,
  onMecanico,
  compacto = false,
  emLinha = false,
}: {
  selecionados: string[];
  extra: string;
  mecanico: string;
  onToggle: (servico: string) => void;
  onExtra: (valor: string) => void;
  onMecanico: (valor: string) => void;
  compacto?: boolean;
  // Mecânico na mesma linha dos serviços e observação com 1 linha (card largo)
  emLinha?: boolean;
}) {
  const MECANICOS = useMecanicos();

  const seletorMecanico = (
    <select
      value={mecanico}
      onChange={(e) => onMecanico(e.target.value)}
      className={`rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red ${
        emLinha ? "w-full sm:ml-auto sm:w-64" : "w-full"
      }`}
    >
      <option value="">Mecânico responsável…</option>
      {MECANICOS.map((m) => (
        <option key={m} value={m}>
          {m}
        </option>
      ))}
    </select>
  );

  return (
    <div className={compacto ? "space-y-2" : "space-y-3"}>
      {/* Serviços padrão (+ mecânico ao lado, se emLinha) */}
      <div className={`flex flex-wrap gap-2 ${emLinha ? "items-center" : ""}`}>
        {SERVICOS_PADRAO.map((s) => {
          const ativo = selecionados.includes(s);
          const icone = ICONE_SERVICO[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              aria-pressed={ativo}
              className={`font-btn flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                ativo
                  ? "border-jura-red bg-jura-red text-white"
                  : "border-jura-border bg-jura-input text-white/80 hover:border-jura-red/60"
              }`}
            >
              {icone && (
                <IconeJura
                  nome={icone}
                  className="h-4 w-4"
                  tom={ativo ? "white" : "muted"}
                />
              )}
              {s}
            </button>
          );
        })}
        {emLinha && seletorMecanico}
      </div>

      {/* Texto livre */}
      <textarea
        value={extra}
        onChange={(e) => onExtra(e.target.value)}
        placeholder="Outros serviços / observações (Enter pula linha)"
        rows={compacto ? 2 : 3}
        className="w-full resize-y rounded-lg border border-jura-border bg-jura-input px-3 py-2 leading-snug outline-none focus:border-jura-red"
      />

      {!emLinha && seletorMecanico}
    </div>
  );
}
