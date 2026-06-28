"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, type Mecanico } from "@/lib/supabase";

// Lista de nomes de mecânicos vinda do banco (tabela `mecanicos`),
// atualizada em tempo real. Default [] se usada fora do provider (ex: TV).
const Ctx = createContext<string[]>([]);

export function useMecanicos(): string[] {
  return useContext(Ctx);
}

export function MecanicosProvider({ children }: { children: React.ReactNode }) {
  const [nomes, setNomes] = useState<string[]>([]);

  useEffect(() => {
    const carregar = () =>
      supabase
        .from("mecanicos")
        .select("*")
        .order("ordem")
        .then(({ data }) => {
          if (data) setNomes((data as Mecanico[]).map((m) => m.nome));
        });

    carregar();
    const ch = supabase
      .channel("mecanicos-rt")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mecanicos" },
        carregar
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  return <Ctx.Provider value={nomes}>{children}</Ctx.Provider>;
}
