"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estaLogado, logout, ouvirAuth, senhaSalva } from "@/lib/auth";

// Jurinha (bot do WhatsApp): dados vêm de /api/bot (servidor), nunca direto do Supabase.

export type EstadoBot = "bot" | "aguardando_atendente" | "humano";

export type PedidoBot = {
  id: number;
  telefone: string;
  nome: string | null;
  trilho: "pneu" | "servico" | "outros";
  medida: string | null;
  quantidade: number | null;
  medida_origem: "digitada" | "foto" | null;
  servico: string | null;
  modelo: string | null;
  ano: string | null;
  sintoma: string | null;
  assunto: string | null;
  faltando: string[];
  motivo_repasse: "completo" | "impaciencia" | "outros" | "insistencia";
  fora_horario: boolean;
  criado_em: string;
  respondido_em: string | null;
  estado: EstadoBot;
  pausado_ate: string | null;
};

export type PausadoBot = {
  telefone: string;
  nome: string | null;
  estado: EstadoBot;
  motivo_pausa: "humano_respondeu" | "iniciada_pela_loja" | "handoff" | "manual" | null;
  pausado_ate: string | null;
  handoff_em: string | null;
  ultima_msg_humano: string | null;
  ultimo_contato: string;
};

export type NumerosBot = {
  total: number;
  pneu: number;
  servico: number;
  respondidos: number;
  sem_resposta: number;
  incompletos: number;
  bloqueios_preco: number;
  por_dia: { dia: string; total: number; pneu: number; servico: number }[];
  top_medidas: { medida: string; pedidos: number; pneus: number | null }[];
  top_servicos: { servico: string; pedidos: number }[];
};

export type DadosBot = {
  pedidos: PedidoBot[];
  pausados: PausadoBot[];
  numeros: NumerosBot;
  config: { bot_ativo: boolean; pausa_dias: number };
};

const INTERVALO_MS = 30_000;

async function chamar<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", "x-jura-senha": senhaSalva(), ...init?.headers },
    cache: "no-store",
  });
  if (res.status === 401) {
    // Sessão antiga (de antes da senha ser guardada) ou senha trocada: pede login de novo.
    logout();
    throw new Error("Entre de novo com a senha da recepção.");
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.erro ?? "Não deu pra carregar o Jurinha.");
  return json as T;
}

/** Carrega os dados do Jurinha e atualiza sozinho a cada 30 s. */
export function useBot(dias = 30) {
  const [dados, setDados] = useState<DadosBot | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const vivo = useRef(true);

  const recarregar = useCallback(async () => {
    // A página monta antes do login (o AuthGate só esconde a tela); sem sessão, não busca.
    if (!estaLogado()) return;
    try {
      const d = await chamar<DadosBot>(`/api/bot?dias=${dias}`);
      if (vivo.current) {
        setDados(d);
        setErro(null);
      }
    } catch (e) {
      if (vivo.current) setErro(e instanceof Error ? e.message : String(e));
    }
  }, [dias]);

  useEffect(() => {
    vivo.current = true;
    recarregar();
    const t = setInterval(recarregar, INTERVALO_MS);
    const aoVoltar = () => document.visibilityState === "visible" && recarregar();
    document.addEventListener("visibilitychange", aoVoltar);
    const pararAuth = ouvirAuth(() => {
      if (estaLogado()) recarregar();
      else setDados(null);
    });
    return () => {
      vivo.current = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", aoVoltar);
      pararAuth();
    };
  }, [recarregar]);

  const retomar = async (telefone: string) => {
    await chamar("/api/bot", { method: "POST", body: JSON.stringify({ acao: "retomar", telefone }) });
    await recarregar();
  };

  const definirAtivo = async (valor: boolean) => {
    await chamar("/api/bot", { method: "POST", body: JSON.stringify({ acao: "ativo", valor }) });
    await recarregar();
  };

  return { dados, erro, recarregar, retomar, definirAtivo };
}

// ----- Formatação -----

/** 5519998804130 → (19) 99880-4130 */
export function formatarTelefone(tel: string): string {
  const d = tel.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+${tel}`;
}

export function linkWhatsApp(tel: string): string {
  return `https://wa.me/${tel.replace(/\D/g, "")}`;
}

/** Linha principal do pedido, no mesmo formato do resumo que o cliente recebe. */
export function resumoPedido(p: PedidoBot): { titulo: string; detalhe: string | null } {
  const carro = [p.modelo, p.ano].filter(Boolean).join(" ") || null;
  if (p.trilho === "pneu") {
    const qtd = p.quantidade ? `${p.quantidade}x ` : "";
    return {
      titulo: `Pneus ${qtd}${p.medida ?? "medida a confirmar"}`,
      detalhe: [carro, p.medida_origem === "foto" ? "medida lida da foto" : null].filter(Boolean).join(" · ") || null,
    };
  }
  if (p.trilho === "servico") {
    return { titulo: p.servico ?? "Serviço a confirmar", detalhe: [carro, p.sintoma].filter(Boolean).join(" · ") || null };
  }
  return { titulo: p.assunto ?? "Atendimento", detalhe: null };
}

export const MOTIVO_REPASSE: Record<PedidoBot["motivo_repasse"], string | null> = {
  completo: null,
  impaciencia: "pediu atendente",
  insistencia: "insistiu no preço",
  outros: "fora da triagem",
};

export function tempoDesde(iso: string, agora = Date.now()): string {
  const min = Math.max(0, Math.round((agora - new Date(iso).getTime()) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`;
  const d = Math.floor(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
