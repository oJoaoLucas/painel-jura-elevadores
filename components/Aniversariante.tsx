"use client";

import { useEffect, useState } from "react";
import { supabase, type Mecanico } from "@/lib/supabase";

// Dia+mês de hoje no formato "MM-DD"
function hojeMMDD(): string {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

// Faixa de "Parabéns" na TV quando é aniversário de alguém da equipe.
// Fora dos aniversários não aparece nada.
export default function Aniversariante() {
  const [nomes, setNomes] = useState<string[]>([]);

  useEffect(() => {
    const checar = async () => {
      const { data } = await supabase
        .from("mecanicos")
        .select("nome, aniversario");
      const hoje = hojeMMDD();
      const aniversariantes = ((data as Mecanico[]) || [])
        .filter((m) => m.aniversario && m.aniversario.slice(5) === hoje)
        .map((m) => m.nome);
      setNomes(aniversariantes);
    };
    checar();
    // revê de hora em hora (cobre a virada do dia sem depender do reload)
    const t = setInterval(checar, 60 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (nomes.length === 0) return null;

  const lista =
    nomes.length === 1
      ? nomes[0]
      : nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];

  return (
    <div
      className="flex shrink-0 items-center justify-center gap-3 rounded-lg px-4 py-2 text-center"
      style={{ backgroundColor: "#FFC400", color: "#1a1200" }}
    >
      <span className="text-2xl" aria-hidden>
        🎂
      </span>
      <span className="font-display text-2xl font-extrabold uppercase tracking-wide">
        Hoje é aniversário {nomes.length > 1 ? "dos" : "do"} {lista} — Parabéns!
      </span>
      <span className="text-2xl" aria-hidden>
        🎉
      </span>
    </div>
  );
}
