"use client";

import { useEffect, useState } from "react";
import { formatarTelefone, linkWhatsApp } from "@/lib/bot";
import { PARCELAS_OPCOES, TAXAS, copiarTexto, fmt, parseValor, textoOrcamento, valorParcela } from "@/lib/orcamento";
import { IconCheck } from "@/components/Icon";

// Orçamento rápido na aba Bot: mesma conta e mesmo texto da tela Orçamento,
// com a medida e a quantidade já puxadas do pedido do Jurinha.

export type AlvoOrcamento = {
  id: number;
  nome: string | null;
  telefone: string;
  medida: string | null;
  quantidade: number | null;
};

type Opcao = { id: number; modelo: string; valor: string };

let proximoId = 1;
const nova = (): Opcao => ({ id: proximoId++, modelo: "", valor: "" });

/** Só a medida, sem "(remold)" e sem as outras medidas do mesmo pedido. */
function medidaDoPedido(m: string | null): string {
  return (m ?? "").split("+")[0].replace(/\(.*?\)/g, "").replace("medida a confirmar", "").trim();
}

export default function MiniOrcamento({ alvo, onLimpar }: { alvo: AlvoOrcamento | null; onLimpar: () => void }) {
  const [medida, setMedida] = useState("");
  const [qtd, setQtd] = useState(4);
  const [parcelas, setParcelas] = useState(10);
  const [bicos, setBicos] = useState(true);
  const [opcoes, setOpcoes] = useState<Opcao[]>([nova()]);
  const [copiado, setCopiado] = useState(false);

  // Pedido escolhido na lista → preenche medida e quantidade
  useEffect(() => {
    if (!alvo) return;
    setMedida(medidaDoPedido(alvo.medida));
    setQtd(alvo.quantidade && alvo.quantidade > 0 ? alvo.quantidade : 4);
  }, [alvo]);

  const atualizar = (id: number, campo: Partial<Opcao>) =>
    setOpcoes((cur) => cur.map((o) => (o.id === id ? { ...o, ...campo } : o)));

  const validas = opcoes
    .map((o) => ({ modelo: o.modelo, valorNum: parseValor(o.valor) }))
    .filter((o) => o.modelo.trim() && o.valorNum > 0);
  const texto =
    medida.trim() && validas.length ? textoOrcamento({ medida, qtdPneus: qtd, parcelas, bicos, opcoes: validas }) : "";

  const limpar = () => {
    setMedida("");
    setQtd(4);
    setOpcoes([nova()]);
    onLimpar();
  };

  const base = "rounded-md border border-jura-border bg-jura-input px-2.5 py-1.5 text-sm outline-none focus:border-jura-red";
  const campo = `w-full ${base}`;

  return (
    <section id="mini-orcamento" className="rounded-xl bg-jura-panel p-5 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title text-lg">Orçamento rápido</h2>
        {(alvo || medida) && (
          <button onClick={limpar} className="text-xs font-semibold text-jura-muted hover:text-jura-red">
            Limpar
          </button>
        )}
      </div>
      {alvo ? (
        <p className="mb-3 text-sm text-jura-muted">
          Para <strong className="text-jura-ink">{alvo.nome || "Cliente"}</strong> ·{" "}
          <span className="font-mono">{formatarTelefone(alvo.telefone)}</span>
        </p>
      ) : (
        <p className="mb-3 text-sm text-jura-muted">Clique em &quot;Orçar&quot; num pedido de pneu, ou preencha aqui.</p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-0.5 block text-[11px] text-jura-muted">Medida</span>
          <input value={medida} onChange={(e) => setMedida(e.target.value)} placeholder="185/65 R15" className={campo} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-jura-muted">Pneus</span>
          <input
            type="number"
            min={1}
            value={qtd}
            onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
            className={`${campo} font-mono`}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-jura-muted">Parcelas</span>
          <select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className={campo}>
            {PARCELAS_OPCOES.map((n) => (
              <option key={n} value={n}>
                {n}x (+{(TAXAS[n] * 100).toLocaleString("pt-BR")}%)
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 flex cursor-pointer items-center gap-2 self-end pb-1.5 text-sm sm:col-span-1">
          <input type="checkbox" checked={bicos} onChange={(e) => setBicos(e.target.checked)} className="h-4 w-4 accent-jura-red" />
          Bicos novos
        </label>
      </div>

      <ul className="mt-3 space-y-1.5">
        {opcoes.map((o) => {
          const v = parseValor(o.valor);
          return (
            <li key={o.id} className="flex items-center gap-2 rounded-md bg-jura-input/60 p-1.5">
              <input
                value={o.modelo}
                onChange={(e) => atualizar(o.id, { modelo: e.target.value })}
                placeholder="Marca / modelo"
                className={`${base} min-w-0 flex-1`}
              />
              <input
                value={o.valor}
                onChange={(e) => atualizar(o.id, { valor: e.target.value })}
                inputMode="decimal"
                placeholder={`À vista (${qtd})`}
                className={`${base} w-28 shrink-0 font-mono`}
              />
              <span className="hidden w-24 shrink-0 text-right font-mono text-[11px] text-jura-muted sm:block">
                {v > 0 ? `${parcelas}x ${fmt(valorParcela(v, parcelas))}` : ""}
              </span>
              <button
                onClick={() => setOpcoes((cur) => (cur.length > 1 ? cur.filter((x) => x.id !== o.id) : [nova()]))}
                aria-label="Remover modelo"
                className="shrink-0 px-1 text-jura-muted hover:text-jura-red"
              >
                ×
              </button>
            </li>
          );
        })}
      </ul>
      <button
        onClick={() => setOpcoes((cur) => [...cur, nova()])}
        className="mt-2 text-xs font-semibold text-jura-green hover:underline"
      >
        + Adicionar modelo
      </button>

      {texto && (
        <pre className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-jura-input p-3 font-sans text-xs leading-relaxed text-jura-ink">
          {texto}
        </pre>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          disabled={!texto}
          onClick={async () => {
            await copiarTexto(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-jura-red px-3 py-1.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-40"
        >
          {copiado ? (
            <>
              <IconCheck className="h-4 w-4" /> Copiado!
            </>
          ) : (
            "Copiar texto"
          )}
        </button>
        {alvo && texto && (
          <a
            href={`${linkWhatsApp(alvo.telefone)}?text=${encodeURIComponent(texto)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-jura-wa/60 px-3 py-1.5 text-sm font-bold text-jura-wa hover:bg-jura-wa/10"
          >
            Mandar no WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
