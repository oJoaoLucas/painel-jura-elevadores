"use client";

import { useMemo, useState } from "react";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { IconCheck } from "@/components/Icon";
import IconeJura from "@/components/IconeJura";

// ---- Tabela de taxas do cartão (não existe 11x) ----
const TAXAS: Record<number, number> = {
  1: 0.04,
  2: 0.05,
  3: 0.055,
  4: 0.065,
  5: 0.07,
  6: 0.075,
  7: 0.085,
  8: 0.09,
  9: 0.1,
  10: 0.11,
  12: 0.12,
};
const PARCELAS_OPCOES = Object.keys(TAXAS)
  .map(Number)
  .sort((a, b) => a - b);

// Arredonda pra cima até terminar em ,90 (ex: 77,66 -> 77,90 ; 77,95 -> 78,90)
function arredondarPara90(valor: number): number {
  const base = Math.floor(valor + 1e-9);
  const candidato = base + 0.9;
  return candidato >= valor - 1e-9 ? candidato : base + 1.9;
}

// Formata número como moeda brasileira sem o "R$" (ex: 1234.9 -> "1.234,90")
function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte texto digitado ("1.234,56" ou "1234.56" ou "1234,56") em número
function parseValor(texto: string): number {
  const limpo = texto
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

type Opcao = { id: number; modelo: string; valor: string };

let proximoId = 2;

export default function OrcamentoPage() {
  const [medida, setMedida] = useState("");
  const [qtdPneus, setQtdPneus] = useState(4);
  const [parcelas, setParcelas] = useState(10);
  const [opcoes, setOpcoes] = useState<Opcao[]>([
    { id: 1, modelo: "", valor: "" },
  ]);
  const [copiado, setCopiado] = useState(false);
  // Bicos novos entram por padrão; desmarque quando não for trocar.
  const [bicos, setBicos] = useState(true);

  const taxa = TAXAS[parcelas] ?? 0;

  const adicionar = () =>
    setOpcoes((cur) => [...cur, { id: proximoId++, modelo: "", valor: "" }]);

  const remover = (id: number) =>
    setOpcoes((cur) => cur.filter((o) => o.id !== id));

  const atualizar = (id: number, campo: "modelo" | "valor", v: string) =>
    setOpcoes((cur) =>
      cur.map((o) => (o.id === id ? { ...o, [campo]: v } : o))
    );

  // Opções válidas (modelo preenchido + valor > 0)
  const opcoesValidas = useMemo(
    () =>
      opcoes
        .map((o) => ({ ...o, valorNum: parseValor(o.valor) }))
        .filter((o) => o.modelo.trim() && o.valorNum > 0),
    [opcoes]
  );

  const podeGerar = medida.trim().length > 0 && opcoesValidas.length > 0;

  const texto = useMemo(() => {
    if (!podeGerar) return "";
    const linhas: string[] = [];
    linhas.push(
      `Valores referentes a ${qtdPneus} ${
        qtdPneus === 1 ? "pneu" : "pneus"
      } ${medida.trim()}. Já incluso:`
    );
    linhas.push("✅ Alinhamento");
    linhas.push("✅ Balanceamento");
    if (bicos) linhas.push("✅ Bicos novos");
    linhas.push("");
    opcoesValidas.forEach((o) => {
      const parcela = arredondarPara90((o.valorNum * (1 + taxa)) / parcelas);
      linhas.push(o.modelo.trim());
      linhas.push(`À vista: R$ ${fmt(o.valorNum)}`);
      linhas.push(`Ou até ${parcelas}x de R$ ${fmt(parcela)}`);
      linhas.push("");
    });
    linhas.push(
      "Obs.: valor para pneus montados na loja e à base de troca e preço à vista válido para Pix, débito ou dinheiro."
    );
    return linhas.join("\n");
  }, [podeGerar, medida, qtdPneus, opcoesValidas, taxa, parcelas, bicos]);

  const copiar = async () => {
    if (!texto) return;
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      // fallback p/ navegadores sem clipboard API
      const ta = document.createElement("textarea");
      ta.value = texto;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <AuthGate>
    <main className="gestao px-4 pb-12 sm:px-6">
      <NavMenu titulo="Orçamento de Pneus" />

      <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
      {/* Campos fixos */}
      <section className="rounded-xl bg-jura-card p-6">
        <h2 className="section-title mb-4 text-lg">Dados do orçamento</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="eyebrow mb-1 block text-sm text-jura-muted">
              Medida do pneu
            </span>
            <input
              value={medida}
              onChange={(e) => setMedida(e.target.value)}
              placeholder="185/65 R15"
              className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block text-sm text-jura-muted">
              Quantidade de pneus
            </span>
            <input
              type="number"
              min={1}
              value={qtdPneus}
              onChange={(e) =>
                setQtdPneus(Math.max(1, Number(e.target.value) || 1))
              }
              className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono outline-none focus:border-jura-red"
            />
          </label>
          <label className="block">
            <span className="eyebrow mb-1 block text-sm text-jura-muted">
              Parcelas no cartão
            </span>
            <select
              value={parcelas}
              onChange={(e) => setParcelas(Number(e.target.value))}
              className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
            >
              {PARCELAS_OPCOES.map((n) => (
                <option key={n} value={n}>
                  {n}x (+{(TAXAS[n] * 100).toLocaleString("pt-BR")}%)
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Itens inclusos no orçamento */}
        <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-lg bg-jura-input/60 px-3 py-2.5">
          <input
            type="checkbox"
            checked={bicos}
            onChange={(e) => setBicos(e.target.checked)}
            className="h-5 w-5 shrink-0 accent-jura-red"
          />
          <span className="min-w-0">
            <span className="block font-semibold">Incluir bicos novos</span>
            <span className="block text-sm text-jura-muted">
              Desmarque quando não for trocar os bicos
            </span>
          </span>
        </label>
      </section>

      {/* Lista de modelos */}
      <section className="rounded-xl bg-jura-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-lg">Modelos de pneu</h2>
          <button
            onClick={adicionar}
            className="eyebrow rounded-md border border-jura-green px-3 py-1.5 text-sm text-jura-green transition-colors hover:bg-jura-green hover:text-white"
          >
            + Adicionar modelo
          </button>
        </div>

        <div className="space-y-4">
        {opcoes.map((o) => {
          const valorNum = parseValor(o.valor);
          const parcela =
            valorNum > 0
              ? arredondarPara90((valorNum * (1 + taxa)) / parcelas)
              : 0;
          return (
            <div
              key={o.id}
              className="rounded-lg bg-jura-input/60 p-4"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="eyebrow mb-1 block text-sm text-jura-muted">
                    Marca / modelo
                  </span>
                  <input
                    value={o.modelo}
                    onChange={(e) => atualizar(o.id, "modelo", e.target.value)}
                    placeholder="Pirelli Cinturato P1"
                    className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block text-sm text-jura-muted">
                    Valor à vista ({qtdPneus} {qtdPneus === 1 ? "pneu" : "pneus"})
                  </span>
                  <input
                    value={o.valor}
                    onChange={(e) => atualizar(o.id, "valor", e.target.value)}
                    inputMode="decimal"
                    placeholder="2400,00"
                    className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono outline-none focus:border-jura-red"
                  />
                </label>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-sm text-jura-muted">
                  {valorNum > 0 ? (
                    <>
                      {parcelas}x de{" "}
                      <span className="font-bold text-jura-ink">
                        R$ {fmt(parcela)}
                      </span>
                    </>
                  ) : (
                    "Informe o valor à vista"
                  )}
                </span>
                {opcoes.length > 1 && (
                  <button
                    onClick={() => remover(o.id)}
                    className="eyebrow rounded border border-jura-border px-3 py-1 text-sm text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </section>
      </div>

      {/* Prévia + copiar (coluna direita, fixa ao rolar) */}
      <section className="lg:sticky lg:top-24 lg:self-start rounded-xl bg-jura-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2 text-lg">
            <IconeJura nome="whatsapp" className="h-5 w-5" tom="wa" />
            Texto do WhatsApp
          </h2>
          <button
            onClick={copiar}
            disabled={!podeGerar}
            className="rounded-lg bg-jura-red px-4 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {copiado ? (
              <span className="flex items-center gap-2">
                <IconCheck className="h-4 w-4" /> Copiado!
              </span>
            ) : (
              "Copiar texto"
            )}
          </button>
        </div>

        {podeGerar ? (
          <pre className="whitespace-pre-wrap break-words rounded-lg bg-jura-input p-4 font-sans text-sm leading-relaxed text-jura-ink">
            {texto}
          </pre>
        ) : (
          <p className="text-sm text-jura-muted">
            Preencha a <strong>medida</strong> e ao menos um modelo com{" "}
            <strong>marca/modelo</strong> e <strong>valor maior que zero</strong>{" "}
            para gerar o texto.
          </p>
        )}
      </section>
      </div>
    </main>
    </AuthGate>
  );
}
