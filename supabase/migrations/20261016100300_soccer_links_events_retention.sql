-- Links Soccer Games: limpeza das estatísticas antigas (public.events), para a tabela não crescer sem fim.
-- soccer_purge_events(dias) apaga eventos mais antigos que "dias", em lotes. Contatos e cadastros
-- da Black NÃO são tocados. 400 dias (padrão) guarda o ano inteiro e a mesma semana do ano anterior,
-- para comparar uma Black com a outra.
--
-- Só o dono do banco roda (SQL Editor ou pg_cron):
--   select public.soccer_purge_events();      -- guarda os últimos 400 dias
--   select cron.schedule('soccer-purge-events', '30 6 * * *', $$select public.soccer_purge_events(400)$$);
-- Pode rodar mais de uma vez.

create or replace function public.soccer_purge_events(p_keep_days integer default 400)
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  cutoff timestamptz;
  n bigint;
  total bigint := 0;
begin
  if p_keep_days is null or p_keep_days < 31 then
    raise exception 'keep at least 31 days (got %)', p_keep_days using errcode = '22023';
  end if;
  cutoff := now() - make_interval(days => p_keep_days);
  loop
    delete from public.events
    where id in (select id from public.events where created_at < cutoff order by created_at limit 10000);
    get diagnostics n = row_count;
    total := total + n;
    exit when n = 0;
  end loop;
  return total;
end;
$$;

revoke all on function public.soccer_purge_events(integer) from public, anon, authenticated;
