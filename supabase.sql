-- ============================================================
--  Jura Painel — Schema do Supabase
--  Rode este SQL no Supabase: Dashboard > SQL Editor > New query
-- ============================================================

-- Elevadores (4 fixos, nunca deletar)
create table if not exists elevadores (
  id int primary key,                 -- 1, 2, 3, 4
  status text default 'livre',        -- 'livre' | 'ocupado' | 'aguardando' | 'pronto'
  placa text,
  carro text,
  servico text,
  mecanico text,                      -- mecânico responsável
  ocupado_em timestamptz,             -- quando o carro entrou (tempo no elevador)
  pausado_em timestamptz,             -- cronômetro pausado (almoço/fechado); null = correndo
  updated_at timestamp default now()
);

-- Inserir os 4 elevadores (idempotente)
insert into elevadores (id, status) values
  (1, 'livre'), (2, 'livre'), (3, 'livre'), (4, 'livre')
on conflict (id) do nothing;

-- Fila de alinhamento
create table if not exists fila_alinhamento (
  id uuid default gen_random_uuid() primary key,
  placa text not null,
  carro text not null,
  ordem int not null,
  created_at timestamp default now()
);

-- Lembretes da recepção pros mecânicos
create table if not exists lembretes (
  id uuid default gen_random_uuid() primary key,
  texto text not null,
  destinatario text,                  -- pra quem (opcional)
  prioridade text default 'normal',   -- 'normal' | 'urgente'
  created_at timestamp default now()
);

-- Carros aguardando um elevador (pré-cadastro na recepção)
create table if not exists aguardando (
  id uuid default gen_random_uuid() primary key,
  placa text,
  carro text,
  servico text,
  mecanico text,
  created_at timestamp default now()
);

-- Histórico do dia (preenchido ao liberar um elevador)
create table if not exists historico (
  id uuid default gen_random_uuid() primary key,
  elevador_id int,
  placa text,
  carro text,
  servico text,
  mecanico text,
  entrada timestamptz,
  saida timestamptz default now()
);

-- Config (linha única, id=1): som, voz, volume, PIN e alerta de carro parado
create table if not exists config (
  id int primary key default 1,
  som_ativo boolean default true,
  voz_ativa boolean default true,
  volume numeric default 0.3,
  pin text default '',
  alerta_horas int default 3,
  constraint config_singleton check (id = 1)
);
insert into config (id) values (1) on conflict (id) do nothing;

-- Mecânicos (equipe editável pela tela de Configurações)
create table if not exists mecanicos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
-- Equipe inicial (só se a tabela estiver vazia)
insert into mecanicos (nome, ordem)
select v.nome, v.ord
from (values ('Wagner',1),('Allysson',2),('Fabio',3),('Marcos',4),('Jura',5)) as v(nome, ord)
where not exists (select 1 from mecanicos);

-- Vocabulário de oficina pro comando por voz: correções de palavras que o
-- reconhecimento de fala costuma entender errado (ex: "coxinha" -> "coxim").
-- Cadastrado pela recepção em /configuracoes; aplicado antes de interpretar
-- o comando (lib/voz-comando.ts).
create table if not exists vocabulario_voz (
  id uuid primary key default gen_random_uuid(),
  ouvido text not null,
  correto text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
--  Índices — a tela de Relatório filtra/ordena historico por "saida".
--  Sem índice a consulta faz varredura completa e piora conforme o
--  histórico cresce. (idempotente)
-- ============================================================
create index if not exists historico_saida_idx on historico (saida desc);
create index if not exists fila_ordem_idx on fila_alinhamento (ordem);

-- ============================================================
--  Realtime — adiciona as tabelas à publicação
-- ============================================================
alter publication supabase_realtime add table elevadores;
alter publication supabase_realtime add table fila_alinhamento;
alter publication supabase_realtime add table lembretes;
alter publication supabase_realtime add table aguardando;
alter publication supabase_realtime add table historico;
alter publication supabase_realtime add table config;
alter publication supabase_realtime add table mecanicos;
alter publication supabase_realtime add table vocabulario_voz;

-- ============================================================
--  RLS — "hardening leve" (sem auth de verdade; app usa a anon key).
--  Sem backend, a escrita precisa ser permitida pra anon (é o que o
--  navegador usa). Então travamos só o que é ESTRUTURAL/irreversível:
--   - historico: só SELECT + INSERT (não dá pra apagar/alterar histórico)
--   - elevadores: só SELECT + UPDATE (os 4 são fixos; sem insert/delete)
--   - config: só SELECT + UPDATE (linha única; sem insert/delete)
--  As tabelas dinâmicas (aguardando/fila/lembretes) seguem com as
--  operações que o app usa.
--  OBS: pra travar de verdade, mover as escritas pra um servidor
--  (Route Handler + service_role) e deixar anon só com SELECT.
-- ============================================================
alter table elevadores enable row level security;
alter table fila_alinhamento enable row level security;
alter table lembretes enable row level security;
alter table aguardando enable row level security;
alter table historico enable row level security;
alter table config enable row level security;

-- ELEVADORES (4 fixos): leitura + update de status
create policy elevadores_select on elevadores for select to anon, authenticated using (true);
create policy elevadores_update on elevadores for update to anon, authenticated using (true) with check (true);

-- CONFIG (linha única): leitura + update
create policy config_select on config for select to anon, authenticated using (true);
create policy config_update on config for update to anon, authenticated using (true) with check (true);

-- HISTORICO (append-only): leitura + insert
create policy historico_select on historico for select to anon, authenticated using (true);
create policy historico_insert on historico for insert to anon, authenticated with check (true);

-- AGUARDANDO (dinâmica): leitura + insert + delete
create policy aguardando_select on aguardando for select to anon, authenticated using (true);
create policy aguardando_insert on aguardando for insert to anon, authenticated with check (true);
create policy aguardando_delete on aguardando for delete to anon, authenticated using (true);

-- FILA_ALINHAMENTO (dinâmica): leitura + insert + update (ordem) + delete
create policy fila_select on fila_alinhamento for select to anon, authenticated using (true);
create policy fila_insert on fila_alinhamento for insert to anon, authenticated with check (true);
create policy fila_update on fila_alinhamento for update to anon, authenticated using (true) with check (true);
create policy fila_delete on fila_alinhamento for delete to anon, authenticated using (true);

-- LEMBRETES (dinâmica): leitura + insert + delete
create policy lembretes_select on lembretes for select to anon, authenticated using (true);
create policy lembretes_insert on lembretes for insert to anon, authenticated with check (true);
create policy lembretes_delete on lembretes for delete to anon, authenticated using (true);

-- MECANICOS (editável na tela): leitura + insert + update + delete
alter table mecanicos enable row level security;
create policy mecanicos_select on mecanicos for select to anon, authenticated using (true);
create policy mecanicos_insert on mecanicos for insert to anon, authenticated with check (true);
create policy mecanicos_update on mecanicos for update to anon, authenticated using (true) with check (true);
create policy mecanicos_delete on mecanicos for delete to anon, authenticated using (true);

alter table vocabulario_voz enable row level security;
create policy vocabulario_voz_select on vocabulario_voz for select to anon, authenticated using (true);
create policy vocabulario_voz_insert on vocabulario_voz for insert to anon, authenticated with check (true);
create policy vocabulario_voz_delete on vocabulario_voz for delete to anon, authenticated using (true);

-- ============================================================
--  Limpeza automática dos elevadores às 19h (todo dia)
--  Libera qualquer elevador com carro — mesma lógica do botão "Liberar"
--  (desconta pausa pendente e salva no histórico antes de limpar).
-- ============================================================
create extension if not exists pg_cron;

create or replace function limpar_elevadores_diario()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e record;
  v_pausa_ms bigint;
  v_entrada timestamptz;
begin
  for e in select * from elevadores where carro is not null or placa is not null loop
    v_pausa_ms := case when e.pausado_em is not null
      then greatest(0, (extract(epoch from (now() - e.pausado_em)) * 1000))::bigint
      else 0 end;
    v_entrada := case when e.ocupado_em is not null and v_pausa_ms > 0
      then e.ocupado_em + make_interval(secs => v_pausa_ms / 1000.0)
      else e.ocupado_em end;

    insert into historico (elevador_id, placa, carro, servico, mecanico, entrada, saida)
    values (e.id, e.placa, e.carro, e.servico, e.mecanico, v_entrada, now());

    update elevadores
      set status = 'livre', placa = null, carro = null, servico = null,
          mecanico = null, ocupado_em = null, pausado_em = null,
          previsto_min = null, updated_at = now()
      where id = e.id;
  end loop;
end;
$$;

-- Remove agendamento antigo do mesmo nome, se houver (idempotente)
select cron.unschedule(jobid)
from cron.job
where jobname = 'limpar-elevadores-19h';

-- 19:00 horário de Brasília = 22:00 UTC (Brasil não usa horário de verão)
select cron.schedule(
  'limpar-elevadores-19h',
  '0 22 * * *',
  $$select limpar_elevadores_diario();$$
);
