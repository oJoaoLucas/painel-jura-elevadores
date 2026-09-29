-- Limpeza automática às 19h, todo dia (mesma hora dos elevadores):
-- recados (lembretes), lista de espera (aguardando) e fila de alinhamento.
-- A Recepção e a TV esvaziam sozinhas (realtime já escuta essas tabelas).

create extension if not exists pg_cron;

create or replace function limpar_listas_diario()
returns void
language sql
security definer
set search_path = public
as $$
  delete from lembretes;
  delete from aguardando;
  delete from fila_alinhamento;
$$;

revoke all on function limpar_listas_diario() from public, anon, authenticated;

-- Remove agendamento antigo do mesmo nome, se houver (idempotente)
select cron.unschedule(jobid) from cron.job where jobname = 'limpar-listas-19h';

-- 19:00 horário de Brasília = 22:00 UTC (Brasil não usa horário de verão)
select cron.schedule('limpar-listas-19h', '0 22 * * *', $$select limpar_listas_diario();$$);
