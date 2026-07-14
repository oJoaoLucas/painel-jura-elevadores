-- ============================================================
--  Jura Painel — Schema COMPLETO para instalação nova
--  Rode no Supabase: Dashboard > SQL Editor > New query.
--  (Para um banco que já existe, use a migração incremental em
--   supabase/migrations/ — este arquivo é a instalação do zero.)
-- ============================================================

-- Elevadores (4 fixos, nunca deletar)
create table if not exists elevadores (
  id int primary key,
  status text default 'livre'
    check (status in ('livre','ocupado','aguardando','pronto')),
  placa text,
  carro text,
  servico text,
  mecanico text,
  ocupado_em timestamptz,
  pausado_em timestamptz,
  previsto_min int check (previsto_min is null or previsto_min > 0),
  updated_at timestamptz default now()
);
insert into elevadores (id, status) values (1,'livre'),(2,'livre'),(3,'livre'),(4,'livre')
on conflict (id) do nothing;

-- Fila de alinhamento
create table if not exists fila_alinhamento (
  id uuid primary key default gen_random_uuid(),
  placa text not null,
  carro text not null,
  ordem int not null check (ordem >= 0),
  created_at timestamptz default now()
);

-- Lembretes da recepção
create table if not exists lembretes (
  id uuid primary key default gen_random_uuid(),
  texto text not null,
  destinatario text,
  prioridade text default 'normal' check (prioridade in ('normal','urgente')),
  created_at timestamptz default now()
);

-- Carros aguardando um elevador
create table if not exists aguardando (
  id uuid primary key default gen_random_uuid(),
  placa text, carro text, servico text, mecanico text,
  created_at timestamptz default now()
);

-- Histórico (append-only; preenchido ao liberar um elevador)
create table if not exists historico (
  id uuid primary key default gen_random_uuid(),
  elevador_id int,
  placa text, carro text, servico text, mecanico text,
  entrada timestamptz,
  saida timestamptz default now()
);

-- Config (linha única, id=1)
create table if not exists config (
  id int primary key default 1,
  som_ativo boolean default true,
  volume numeric default 0.3 check (volume >= 0 and volume <= 1),
  pin text default '',
  alerta_horas int default 3 check (alerta_horas >= 1 and alerta_horas <= 24),
  radio_ativa boolean default false,
  radio_estacao int default 0 check (radio_estacao >= 0),
  radio_volume numeric default 0.4 check (radio_volume >= 0 and radio_volume <= 1),
  tv_reload bigint default 0,
  constraint config_singleton check (id = 1)
);
insert into config (id) values (1) on conflict (id) do nothing;

-- Mecânicos
create table if not exists mecanicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  aniversario date,
  created_at timestamptz not null default now()
);
insert into mecanicos (nome, ordem)
select v.nome, v.ord
from (values ('Wagner',1),('Allysson',2),('Fabio',3),('Marcos',4),('Jura',5)) as v(nome, ord)
where not exists (select 1 from mecanicos);

-- Catálogo de preços de pneus
create table if not exists tabela_medidas (
  id uuid primary key default gen_random_uuid(),
  medida text not null default 'Nova medida',
  ordem int not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now()
);
create table if not exists tabela_modelos (
  id uuid primary key default gen_random_uuid(),
  medida_id uuid not null references tabela_medidas(id) on delete cascade,
  modelo text not null default '',
  valor  text not null default '',
  ordem int not null default 0 check (ordem >= 0),
  created_at timestamptz not null default now()
);

-- Índices
create index if not exists historico_saida_idx on historico (saida desc);
create index if not exists fila_ordem_idx       on fila_alinhamento (ordem);
create index if not exists modelos_medida_idx   on tabela_modelos (medida_id);
create index if not exists medidas_ordem_idx    on tabela_medidas (ordem);

-- ============================================================
--  Funções atômicas + RLS + Realtime + permissões:
--  são idênticas às da migração. Rode também o arquivo
--  supabase/migrations/20260714120000_corrigir_schema_seguranca.sql
--  (as seções 5, 6 e 7 dele) OU copie aquelas seções aqui.
--  Mantê-las num único lugar evita divergência.
-- ============================================================
