"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  CONFIG_PADRAO,
  type Config,
  type Mecanico,
} from "@/lib/supabase";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";
import { IconUser } from "@/components/Icon";

export default function ConfiguracoesPage() {
  const { confirmar, avisar } = useDialog();
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [novo, setNovo] = useState("");

  useEffect(() => {
    supabase
      .from("config")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setConfig(data as Config));
    carregarMecanicos();
  }, []);

  const carregarMecanicos = () =>
    supabase
      .from("mecanicos")
      .select("*")
      .order("ordem")
      .then(({ data }) => data && setMecanicos(data as Mecanico[]));

  const salvar = async (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    await supabase.from("config").update(patch).eq("id", 1);
  };

  const addMecanico = async () => {
    const nome = novo.trim();
    if (!nome) return;
    if (mecanicos.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) {
      await avisar("Esse mecânico já está na lista.");
      return;
    }
    const maxOrdem = mecanicos.reduce((m, x) => Math.max(m, x.ordem), 0);
    setNovo("");
    await supabase.from("mecanicos").insert({ nome, ordem: maxOrdem + 1 });
    carregarMecanicos();
  };

  const renomear = async (id: string, nome: string) => {
    setMecanicos((cur) => cur.map((m) => (m.id === id ? { ...m, nome } : m)));
  };

  const salvarNome = async (id: string, nome: string) => {
    const limpo = nome.trim();
    if (!limpo) {
      carregarMecanicos(); // reverte se ficou vazio
      return;
    }
    await supabase.from("mecanicos").update({ nome: limpo }).eq("id", id);
  };

  const salvarAniversario = async (id: string, valor: string) => {
    setMecanicos((cur) =>
      cur.map((m) => (m.id === id ? { ...m, aniversario: valor || null } : m))
    );
    await supabase
      .from("mecanicos")
      .update({ aniversario: valor || null })
      .eq("id", id);
  };

  const removerMecanico = async (m: Mecanico) => {
    if (
      await confirmar({
        mensagem: `Remover "${m.nome}" da equipe?`,
        confirmar: "Remover",
        tom: "perigo",
      })
    ) {
      await supabase.from("mecanicos").delete().eq("id", m.id);
      carregarMecanicos();
    }
  };

  return (
    <AuthGate>
      <main className="gestao px-4 pb-12 sm:px-6">
        <NavMenu titulo="Configurações" />

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Som */}
          <section className="rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-5 text-lg">Som</h2>

            <div className="space-y-5">
              {/* Som geral */}
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <span>
                  <span className="block font-semibold">Som na TV</span>
                  <span className="text-sm text-jura-muted">
                    Liga/desliga os beeps da TV (elevador, fila, recados)
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={config.som_ativo}
                  onChange={(e) => salvar({ som_ativo: e.target.checked })}
                  className="h-6 w-6 shrink-0 accent-jura-red"
                />
              </label>

              {/* Volume */}
              <div>
                <label className="mb-2 block font-semibold">
                  Volume: {Math.round(config.volume * 100)}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={config.volume}
                  onChange={(e) => salvar({ volume: Number(e.target.value) })}
                  className="w-full accent-jura-red"
                />
              </div>
            </div>
          </section>

          {/* Alertas */}
          <section className="rounded-xl bg-jura-card p-6">
            <h2 className="section-title mb-5 text-lg">Alertas</h2>
            <label className="mb-2 block font-semibold">
              Avisar &quot;carro parado&quot; após
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={24}
                value={config.alerta_horas}
                onChange={(e) =>
                  salvar({ alerta_horas: Math.max(1, Number(e.target.value)) })
                }
                className="w-24 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
              />
              <span className="text-jura-muted">horas no elevador</span>
            </div>
            <p className="mt-2 text-sm text-jura-muted">
              Passando disso, o card do elevador pisca em âmbar na TV.
            </p>
          </section>

          {/* Equipe / mecânicos */}
          <section className="rounded-xl bg-jura-card p-6 lg:col-span-2">
            <h2 className="section-title mb-5 text-lg">Equipe (mecânicos)</h2>

            <div className="mb-5 flex gap-2">
              <input
                value={novo}
                onChange={(e) => setNovo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addMecanico()}
                placeholder="Nome do mecânico"
                className="flex-1 rounded-lg border border-jura-border bg-jura-input px-3 py-2 outline-none focus:border-jura-red"
              />
              <button
                onClick={addMecanico}
                className="rounded-lg bg-jura-red px-4 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
              >
                + Adicionar
              </button>
            </div>

            {mecanicos.length === 0 ? (
              <p className="text-jura-muted">Nenhum mecânico cadastrado.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {mecanicos.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-lg bg-jura-input/60 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <IconUser className="h-4 w-4 shrink-0 text-jura-muted" />
                      <input
                        value={m.nome}
                        onChange={(e) => renomear(m.id, e.target.value)}
                        onBlur={(e) => salvarNome(m.id, e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" &&
                          (e.target as HTMLInputElement).blur()
                        }
                        className="min-w-0 flex-1 bg-transparent font-semibold outline-none focus:text-jura-ink"
                      />
                      <button
                        onClick={() => removerMecanico(m)}
                        className="shrink-0 rounded border border-jura-red px-2 py-0.5 text-sm text-jura-red transition-colors hover:bg-jura-red hover:text-white"
                        title="Remover"
                      >
                        ✕
                      </button>
                    </div>
                    <label className="mt-2 flex items-center gap-2 text-xs text-jura-muted">
                      🎂 Aniversário
                      <input
                        type="date"
                        value={m.aniversario ?? ""}
                        onChange={(e) =>
                          salvarAniversario(m.id, e.target.value)
                        }
                        className="rounded border border-jura-border bg-jura-input px-2 py-1 text-jura-ink outline-none focus:border-jura-red"
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-sm text-jura-muted">
              A equipe aparece nos selects de mecânico (elevadores, aguardando e
              destinatário de lembrete), em tempo real.
            </p>
          </section>
        </div>
      </main>
    </AuthGate>
  );
}
