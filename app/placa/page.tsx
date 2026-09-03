"use client";

import { useState } from "react";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { IconCar } from "@/components/Icon";
import type { VeiculoCache, OleoCache } from "@/lib/supabase";

function limparPlaca(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export default function PlacaPage() {
  const [placa, setPlaca] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [veiculo, setVeiculo] = useState<VeiculoCache | null>(null);

  const [carregandoOleo, setCarregandoOleo] = useState(false);
  const [erroOleo, setErroOleo] = useState("");
  const [versoes, setVersoes] = useState<OleoCache[]>([]);
  const [versaoEscolhida, setVersaoEscolhida] = useState<OleoCache | null>(null);

  const reset = () => {
    setErro("");
    setVeiculo(null);
    setErroOleo("");
    setVersoes([]);
    setVersaoEscolhida(null);
  };

  const buscarOleo = async (v: VeiculoCache) => {
    setCarregandoOleo(true);
    setErroOleo("");
    setVersoes([]);
    setVersaoEscolhida(null);
    try {
      const r = await fetch("/api/oleo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca: v.marca, modelo: v.modelo, ano: v.ano }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErroOleo(dados?.erro || "não achamos o óleo desse veículo");
        return;
      }
      const lista: OleoCache[] = dados.versoes || [];
      setVersoes(lista);
      if (lista.length === 1) setVersaoEscolhida(lista[0]);
    } catch {
      setErroOleo("falha ao consultar o óleo");
    } finally {
      setCarregandoOleo(false);
    }
  };

  const buscar = async () => {
    const p = limparPlaca(placa);
    if (p.length !== 7) {
      setErro("Digite a placa completa (7 caracteres)");
      return;
    }
    reset();
    setCarregando(true);
    try {
      const r = await fetch("/api/placa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placa: p }),
      });
      const dados = await r.json();
      if (!r.ok) {
        setErro(dados?.erro || "não achamos essa placa");
        return;
      }
      setVeiculo(dados.veiculo);
      buscarOleo(dados.veiculo);
    } catch {
      setErro("falha ao consultar a placa");
    } finally {
      setCarregando(false);
    }
  };

  const novaConsulta = () => {
    setPlaca("");
    reset();
  };

  return (
    <AuthGate>
      <main className="gestao mx-auto max-w-3xl px-4 pb-12 sm:px-6">
        <NavMenu titulo="Consultar Placa" />

        <section className="rounded-xl bg-jura-card p-6">
          <h2 className="section-title mb-4 text-lg">Placa do veículo</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              buscar();
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={placa}
              onChange={(e) => setPlaca(limparPlaca(e.target.value).slice(0, 7))}
              placeholder="ABC1D23"
              autoFocus
              className="w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2 font-mono text-lg uppercase tracking-widest outline-none focus:border-jura-red sm:max-w-[220px]"
            />
            <button
              type="submit"
              disabled={carregando}
              className="rounded-lg bg-jura-red px-5 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {carregando ? "Buscando..." : "Buscar"}
            </button>
            {veiculo && (
              <button
                type="button"
                onClick={novaConsulta}
                className="eyebrow rounded-lg border border-jura-border px-4 py-2 text-sm text-jura-muted transition-colors hover:text-jura-ink"
              >
                Nova consulta
              </button>
            )}
          </form>
          {erro && <p className="mt-3 text-sm text-jura-red">{erro}</p>}
        </section>

        {veiculo && (
          <section className="mt-6 rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-4 flex items-center gap-2 text-lg">
              <IconCar className="h-5 w-5" />
              Dados do veículo
            </h2>
            <div className="grid gap-4 sm:grid-cols-4">
              <Campo rotulo="Marca" valor={veiculo.marca} />
              <Campo rotulo="Modelo" valor={veiculo.modelo} />
              <Campo rotulo="Ano" valor={veiculo.ano ? String(veiculo.ano) : ""} />
              <Campo rotulo="Chassi" valor={veiculo.chassi} mono />
            </div>
          </section>
        )}

        {veiculo && (
          <section className="mt-6 rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-4 text-lg">Óleo recomendado</h2>

            {carregandoOleo && (
              <p className="text-sm text-jura-muted">Buscando óleo recomendado...</p>
            )}

            {!carregandoOleo && erroOleo && (
              <p className="text-sm text-jura-muted">
                {erroOleo} — confira o manual do veículo.
              </p>
            )}

            {!carregandoOleo && versoes.length > 1 && !versaoEscolhida && (
              <>
                <p className="mb-3 text-sm text-jura-muted">
                  Esse ano tem mais de uma motorização. Qual bate com o carro?
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {versoes.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVersaoEscolhida(v)}
                      className="rounded-lg border border-jura-border bg-jura-input/60 p-4 text-left transition-colors hover:border-jura-red"
                    >
                      <span className="block font-semibold text-jura-ink">{v.versao}</span>
                      <span className="mt-1 block text-sm text-jura-muted">
                        {v.cilindrada} · {v.combustivel}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {versaoEscolhida && (
              <div className="rounded-lg bg-jura-input/60 p-5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-jura-ink">{versaoEscolhida.versao}</span>
                  <span className="text-sm text-jura-muted">
                    {versaoEscolhida.cilindrada} · {versaoEscolhida.combustivel}
                  </span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div>
                    <span className="eyebrow block text-sm text-jura-muted">Capacidade</span>
                    <span className="font-mono text-2xl font-bold text-jura-ink">
                      {versaoEscolhida.capacidade_litros
                        ? `${versaoEscolhida.capacidade_litros} L`
                        : "—"}
                    </span>
                  </div>
                  <Campo rotulo="Produto recomendado" valor={versaoEscolhida.produto_oleo} />
                  <Campo rotulo="Filtro de óleo" valor={versaoEscolhida.filtro_oleo} mono />
                </div>

                {versoes.length > 1 && (
                  <button
                    onClick={() => setVersaoEscolhida(null)}
                    className="eyebrow mt-4 text-sm text-jura-muted underline hover:text-jura-ink"
                  >
                    Escolher outra motorização
                  </button>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </AuthGate>
  );
}

function Campo({
  rotulo,
  valor,
  mono,
}: {
  rotulo: string;
  valor: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="eyebrow block text-sm text-jura-muted">{rotulo}</span>
      <span className={`block text-jura-ink ${mono ? "font-mono text-sm" : "font-semibold"}`}>
        {valor || "—"}
      </span>
    </div>
  );
}
