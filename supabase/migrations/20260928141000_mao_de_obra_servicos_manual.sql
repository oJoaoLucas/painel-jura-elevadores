-- Semana lançada à mão: além do total por técnico (linhas com código 0), guarda o
-- total por serviço { "codigo": centavos } para a visão por serviço e a do mês.
alter table public.mo_relatorios add column if not exists servicos_manual jsonb;
