// Quais serviços entram na soma da mão de obra. É o seed da tabela
// mo_servicos_regra; depois quem manda é o banco (decisões "Entra"/"Não entra").

export const CODIGO_MANUAL = 0;

export type StatusRegra = "incluido" | "excluido" | "pendente";
export type Regra = { codigo: number; nome: string; status: StatusRegra };

export const REGRAS_INICIAIS: Regra[] = [
  { codigo: 1, nome: "MAO DE OBRA", status: "incluido" },
  { codigo: 7, nome: "LIMPEZA E REGULAGEM FREIO TRASEIRO", status: "incluido" },
  { codigo: 9, nome: "REGULAREM FREIO DE MÃO", status: "incluido" },
  { codigo: 10, nome: "MANUTENÇÃO PASTILHA DE FREIO", status: "incluido" },
  { codigo: 11, nome: "SANGRIA DE FREIO", status: "incluido" },
  { codigo: 23, nome: "REGULAGEM FREIO", status: "incluido" },
  { codigo: 35, nome: "LIMPEZA E REGULAGEM PINÇA DE FREIO", status: "incluido" },
  { codigo: 42, nome: "MÃO DE OBRA TRASEIRA", status: "incluido" },
  { codigo: 43, nome: "MANUTENÇÃO SAPATA DE FREIO", status: "incluido" },
  { codigo: 52, nome: "MAO DE OBRA FREIOS", status: "incluido" },
  { codigo: 54, nome: "MAO DE OBRA AMORTECEDORES", status: "incluido" },
  { codigo: 66, nome: "MÃO DE OBRA COXIM", status: "incluido" },
  { codigo: 67, nome: "MÃO DE OBRA DIANTEIRA", status: "incluido" },
  { codigo: 68, nome: "MÃO DE OBRA COIFA", status: "incluido" },
  { codigo: 75, nome: "MÃO DE OBRA LONGARINA", status: "incluido" },
  { codigo: 77, nome: "DESENTUPIMENTO DE FREIO", status: "incluido" },
  { codigo: 2, nome: "ALINHAMENTO", status: "excluido" },
  { codigo: 3, nome: "BALANCEAMENTO", status: "excluido" },
  { codigo: 4, nome: "ALINHAMENTO E BALANCEAMENTO", status: "excluido" },
  { codigo: 5, nome: "CAMBAGEM DIANTEIRA", status: "excluido" },
  { codigo: 6, nome: "MONTAGEM DE PNEUS", status: "excluido" },
  { codigo: 12, nome: "CONSERTO PNEU", status: "excluido" },
  { codigo: 16, nome: "INVERTER PNEU", status: "excluido" },
  { codigo: 17, nome: "RODIZIO PNEUS", status: "excluido" },
  { codigo: 21, nome: "TROCA DE OLEO E FILTROS", status: "excluido" },
  { codigo: 28, nome: "FAZER ROSCA", status: "excluido" },
  { codigo: 40, nome: "MANUTENÇÃO RODAS", status: "excluido" },
  { codigo: 47, nome: "DESMONTAGEM DE PNEU", status: "excluido" },
  { codigo: 8, nome: "CAMBAGEM TRASEIRA", status: "pendente" },
  { codigo: 34, nome: "PASSAR MACHO ROSCA", status: "pendente" },
  { codigo: 49, nome: "AVALIAÇÃO TÉCNICA", status: "pendente" },
  { codigo: 76, nome: "NÃO FEZ SERVIÇO", status: "pendente" },
  // semana lançada à mão (sem PDF): só o total por técnico
  { codigo: CODIGO_MANUAL, nome: "LANÇADO À MÃO (SEM DETALHE)", status: "incluido" },
];
