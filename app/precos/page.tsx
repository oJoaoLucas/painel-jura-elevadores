"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  type TabelaMedida,
  type TabelaModelo,
} from "@/lib/supabase";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";

export default function PrecosPage() {
  const { confirmar } = useDialog();
  const [medidas, setMedidas] = useState<TabelaMedida[]>([]);
  const [modelos, setModelos] = useState<TabelaModelo[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    recarregar();
  }, []);

  const recarregar = async () => {
    const [me, mo] = await Promise.all([
      supabase.from("tabela_medidas").select("*").order("ordem"),
      supabase.from("tabela_modelos").select("*").order("ordem"),
    ]);
    if (me.data) setMedidas(me.data as TabelaMedida[]);
    if (mo.data) setModelos(mo.data as TabelaModelo[]);
    setCarregando(false);
  };

  // ----- Medidas (blocos) -----
  const addMedida = async () => {
    const maxOrdem = medidas.reduce((m, x) => Math.max(m, x.ordem), 0);
    await supabase
      .from("tabela_medidas")
      .insert({ medida: "Nova medida", ordem: maxOrdem + 1 });
    recarregar();
  };

  const setMedidaLocal = (id: string, campo: "medida" | "obs", v: string) =>
    setMedidas((cur) =>
      cur.map((m) => (m.id === id ? { ...m, [campo]: v } : m))
    );

  const salvarMedida = async (id: string, campo: "medida" | "obs", v: string) =>
    supabase
      .from("tabela_medidas")
      .update({ [campo]: v })
      .eq("id", id);

  const removerMedida = async (m: TabelaMedida) => {
    if (
      await confirmar({
        titulo: `Remover ${m.medida}`,
        mensagem: "Apaga a medida e todos os modelos/valores dela. Confirmar?",
        confirmar: "Remover",
        tom: "perigo",
      })
    ) {
      await supabase.from("tabela_medidas").delete().eq("id", m.id);
      recarregar();
    }
  };

  // ----- Modelos (itens dentro do bloco) -----
  const addModelo = async (medidaId: string) => {
    const dele = modelos.filter((x) => x.medida_id === medidaId);
    const maxOrdem = dele.reduce((m, x) => Math.max(m, x.ordem), 0);
    await supabase
      .from("tabela_modelos")
      .insert({ medida_id: medidaId, ordem: maxOrdem + 1 });
    recarregar();
  };

  const setModeloLocal = (id: string, campo: "modelo" | "valor", v: string) =>
    setModelos((cur) =>
      cur.map((m) => (m.id === id ? { ...m, [campo]: v } : m))
    );

  const salvarModelo = async (id: string, campo: "modelo" | "valor", v: string) =>
    supabase
      .from("tabela_modelos")
      .update({ [campo]: v })
      .eq("id", id);

  const removerModelo = async (id: string) => {
    await supabase.from("tabela_modelos").delete().eq("id", id);
    setModelos((cur) => cur.filter((m) => m.id !== id));
  };

  return (
    <AuthGate>
      <main className="px-4 pb-12 sm:px-6">
        <NavMenu titulo="Preços de Pneus" />

        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm text-jura-muted">
            Cada bloco é uma medida. Edite medida, modelos e valores — salva sozinho.
          </p>
          <button
            onClick={addMedida}
            className="eyebrow rounded-md border border-jura-green px-3 py-1.5 text-sm text-jura-green transition-colors hover:bg-jura-green hover:text-white"
          >
            + Adicionar medida
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {medidas.map((m) => {
            const itens = modelos
              .filter((x) => x.medida_id === m.id)
              .sort((a, b) => a.ordem - b.ordem);
            return (
              <section
                key={m.id}
                className="flex flex-col rounded-xl bg-jura-card p-4"
              >
                {/* Cabeçalho do bloco: medida + remover */}
                <div className="mb-3 flex items-center gap-2">
                  <input
                    value={m.medida}
                    onChange={(e) => setMedidaLocal(m.id, "medida", e.target.value)}
                    onBlur={(e) => salvarMedida(m.id, "medida", e.target.value)}
                    className="min-w-0 flex-1 rounded bg-transparent font-display text-xl font-extrabold uppercase tracking-wide text-jura-ink outline-none focus:bg-jura-input/60 focus:px-2 focus:py-1"
                  />
                  <button
                    onClick={() => removerMedida(m)}
                    className="shrink-0 rounded border border-jura-border px-2 py-0.5 text-sm text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
                    title="Remover medida"
                  >
                    ✕
                  </button>
                </div>

                {/* Modelos + valores */}
                <div className="flex-1 space-y-2">
                  {itens.map((it) => (
                    <div key={it.id} className="flex items-center gap-1.5">
                      <input
                        value={it.modelo}
                        onChange={(e) =>
                          setModeloLocal(it.id, "modelo", e.target.value)
                        }
                        onBlur={(e) =>
                          salvarModelo(it.id, "modelo", e.target.value)
                        }
                        placeholder="Modelo"
                        className="min-w-0 flex-1 rounded-md border border-jura-border bg-jura-input px-2 py-1.5 text-sm outline-none focus:border-jura-red"
                      />
                      <input
                        value={it.valor}
                        onChange={(e) =>
                          setModeloLocal(it.id, "valor", e.target.value)
                        }
                        onBlur={(e) =>
                          salvarModelo(it.id, "valor", e.target.value)
                        }
                        inputMode="decimal"
                        placeholder="R$"
                        className="w-20 shrink-0 rounded-md border border-jura-border bg-jura-input px-2 py-1.5 text-right font-mono text-sm outline-none focus:border-jura-red"
                      />
                      <button
                        onClick={() => removerModelo(it.id)}
                        className="shrink-0 rounded px-1 text-jura-muted transition-colors hover:text-jura-red"
                        title="Remover modelo"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => addModelo(m.id)}
                  className="mt-3 rounded-md border border-dashed border-jura-line py-1.5 text-sm text-jura-muted transition-colors hover:border-jura-green hover:text-jura-green"
                >
                  + modelo
                </button>
              </section>
            );
          })}
        </div>

        {carregando && (
          <p className="text-jura-muted">Carregando preços…</p>
        )}
        {!carregando && medidas.length === 0 && (
          <p className="text-jura-muted">
            Nenhuma medida ainda. Clique em &quot;+ Adicionar medida&quot;.
          </p>
        )}
      </main>
    </AuthGate>
  );
}
