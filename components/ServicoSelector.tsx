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
}: {
  selecionados: string[];
  extra: string;
  mecanico: string;
  onToggle: (servico: string) => void;
  onExtra: (valor: string) => void;
  onMecanico: (valor: string) => void;
  compacto?: boolean;
}) {
  const MECANICOS = useMecanicos();
  return (
    <div className={compacto ? "space-y-2" : "space-y-3"}>
      {/* Serviços padrão */}
      <div className="flex flex-wrap gap-2">
        {SERVICOS_PADRAO.map((s) => {
          const ativo = selecionados.includes(s);
          const icone = ICONE_SERVICO[s];
          return (
            <button
              key={s}
              type="button"
              onClick={() => onToggle(s)}
              className={`font-btn flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold uppercase tracking-wide transition-colors ${
                ativo
                  ? "border-jura-red bg-jura-red text-white"
                  : "border-jura-border bg-jura-input text-white/70 hover:border-jura-red/60"
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
      </div>

      {/* Texto livre */}
      <textarea
        value={extra}
        onChange={(e) => onExtra(e.target.value)}
        placeholder="Outros serviços / observações (Enter pula linha)"
        rows={compacto ? 2 : 3}
        className="w-full resize-y rounded-lg border border-jura-border bg-jura-input px-3 py-2 leading-snug outline-none focus:border-jura-red"
      />

      {/* Mecânico */}
      <select
        value={mecanico}
        onChange={(e) => onMecanico(e.target.value)}
        className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
      >
        <option value="">Mecânico responsável…</option>
        {MECANICOS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  );
}
