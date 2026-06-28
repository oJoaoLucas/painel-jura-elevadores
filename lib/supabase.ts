import { createClient } from "@supabase/supabase-js";

// Limpa o valor da env var: remove BOM e zero-width, aspas nas pontas e espacos.
// (Um .env salvo com BOM grudou um caractere invisivel na chave e quebrou todas
//  as chamadas em producao — isso evita que volte a acontecer.)
function limparEnv(v?: string): string {
  return (v ?? "").replace(/[\uFEFF\u200B]/g, "")
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

const supabaseUrl = limparEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
const supabaseAnonKey = limparEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  // Aviso em dev caso o .env.local não esteja configurado
  // eslint-disable-next-line no-console
  console.warn(
    "[Jura Painel] Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes. Configure o .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ----- Tipos das tabelas -----

export type ElevadorStatus = "livre" | "ocupado" | "aguardando" | "pronto";

export type Elevador = {
  id: number;
  status: ElevadorStatus;
  placa: string | null;
  carro: string | null;
  servico: string | null;
  mecanico: string | null;
  ocupado_em: string | null;
  updated_at: string;
};

export type FilaItem = {
  id: string;
  placa: string;
  carro: string;
  ordem: number;
  created_at: string;
};

export type Lembrete = {
  id: string;
  texto: string;
  destinatario: string | null;
  prioridade: "normal" | "urgente";
  created_at: string;
};

export type Aguardando = {
  id: string;
  placa: string | null;
  carro: string | null;
  servico: string | null;
  mecanico: string | null;
  created_at: string;
};

export type Historico = {
  id: string;
  elevador_id: number | null;
  placa: string | null;
  carro: string | null;
  servico: string | null;
  mecanico: string | null;
  entrada: string | null;
  saida: string | null;
};

export type Config = {
  id: number;
  som_ativo: boolean;
  voz_ativa: boolean;
  volume: number;
  pin: string;
  alerta_horas: number;
};

export const CONFIG_PADRAO: Config = {
  id: 1,
  som_ativo: true,
  voz_ativa: true,
  volume: 0.3,
  pin: "",
  alerta_horas: 3,
};

export type Mecanico = {
  id: string;
  nome: string;
  ordem: number;
  created_at: string;
};

// Catálogo de preços de pneus (em blocos)
export type TabelaMedida = {
  id: string;
  medida: string;
  obs: string;
  ordem: number;
  created_at: string;
};

export type TabelaModelo = {
  id: string;
  medida_id: string;
  modelo: string;
  valor: string;
  ordem: number;
  created_at: string;
};
