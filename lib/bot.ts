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
  placa?: string | null;
  sintoma: string | null;
  assunto: string | null;
  faltando: string[];
  motivo_repasse: "completo" | "impaciencia" | "outros" | "insistencia" | "urgente" | "fora_assunto" | "fila";
  fora_horario: boolean;
  criado_em: string;
  respondido_em: string | null;
  estado: EstadoBot;
  pausado_ate: string | null;
  itens: { medida: string | null; quantidade: number | null; tipo: "novo" | "remold" | "meia_vida" | null }[] | null;
  urgente: boolean;
  compareceu: boolean | null;
  nunca_bot: boolean;
};

export type MensagemConversa = {
  id: number;
  autor: "cliente" | "bot" | "humano";
  tipo: "texto" | "audio" | "imagem" | "documento" | "outro";
  conteudo: string | null;
  transcricao: string | null;
  descricao_midia: string | null;
  midia_mime: string | null;
  midia_url: string | null;
  criado_em: string;
};

export type Conversa = {
  cliente: { telefone: string; nome: string | null; estado: EstadoBot; pausado_ate: string | null; nunca_bot: boolean } | null;
  mensagens: MensagemConversa[];
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
  dias_fechados: { data: string; motivo: string }[];
  ignorados: { telefone: string; nome: string | null }[];
  retorno: RetornoBot[];
};

/** Cliente cuja última mensagem foi há 30 dias ou mais (lista de retorno). */
export type RetornoBot = {
  telefone: string;
  nome: string | null;
  ultima_msg: string;
  dias: number;
  /** Pediu algo e o Jurinha anotou (tem pedido não arquivado). */
  anotado: boolean;
  ultimo_pedido: {
    trilho: PedidoBot["trilho"];
    medida: string | null;
    quantidade: number | null;
    servico: string | null;
    assunto: string | null;
    modelo: string | null;
    ano: string | null;
    compareceu: boolean | null;
    criado_em: string;
  } | null;
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

  const acao = async (corpo: Record<string, unknown>) => {
    await chamar("/api/bot", { method: "POST", body: JSON.stringify(corpo) });
    await recarregar();
  };

  const definirAtivo = (valor: boolean) => acao({ acao: "ativo", valor });
  const marcarCompareceu = (id: number, valor: boolean | null) => acao({ acao: "compareceu", id, valor });
  const definirNuncaBot = (telefone: string, valor: boolean) => acao({ acao: "nunca_bot", telefone, valor });
  const salvarDiaFechado = (data: string, motivo: string) => acao({ acao: "fechado_add", data, motivo });
  const removerDiaFechado = (data: string) => acao({ acao: "fechado_del", data });
  const arquivarPedido = (id: number, valor = true) => acao({ acao: "arquivar", id, valor });
  const marcarRetorno = (telefone: string) => acao({ acao: "retorno_feito", telefone });

  return {
    dados, erro, recarregar, retomar, definirAtivo,
    marcarCompareceu, definirNuncaBot, salvarDiaFechado, removerDiaFechado,
    arquivarPedido, marcarRetorno,
  };
}

export function carregarConversa(telefone: string): Promise<Conversa> {
  return chamar<Conversa>(`/api/bot/conversa?tel=${encodeURIComponent(telefone)}`);
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
  const carro = [p.modelo, p.ano, p.placa ? `(${p.placa})` : null].filter(Boolean).join(" ") || null;
  if (p.trilho === "pneu" && p.itens && p.itens.length > 1) {
    const tipo = (t: string | null) => (t === "remold" ? " remold" : t === "meia_vida" ? " meia vida" : "");
    return {
      titulo: `Pneus ${p.itens.map((i) => `${i.quantidade ? `${i.quantidade}x ` : ""}${i.medida ?? "?"}${tipo(i.tipo)}`).join(" + ")}`,
      detalhe: carro,
    };
  }
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
  urgente: "reclamação / garantia",
  fora_assunto: "fora do assunto (bot não respondeu)",
  fila: "quer trazer o carro",
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
