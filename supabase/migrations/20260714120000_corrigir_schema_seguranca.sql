-- ============================================================
--  Jura Painel — Migração incremental: schema + segurança
--  SEGURA e INCREMENTAL. Não apaga dados, não usa DROP TABLE.
--  Pode rodar em banco que já tem parte da estrutura.
--  Rode no Supabase: Dashboard > SQL Editor > New query.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Colunas que o código usa e podem faltar
-- ------------------------------------------------------------
alter table elevadores add column if not exists previsto_min int;
alter table config     add column if not exists radio_ativa   boolean default false;
alter table config     add column if not exists radio_estacao int default 0;
alter table config     add column if not exists radio_volume  numeric default 0.4;
alter table config     add column if not exists tv_reload     bigint default 0;
alter table mecanicos  add column if not exists aniversario   date;

-- ------------------------------------------------------------
-- 2. Tabelas de preços (criadas fora do schema original)
-- ------------------------------------------------------------
create table if not exists tabela_medidas (
  id uuid primary key default gen_random_uuid(),
  medida text not null default 'Nova medida',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tabela_modelos (
  id uuid primary key default gen_random_uuid(),
  medida_id uuid not null,
  modelo text not null default '',
  valor  text not null default '',
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

-- FK medida->modelos com CASCADE (apagar a medida apaga os modelos dela).
-- Idempotente: recria só se não existir.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tabela_modelos_medida_fk'
  ) then
    alter table tabela_modelos
      add constraint tabela_modelos_medida_fk
      foreign key (medida_id) references tabela_medidas(id) on delete cascade;
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. Constraints de valores válidos (drop+add = idempotente)
-- ------------------------------------------------------------
alter table elevadores drop constraint if exists chk_elevador_status;
alter table elevadores add  constraint chk_elevador_status
  check (status in ('livre','ocupado','aguardando','pronto'));

alter table elevadores drop constraint if exists chk_previsto_min;
alter table elevadores add  constraint chk_previsto_min
  check (previsto_min is null or previsto_min > 0);

alter table lembretes drop constraint if exists chk_lembrete_prioridade;
alter table lembretes add  constraint chk_lembrete_prioridade
  check (prioridade in ('normal','urgente'));

alter table config drop constraint if exists chk_volume;
alter table config add  constraint chk_volume
  check (volume >= 0 and volume <= 1);

alter table config drop constraint if exists chk_radio_volume;
alter table config add  constraint chk_radio_volume
  check (radio_volume >= 0 and radio_volume <= 1);

alter table config drop constraint if exists chk_alerta_horas;
alter table config add  constraint chk_alerta_horas
  check (alerta_horas >= 1 and alerta_horas <= 24);

alter table config drop constraint if exists chk_radio_estacao;
alter table config add  constraint chk_radio_estacao
  check (radio_estacao >= 0);

alter table fila_alinhamento drop constraint if exists chk_fila_ordem;
alter table fila_alinhamento add  constraint chk_fila_ordem check (ordem >= 0);

alter table tabela_medidas drop constraint if exists chk_medida_ordem;
alter table tabela_medidas add  constraint chk_medida_ordem check (ordem >= 0);

alter table tabela_modelos drop constraint if exists chk_modelo_ordem;
alter table tabela_modelos add  constraint chk_modelo_ordem check (ordem >= 0);

-- ------------------------------------------------------------
-- 4. Índices
-- ------------------------------------------------------------
create index if not exists historico_saida_idx    on historico (saida desc);
create index if not exists fila_ordem_idx          on fila_alinhamento (ordem);
create index if not exists modelos_medida_idx      on tabela_modelos (medida_id);
create index if not exists medidas_ordem_idx       on tabela_medidas (ordem);

-- ------------------------------------------------------------
-- 5. Funções ATÔMICAS (cada função = 1 transação: tudo ou nada)
--    Chamadas SÓ pelo servidor (service_role) via supabase.rpc().
-- ------------------------------------------------------------
create or replace function liberar_elevador(p_elevador_id int)
returns void language plpgsql as $$
declare e record; v_pausa interval; v_entrada timestamptz;
begin
  select * into e from elevadores where id = p_elevador_id for update;
  if not found then raise exception 'Elevador % nao existe', p_elevador_id; end if;
  if e.carro is not null or e.placa is not null then
    v_pausa := case when e.pausado_em is not null then now() - e.pausado_em else interval '0' end;
    v_entrada := case when e.ocupado_em is not null then e.ocupado_em + greatest(v_pausa, interval '0') else e.ocupado_em end;
    insert into historico(elevador_id, placa, carro, servico, mecanico, entrada, saida)
      values (p_elevador_id, e.placa, e.carro, e.servico, e.mecanico, v_entrada, now());
  end if;
  update elevadores set status='livre', placa=null, carro=null, servico=null,
    mecanico=null, ocupado_em=null, pausado_em=null, previsto_min=null, updated_at=now()
  where id = p_elevador_id;
end $$;

create or replace function mover_para_alinhamento(p_elevador_id int)
returns void language plpgsql as $$
declare e record; v_ordem int;
begin
  select * into e from elevadores where id = p_elevador_id for update;
  if not found then raise exception 'Elevador % nao existe', p_elevador_id; end if;
  if e.carro is not null or e.placa is not null then
    select coalesce(max(ordem),0)+1 into v_ordem from fila_alinhamento;
    insert into fila_alinhamento(placa, carro, ordem)
      values (coalesce(e.placa,'—'), coalesce(e.carro,'—'), v_ordem);
  end if;
  perform liberar_elevador(p_elevador_id);
end $$;

create or replace function voltar_para_aguardando(p_elevador_id int)
returns void language plpgsql as $$
declare e record;
begin
  select * into e from elevadores where id = p_elevador_id for update;
  if not found then raise exception 'Elevador % nao existe', p_elevador_id; end if;
  if e.carro is not null or e.placa is not null then
    insert into aguardando(placa, carro, servico, mecanico)
      values (e.placa, e.carro, e.servico, e.mecanico);
  end if;
  update elevadores set status='livre', placa=null, carro=null, servico=null,
    mecanico=null, ocupado_em=null, pausado_em=null, previsto_min=null, updated_at=now()
  where id = p_elevador_id;
end $$;

create or replace function aguardando_para_elevador(p_aguardando_id uuid, p_elevador_id int)
returns void language plpgsql as $$
declare a record; el record;
begin
  select * into a  from aguardando where id = p_aguardando_id for update;
  if not found then raise exception 'Carro nao esta mais aguardando'; end if;
  select * into el from elevadores where id = p_elevador_id for update;
  if not found then raise exception 'Elevador % nao existe', p_elevador_id; end if;
  if el.status <> 'livre' then raise exception 'Elevador % ja esta ocupado', p_elevador_id; end if;
  update elevadores set status='ocupado', placa=a.placa, carro=a.carro,
    servico=a.servico, mecanico=a.mecanico, ocupado_em=now(), pausado_em=null,
    previsto_min=null, updated_at=now()
  where id = p_elevador_id;
  delete from aguardando where id = p_aguardando_id;
end $$;

create or replace function aguardando_para_alinhamento(p_aguardando_id uuid)
returns void language plpgsql as $$
declare a record; v_ordem int;
begin
  select * into a from aguardando where id = p_aguardando_id for update;
  if not found then raise exception 'Carro nao esta mais aguardando'; end if;
  select coalesce(max(ordem),0)+1 into v_ordem from fila_alinhamento;
  insert into fila_alinhamento(placa, carro, ordem)
    values (coalesce(a.placa,'—'), coalesce(a.carro,'—'), v_ordem);
  delete from aguardando where id = p_aguardando_id;
end $$;

create or replace function fila_adicionar(p_placa text, p_carro text)
returns void language plpgsql as $$
declare v_ordem int;
begin
  select coalesce(max(ordem),0)+1 into v_ordem from fila_alinhamento;
  insert into fila_alinhamento(placa, carro, ordem)
    values (coalesce(nullif(p_placa,''),'—'), coalesce(nullif(p_carro,''),'—'), v_ordem);
end $$;

create or replace function fila_trocar_ordem(p_a uuid, p_b uuid)
returns void language plpgsql as $$
declare oa int; ob int;
begin
  select ordem into oa from fila_alinhamento where id = p_a for update;
  select ordem into ob from fila_alinhamento where id = p_b for update;
  if oa is null or ob is null then raise exception 'Item da fila nao encontrado'; end if;
  update fila_alinhamento set ordem = ob where id = p_a;
  update fila_alinhamento set ordem = oa where id = p_b;
end $$;

-- Só o servidor (service_role) pode executar as funções — anon NÃO.
do $$
declare f text;
begin
  for f in select unnest(array[
    'liberar_elevador(int)',
    'mover_para_alinhamento(int)',
    'voltar_para_aguardando(int)',
    'aguardando_para_elevador(uuid,int)',
    'aguardando_para_alinhamento(uuid)',
    'fila_adicionar(text,text)',
    'fila_trocar_ordem(uuid,uuid)'
  ]) loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 6. RLS — FECHA o banco. anon = só SELECT do que a TV precisa.
--    Nenhuma escrita por anon (tudo passa pelo servidor/service_role,
--    que ignora RLS). Tabelas fora da TV: sem acesso anon nenhum.
-- ------------------------------------------------------------
alter table elevadores       enable row level security;
alter table fila_alinhamento enable row level security;
alter table lembretes        enable row level security;
alter table aguardando       enable row level security;
alter table config           enable row level security;
alter table mecanicos        enable row level security;
alter table historico        enable row level security;
alter table tabela_medidas   enable row level security;
alter table tabela_modelos   enable row level security;

-- Remove TODAS as políticas antigas (inclusive as que davam escrita a anon).
do $$
declare p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('elevadores','fila_alinhamento','lembretes','aguardando',
                        'config','mecanicos','historico','tabela_medidas','tabela_modelos')
  loop
    execute format('drop policy if exists %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- SELECT anônimo SÓ nas tabelas que a TV mostra.
create policy anon_select_elevadores on elevadores       for select to anon using (true);
create policy anon_select_fila       on fila_alinhamento for select to anon using (true);
create policy anon_select_lembretes  on lembretes        for select to anon using (true);
create policy anon_select_aguardando on aguardando       for select to anon using (true);
create policy anon_select_config     on config           for select to anon using (true);
create policy anon_select_mecanicos  on mecanicos        for select to anon using (true);
-- historico, tabela_medidas, tabela_modelos: SEM política anon = sem acesso.

-- ------------------------------------------------------------
-- 7. Realtime — publica só o que a TV/recepção escutam.
--    historico NÃO precisa (ninguém escuta). Guardado contra erro
--    de "já está na publicação".
-- ------------------------------------------------------------
do $$
declare t text;
begin
  -- remove historico da publicação, se estiver
  if exists (select 1 from pg_publication_tables
             where pubname='supabase_realtime' and tablename='historico') then
    execute 'alter publication supabase_realtime drop table historico';
  end if;
  -- adiciona as necessárias, se ainda não estiverem
  for t in select unnest(array['elevadores','fila_alinhamento','lembretes',
                               'aguardando','config','mecanicos']) loop
    if not exists (select 1 from pg_publication_tables
                   where pubname='supabase_realtime' and tablename=t) then
      execute format('alter publication supabase_realtime add table %I', t);
    end if;
  end loop;
end $$;

commit;
