"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, type Ouvidoria, type OuvidoriaTipo } from "@/lib/supabase";
import { senhaRecepcao } from "@/lib/auth";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";

// Caixa das mensagens que os mecânicos mandam em jura-ouvidoria.vercel.app.
// A chave anon não lê a tabela: tudo passa pelas RPCs ouvidoria_*, que
// conferem a senha. Essa senha é a mesma da recepção (decisão do dono).

const TIPOS: { id: OuvidoriaTipo; rotulo: string; cor: string }[] = [
  { id: "sugestao", rotulo: "Sugestão", cor: "#FFC400" },
  { id: "reclamacao", rotulo: "Reclamação", cor: "#C8102E" },
  { id: "elogio", rotulo: "Elogio", cor: "#2ea043" },
];

const fmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

type Filtro = "nao_lidas" | "todas" | OuvidoriaTipo;

export default function ReclamacoesPage() {
  return (
    <AuthGate>
      <main className="gestao px-4 pb-12 sm:px-6">
        <NavMenu titulo="Reclamações" />
        <Caixa />
      </main>
    </AuthGate>
  );
}

function Caixa() {
  const { confirmar } = useDialog();
  const [lista, setLista] = useState<Ouvidoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>("nao_lidas");

  // silencioso = atualização automática: sem "Atualizando..." e sem trocar
  // a lista por erro se a internet piscar.
  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    const { data, error } = await supabase.rpc("ouvidoria_listar", { p_senha: senhaRecepcao() });
    if (!silencioso) setCarregando(false);
    if (error) {
      if (!silencioso) {
        setErro(
          error.message.includes("senha")
            ? "A senha da caixa no banco não bate com a senha do painel."
            : "Não deu pra carregar. Confere a internet e tenta de novo."
        );
      }
      return;
    }
    setErro(null);
    setLista((data ?? []) as Ouvidoria[]);
  }, []);

  // Carrega ao abrir, a cada 20s e quando volta pra aba.
  // (Realtime não serve: a chave pública não tem permissão de leitura.)
  useEffect(() => {
    carregar();
    const buscar = () => carregar(true);
    const t = setInterval(buscar, 20_000);
    document.addEventListener("visibilitychange", buscar);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", buscar);
    };
  }, [carregar]);

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: lista.length, nao_lidas: 0 };
    for (const m of lista) {
      if (!m.lida) c.nao_lidas++;
      c[m.tipo] = (c[m.tipo] ?? 0) + 1;
    }
    return c;
  }, [lista]);

  // Não lidas no título da aba
  useEffect(() => {
    const antes = document.title;
    const n = contagem.nao_lidas;
    document.title = `${n ? `(${n}) ` : ""}Reclamações — Jura`;
    return () => {
      document.title = antes;
    };
  }, [contagem.nao_lidas]);

  async function marcar(m: Ouvidoria) {
    setLista((l) => l.map((x) => (x.id === m.id ? { ...x, lida: !m.lida } : x)));
    const { error } = await supabase.rpc("ouvidoria_marcar", {
      p_senha: senhaRecepcao(),
      p_id: m.id,
      p_lida: !m.lida,
    });
    if (error) carregar();
  }

  async function apagar(m: Ouvidoria) {
    const ok = await confirmar({
      titulo: "Apagar mensagem",
      mensagem: "A mensagem some de vez e não dá pra recuperar.",
      confirmar: "Apagar",
      tom: "perigo",
    });
    if (!ok) return;
    setLista((l) => l.filter((x) => x.id !== m.id));
    const { error } = await supabase.rpc("ouvidoria_apagar", { p_senha: senhaRecepcao(), p_id: m.id });
    if (error) carregar();
  }

  const FILTROS: { id: Filtro; rotulo: string }[] = [
    { id: "nao_lidas", rotulo: "Não lidas" },
    { id: "todas", rotulo: "Todas" },
    ...TIPOS.map((t) => ({ id: t.id as Filtro, rotulo: t.rotulo })),
  ];

  const visiveis = lista.filter((m) =>
    filtro === "todas" ? true : filtro === "nao_lidas" ? !m.lida : m.tipo === filtro
  );

  return (
    <section className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">
        <nav className="-mx-4 flex flex-1 gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTROS.map((f) => {
            const ativo = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className={`font-btn shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  ativo
                    ? "border-jura-red bg-jura-red text-white"
                    : "border-jura-border bg-jura-input text-jura-muted hover:border-jura-line"
                }`}
              >
                {f.rotulo} <span className="opacity-70">{contagem[f.id] ?? 0}</span>
              </button>
            );
          })}
        </nav>
        <button
          onClick={() => carregar()}
          className="font-btn rounded-md border border-jura-border px-3 py-1.5 text-sm font-semibold text-white/75 hover:border-jura-line hover:text-white"
        >
          {carregando ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      <p className="mt-3 text-sm text-jura-muted">
        Atualiza sozinho a cada 20 segundos. Mecânicos enviam em{" "}
        <span className="font-mono text-jura-ink">jura-ouvidoria.vercel.app</span>
      </p>

      {erro && (
        <p role="alert" className="mt-4 rounded-lg border border-jura-red/50 bg-jura-red/10 px-4 py-3 text-sm">
          {erro}
        </p>
      )}

      <ul className="mt-5 space-y-3">
        {!carregando && !erro && visiveis.length === 0 && (
          <li className="rounded-xl border border-dashed border-jura-border p-8 text-center text-jura-muted">
            {filtro === "nao_lidas" ? "Nada novo por aqui." : "Nenhuma mensagem."}
          </li>
        )}
        {visiveis.map((m) => {
          const t = TIPOS.find((x) => x.id === m.tipo)!;
          return (
            <li
              key={m.id}
              className={`rounded-xl border bg-jura-card p-4 shadow-card sm:p-5 ${
                m.lida ? "border-jura-border opacity-70" : "border-jura-line"
              }`}
              style={{ borderLeft: `4px solid ${t.cor}` }}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-display text-base font-bold uppercase tracking-wider" style={{ color: t.cor }}>
                  {t.rotulo}
                </span>
                {m.assunto && (
                  <span className="rounded-full bg-jura-panel px-2.5 py-0.5 text-xs text-jura-muted">{m.assunto}</span>
                )}
                {!m.lida && <span className="rounded-full bg-jura-red px-2 py-0.5 text-xs font-bold text-white">Nova</span>}
                <span className="ml-auto font-mono text-xs text-jura-muted">{fmt.format(new Date(m.created_at))}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words leading-relaxed text-jura-ink">{m.mensagem}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-jura-border pt-3">
                <span className="text-sm text-jura-muted">
                  {m.nome ? (
                    <>
                      Assinado: <strong className="text-jura-ink">{m.nome}</strong>
                    </>
                  ) : (
                    "Anônimo"
                  )}
                </span>
                <div className="ml-auto flex gap-2">
                  <button
                    onClick={() => apagar(m)}
                    className="font-btn rounded-md border border-jura-border px-3 py-1.5 text-sm font-semibold text-jura-muted hover:border-jura-red hover:text-jura-red"
                  >
                    Apagar
                  </button>
                  <button
                    onClick={() => marcar(m)}
                    className="font-btn rounded-md border border-jura-border bg-jura-panel px-3 py-1.5 text-sm font-semibold text-white/85 hover:border-jura-line hover:text-white"
                  >
                    {m.lida ? "Marcar como nova" : "Marcar como lida"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
