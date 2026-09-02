"use client";

import { useEffect, useRef, useState } from "react";
import { useMecanicos } from "@/components/MecanicosProvider";
import { useVocabularioVoz, corrigirTexto } from "@/components/VocabularioProvider";
import { IconMic, IconCheck, IconAlert } from "@/components/Icon";
import type { Elevador } from "@/lib/supabase";
import {
  interpretar,
  descrever,
  type Comando,
} from "@/lib/voz-comando";

type Props = {
  elevadores: Elevador[];
  elevadoresLivres: number[];
  onExecutar: (c: Comando) => void | Promise<void>;
};

// Suporte a voz varia por navegador: Chrome no Android tem; Chrome/Safari no
// iPhone normalmente NÃO expõem a API. Nesse caso o campo continua servindo:
// a pessoa usa o microfone do próprio teclado do celular (ditado do sistema).
function pegarSpeech(): any {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export default function ComandoVoz({
  elevadores,
  elevadoresLivres,
  onExecutar,
}: Props) {
  const mecanicos = useMecanicos();
  const vocabVoz = useVocabularioVoz();
  const [texto, setTexto] = useState("");
  const [ouvindo, setOuvindo] = useState(false);
  const [pensando, setPensando] = useState(false);
  const [comando, setComando] = useState<Comando | null>(null);
  const [fonte, setFonte] = useState<"ia" | "local" | null>(null);
  const [correcao, setCorrecao] = useState("");
  const [erro, setErro] = useState("");
  const [temVoz, setTemVoz] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    setTemVoz(!!pegarSpeech());
  }, []);

  // ------------------------------------------------------------ microfone
  const ouvir = () => {
    const SR = pegarSpeech();
    if (!SR) return;
    if (ouvindo) {
      recRef.current?.stop();
      return;
    }
    setErro("");
    setComando(null);
    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setOuvindo(true);
    rec.onerror = (e: any) => {
      setOuvindo(false);
      setErro(
        e?.error === "not-allowed"
          ? "O navegador bloqueou o microfone. Libere o acesso e tente de novo."
          : "Não consegui ouvir. Tente de novo ou digite."
      );
    };
    rec.onend = () => setOuvindo(false);
    rec.onresult = (e: any) => {
      let falado = "";
      for (let i = 0; i < e.results.length; i++) falado += e.results[i][0].transcript;
      setTexto(falado.trim());
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      setOuvindo(false);
    }
  };

  // ---------------------------------------------------------- interpretar
  const analisar = async () => {
    const bruto = texto.trim();
    if (!bruto) return;
    // Corrige palavras que o reconhecimento de voz costuma entender errado
    // (ex: "coxinha" -> "coxim", cadastrado em /configuracoes) ANTES de
    // interpretar — vale tanto pro caminho local quanto pra IA.
    const t = corrigirTexto(bruto, vocabVoz);
    setCorrecao(t !== bruto ? t : "");
    setPensando(true);
    setErro("");
    const { comando, fonte } = await interpretar(t, mecanicos);
    setPensando(false);
    setFonte(fonte);
    if (comando.acao === "nada") {
      setErro(comando.motivo);
      setComando(null);
      return;
    }
    setComando(comando);
  };

  const confirmar = async () => {
    if (!comando) return;
    await onExecutar(comando);
    setComando(null);
    setTexto("");
    setErro("");
    setFonte(null);
    setCorrecao("");
  };

  const limpar = () => {
    setComando(null);
    setTexto("");
    setErro("");
    setFonte(null);
    setCorrecao("");
  };

  // Atualiza um campo do comando em edição, sem perder o tipo da ação
  const editar = (patch: Record<string, unknown>) =>
    setComando((c) => (c ? ({ ...c, ...patch } as Comando) : c));

  // Mesma regra do executarComando (app/admin/page.tsx): se o elevador já
  // está ocupado e o carro/placa bate (ou não foi repetido), isso vai
  // ACRESCENTAR ao serviço existente, não substituir. Só pra mostrar o aviso
  // certo na confirmação — quem decide de verdade é a execução.
  const atualizacao =
    comando?.acao === "ocupar"
      ? (() => {
          const atual = elevadores.find((e) => e.id === comando.elevador);
          const ocupado = !!(
            atual &&
            atual.status !== "livre" &&
            (atual.carro || atual.placa)
          );
          const carroBate =
            !comando.placa && !comando.carro
              ? true
              : (!comando.carro ||
                  !atual?.carro ||
                  atual.carro.trim().toLowerCase() ===
                    comando.carro.trim().toLowerCase()) &&
                (!comando.placa ||
                  !atual?.placa ||
                  atual.placa.trim().toUpperCase() ===
                    comando.placa.trim().toUpperCase());
          return ocupado && carroBate ? atual : null;
        })()
      : null;

  const inputCls =
    "w-full rounded-lg border border-jura-border bg-jura-input px-3 py-2.5 text-base outline-none focus:border-jura-red";

  return (
    <section className="rounded-xl border border-jura-border bg-jura-card p-3 shadow-card sm:p-4">
      <div className="mb-2.5 flex items-center gap-2">
        <IconMic className="h-5 w-5 shrink-0 text-jura-red" />
        <h2 className="font-display text-lg font-extrabold uppercase tracking-wider sm:text-xl">
          Comando por voz
        </h2>
      </div>

      {/* Campo + microfone: empilha no celular, lado a lado no desktop */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              analisar();
            }
          }}
          rows={2}
          placeholder={
            temVoz
              ? "Toque no microfone e fale, ou digite aqui"
              : "Use o microfone do teclado do celular pra ditar aqui"
          }
          // text-base (16px) evita o zoom automático do iPhone ao focar
          className={`${inputCls} min-h-[64px] resize-none sm:flex-1`}
        />

        <div className="flex gap-2 sm:flex-col">
          {temVoz && (
            <button
              onClick={ouvir}
              aria-label={ouvindo ? "Parar de ouvir" : "Falar comando"}
              className={`flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg px-4 text-base font-bold uppercase tracking-wide text-white transition-opacity sm:w-32 sm:flex-none ${
                ouvindo ? "bg-jura-red pulsa-alerta" : "bg-jura-red hover:opacity-90"
              }`}
            >
              <IconMic className="h-5 w-5" />
              {ouvindo ? "Ouvindo" : "Falar"}
            </button>
          )}
          <button
            onClick={analisar}
            disabled={!texto.trim() || pensando}
            className="min-h-[52px] flex-1 rounded-lg border border-jura-green px-4 text-base font-bold uppercase tracking-wide text-jura-green transition-colors hover:bg-jura-green hover:text-white disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-jura-green sm:w-32 sm:flex-none"
          >
            {pensando ? "..." : "Entender"}
          </button>
        </div>
      </div>

      {!temVoz && (
        <p className="mt-2 text-sm text-jura-muted">
          Este navegador não libera o microfone. Toque no campo acima e use o
          botão de microfone do teclado do celular — funciona igual.
        </p>
      )}

      {erro && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-jura-amber">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {erro}
        </p>
      )}

      {/* -------------------- confirmação do que entendeu -------------------- */}
      {comando && comando.acao !== "nada" && (
        <div className="mt-3 rounded-lg border-2 border-jura-green bg-jura-panel p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-display text-base font-extrabold uppercase tracking-wide text-jura-green sm:text-lg">
              {descrever(comando)}
            </p>
            {fonte === "local" && (
              <span
                className="shrink-0 rounded-md bg-jura-amber/20 px-2 py-0.5 text-xs font-bold uppercase text-jura-amber"
                title="A IA não respondeu (sem internet, sem crédito, ou chave não configurada). Confira os campos com mais atenção."
              >
                Modo local
              </span>
            )}
          </div>

          {correcao && (
            <p className="mb-3 text-sm text-jura-muted">
              Corrigi pra: <span className="text-jura-ink">&quot;{correcao}&quot;</span>
            </p>
          )}

          {atualizacao && (
            <p className="mb-3 rounded-md bg-jura-blue/15 px-2.5 py-2 text-sm text-jura-ink">
              Isso vai <strong>ACRESCENTAR</strong> ao que o Elevador{" "}
              {comando.acao === "ocupar" ? comando.elevador : ""} já tem
              {atualizacao.carro ? ` (${atualizacao.carro}` : ""}
              {atualizacao.carro && atualizacao.placa
                ? `, ${atualizacao.placa})`
                : atualizacao.carro
                  ? ")"
                  : atualizacao.placa
                    ? ` (${atualizacao.placa})`
                    : ""}
              {atualizacao.servico ? (
                <>
                  {" — já tem: "}
                  <span className="text-jura-muted">
                    {atualizacao.servico.split("\n").filter(Boolean).join(" · ")}
                  </span>
                </>
              ) : (
                ""
              )}
              . Não vai apagar nada, só somar o que está no campo abaixo.
            </p>
          )}

          <div className="space-y-2.5">
            {/* Elevador (só quando é ocupar) */}
            {comando.acao === "ocupar" && (
              <label className="block">
                <span className="mb-1 block text-sm text-jura-muted">Elevador</span>
                <select
                  value={comando.elevador}
                  onChange={(e) => editar({ elevador: Number(e.target.value) })}
                  className={inputCls}
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      Elevador {n}
                      {elevadoresLivres.includes(n) ? " (livre)" : " (ocupado)"}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Placa + carro */}
            {(comando.acao === "ocupar" ||
              comando.acao === "aguardando" ||
              comando.acao === "fila") && (
              <div className="grid gap-2.5 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <label className="block">
                  <span className="mb-1 block text-sm text-jura-muted">Carro</span>
                  <input
                    value={comando.carro}
                    onChange={(e) => editar({ carro: e.target.value })}
                    placeholder="Gol 1.0"
                    className={inputCls}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-jura-muted">
                    Placa (opcional)
                  </span>
                  <input
                    value={comando.placa}
                    onChange={(e) =>
                      editar({ placa: e.target.value.toUpperCase() })
                    }
                    placeholder="—"
                    className={`${inputCls} font-mono uppercase`}
                  />
                </label>
              </div>
            )}

            {/* Serviço + mecânico */}
            {(comando.acao === "ocupar" || comando.acao === "aguardando") && (
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-jura-muted">
                    {atualizacao
                      ? "Vai acrescentar (um por linha)"
                      : "Serviço (um por linha)"}
                  </span>
                  <textarea
                    value={comando.servico}
                    onChange={(e) => editar({ servico: e.target.value })}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-jura-muted">Mecânico</span>
                  <select
                    value={comando.mecanico}
                    onChange={(e) => editar({ mecanico: e.target.value })}
                    className={inputCls}
                  >
                    <option value="">Sem mecânico</option>
                    {mecanicos.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Tempo previsto (só faz sentido no elevador) */}
            {comando.acao === "ocupar" && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-jura-muted">Tempo previsto</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={
                    comando.previsto_min
                      ? Math.floor(comando.previsto_min / 60) || ""
                      : ""
                  }
                  onChange={(e) =>
                    editar({
                      previsto_min:
                        (parseInt(e.target.value, 10) || 0) * 60 +
                          (comando.previsto_min ?? 0) % 60 || null,
                    })
                  }
                  placeholder="0"
                  className={`${inputCls} w-16 text-center font-mono`}
                />
                <span className="text-sm text-jura-muted">h</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  inputMode="numeric"
                  value={
                    comando.previsto_min ? comando.previsto_min % 60 || "" : ""
                  }
                  onChange={(e) =>
                    editar({
                      previsto_min:
                        Math.floor((comando.previsto_min ?? 0) / 60) * 60 +
                          (parseInt(e.target.value, 10) || 0) || null,
                    })
                  }
                  placeholder="0"
                  className={`${inputCls} w-16 text-center font-mono`}
                />
                <span className="text-sm text-jura-muted">min (opcional)</span>
              </div>
            )}

            {/* Lembrete */}
            {comando.acao === "lembrete" && (
              <>
                <label className="block">
                  <span className="mb-1 block text-sm text-jura-muted">Recado</span>
                  <textarea
                    value={comando.texto}
                    onChange={(e) => editar({ texto: e.target.value })}
                    rows={2}
                    className={`${inputCls} resize-none`}
                  />
                </label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm text-jura-muted">
                      Pra quem
                    </span>
                    <select
                      value={comando.destinatario}
                      onChange={(e) => editar({ destinatario: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">Todos</option>
                      {mecanicos.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm text-jura-muted">
                      Prioridade
                    </span>
                    <select
                      value={comando.prioridade}
                      onChange={(e) => editar({ prioridade: e.target.value })}
                      className={inputCls}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgente">Urgente</option>
                    </select>
                  </label>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={confirmar}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-lg bg-jura-green px-4 text-base font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90"
            >
              <IconCheck className="h-5 w-5" />
              Confirmar
            </button>
            <button
              onClick={limpar}
              className="min-h-[52px] rounded-lg border border-jura-border px-4 text-base font-bold uppercase tracking-wide text-jura-muted transition-colors hover:border-jura-red hover:text-jura-ink"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
