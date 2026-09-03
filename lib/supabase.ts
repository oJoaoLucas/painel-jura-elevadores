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
  pausado_em: string | null; // cronômetro pausado (almoço/fechado); null = correndo
  previsto_min: number | null; // tempo previsto (min) digitado pela recepção; null = não mostra
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

// Carro que voltou na oficina (re-serviço)
export type Retorno = {
  id: string;
  placa: string | null;
  carro: string | null;
  data: string; // "YYYY-MM-DD"
  descricao: string | null;
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
  volume: number;
  pin: string;
  alerta_horas: number;
  radio_ativa: boolean; // rádio da TV ligada/desligada (controle pela recepção)
  radio_estacao: number; // índice da estação em lib/radio.ts
  radio_volume: number; // volume da rádio (separado do volume dos beeps)
  tv_reload: number; // "sinal" pra TV recarregar (recepção bumpa; TV observa)
};

export const CONFIG_PADRAO: Config = {
  id: 1,
  som_ativo: true,
  volume: 0.3,
  pin: "",
  alerta_horas: 3,
  radio_ativa: false,
  radio_estacao: 0,
  radio_volume: 0.4,
  tv_reload: 0,
};

export type Mecanico = {
  id: string;
  nome: string;
  ordem: number;
  aniversario: string | null; // "YYYY-MM-DD" (comparamos só dia+mês)
  created_at: string;
};

// Correção de palavra do comando por voz: "ouvido" é o que o reconhecimento
// de fala costuma entender errado (ex: "coxinha"), "correto" é o termo de
// oficina de verdade (ex: "coxim").
export type VocabVoz = {
  id: string;
  ouvido: string;
  correto: string;
  created_at: string;
};

// Catálogo de preços de pneus (em blocos)
export type TabelaMedida = {
  id: string;
  medida: string;
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

// Cache de dados de veículo por placa (tela /placa, app/api/placa)
export type VeiculoCache = {
  placa: string;
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  versao: string | null;
  chassi: string | null;
  combustivel: string | null;
  raw: unknown;
  consultado_em: string;
};

// Cache de óleo recomendado por marca+modelo+ano+versão (tela /placa, app/api/oleo)
export type OleoCache = {
  id: string;
  marca: string;
  modelo: string;
  ano: number;
  versao: string;
  cilindrada: string | null;
  combustivel: string | null;
  capacidade_litros: string | null;
  produto_oleo: string | null;
  filtro_oleo: string | null;
  raw: unknown;
  atualizado_em: string;
};
