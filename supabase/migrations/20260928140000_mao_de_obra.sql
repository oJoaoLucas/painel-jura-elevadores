-- Relatório semanal de MÃO DE OBRA (PDF "Relação de Comissões - Analítico" do SisMaster).
-- Tabelas fechadas para a chave pública: RLS ligada e SEM policy. Só o servidor do
-- painel (chave de serviço, depois de conferir a senha da recepção) lê e grava.
-- Totais NÃO ficam gravados: são calculados das linhas + regra atual.

create table if not exists public.mo_servicos_regra (
  codigo int primary key,
  nome text not null,
  status text not null default 'pendente' check (status in ('incluido', 'excluido', 'pendente')),
  updated_at timestamptz not null default now()
);

create table if not exists public.mo_relatorios (
  id uuid primary key default gen_random_uuid(),
  periodo_inicio date not null,
  periodo_fim date not null,
  mes_referencia date not null check (extract(day from mes_referencia) = 1),
  origem text not null default 'pdf' check (origem in ('pdf', 'manual')),
  texto_pdf text,                    -- texto extraído do PDF (para reprocessar); null no lançamento à mão
  nome_arquivo text,
  criado_em timestamptz not null default now(),
  unique (periodo_inicio, periodo_fim)
);
create index if not exists mo_relatorios_mes on public.mo_relatorios (mes_referencia, periodo_inicio);

create table if not exists public.mo_relatorio_linhas (
  id bigint generated always as identity primary key,
  relatorio_id uuid not null references public.mo_relatorios (id) on delete cascade,
  numero_venda int,
  codigo_servico int not null,
  nome_servico text not null,
  tecnico text not null,
  valor_centavos int not null
);
create index if not exists mo_linhas_relatorio on public.mo_relatorio_linhas (relatorio_id);

alter table public.mo_servicos_regra enable row level security;
alter table public.mo_relatorios enable row level security;
alter table public.mo_relatorio_linhas enable row level security;
revoke all on public.mo_servicos_regra, public.mo_relatorios, public.mo_relatorio_linhas from anon, authenticated;

-- Seed das regras (igual a lib/mao-de-obra/regras.ts)
insert into public.mo_servicos_regra (codigo, nome, status) values
  (1, 'MAO DE OBRA', 'incluido'),
  (7, 'LIMPEZA E REGULAGEM FREIO TRASEIRO', 'incluido'),
  (9, 'REGULAREM FREIO DE MÃO', 'incluido'),
  (10, 'MANUTENÇÃO PASTILHA DE FREIO', 'incluido'),
  (11, 'SANGRIA DE FREIO', 'incluido'),
  (23, 'REGULAGEM FREIO', 'incluido'),
  (35, 'LIMPEZA E REGULAGEM PINÇA DE FREIO', 'incluido'),
  (42, 'MÃO DE OBRA TRASEIRA', 'incluido'),
  (43, 'MANUTENÇÃO SAPATA DE FREIO', 'incluido'),
  (52, 'MAO DE OBRA FREIOS', 'incluido'),
  (54, 'MAO DE OBRA AMORTECEDORES', 'incluido'),
  (66, 'MÃO DE OBRA COXIM', 'incluido'),
  (67, 'MÃO DE OBRA DIANTEIRA', 'incluido'),
  (68, 'MÃO DE OBRA COIFA', 'incluido'),
  (75, 'MÃO DE OBRA LONGARINA', 'incluido'),
  (77, 'DESENTUPIMENTO DE FREIO', 'incluido'),
  (2, 'ALINHAMENTO', 'excluido'),
  (3, 'BALANCEAMENTO', 'excluido'),
  (4, 'ALINHAMENTO E BALANCEAMENTO', 'excluido'),
  (5, 'CAMBAGEM DIANTEIRA', 'excluido'),
  (6, 'MONTAGEM DE PNEUS', 'excluido'),
  (12, 'CONSERTO PNEU', 'excluido'),
  (16, 'INVERTER PNEU', 'excluido'),
  (17, 'RODIZIO PNEUS', 'excluido'),
  (21, 'TROCA DE OLEO E FILTROS', 'excluido'),
  (28, 'FAZER ROSCA', 'excluido'),
  (40, 'MANUTENÇÃO RODAS', 'excluido'),
  (47, 'DESMONTAGEM DE PNEU', 'excluido'),
  (8, 'CAMBAGEM TRASEIRA', 'pendente'),
  (34, 'PASSAR MACHO ROSCA', 'pendente'),
  (49, 'AVALIAÇÃO TÉCNICA', 'pendente'),
  (76, 'NÃO FEZ SERVIÇO', 'pendente'),
  -- semana lançada à mão (sem PDF): só total por técnico, sem detalhe de serviço
  (0, 'LANÇADO À MÃO (SEM DETALHE)', 'incluido')
on conflict (codigo) do nothing;
