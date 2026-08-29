"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, type VocabVoz } from "@/lib/supabase";

// Correções de palavra pro comando por voz (ex: "coxinha" -> "coxim"),
// cadastradas em /configuracoes e atualizadas em tempo real. Default []
// fora do provider.
const Ctx = createContext<VocabVoz[]>([]);

export function useVocabularioVoz(): VocabVoz[] {
  return useContext(Ctx);
}

export function VocabularioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [itens, setItens] = useState<VocabVoz[]>([]);

  useEffect(() => {
    const carregar = () =>
      supabase
        .from("vocabulario_voz")
        .select("*")
        .order("created_at")
        .then(({ data }) => {
          if (data) setItens(data as VocabVoz[]);
        });

    carregar();
    const ch = supabase
      .channel("vocabulario-voz-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vocabulario_voz" },
        carregar
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return <Ctx.Provider value={itens}>{children}</Ctx.Provider>;
}

// Aplica as correções num texto antes de interpretar o comando — troca cada
// palavra "ouvida" pela correta, preservando o resto da frase. Comparação
// por palavra inteira (não troca pedaço de outra palavra) e sem diferenciar
// maiúscula/minúscula.
export function corrigirTexto(texto: string, vocab: VocabVoz[]): string {
  let corrigido = texto;
  for (const v of vocab) {
    const ouvido = v.ouvido.trim();
    const correto = v.correto.trim();
    if (!ouvido || !correto) continue;
    const escapado = ouvido.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    corrigido = corrigido.replace(
      new RegExp(`\\b${escapado}\\b`, "gi"),
      correto
    );
  }
  return corrigido;
}
