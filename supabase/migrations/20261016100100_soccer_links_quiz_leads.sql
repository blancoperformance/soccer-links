-- Links Soccer Games: contatos deixados no fim do quiz (para o WhatsApp / Huggy).
-- Visitantes só enviam; só admins leem, alteram ou apagam. Aceite obrigatório (LGPD).
-- Pode rodar mais de uma vez.

create table if not exists public.leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,15}$'),
  email text check (email is null or (char_length(email) <= 160 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  answers jsonb not null default '{}'::jsonb check (pg_column_size(answers) < 2000),
  result text check (char_length(result) <= 160),
  source text check (char_length(source) <= 100),
  consent boolean not null check (consent),
  status text not null default 'novo' check (status in ('novo', 'em-contato', 'cliente', 'descartado'))
);

create index if not exists leads_created_at_idx on public.leads (created_at desc);
alter table public.leads enable row level security;

drop policy if exists "leads_insert_public" on public.leads;
create policy "leads_insert_public" on public.leads
  for insert to anon, authenticated
  with check (status = 'novo' and created_at > now() - interval '5 minutes' and created_at < now() + interval '5 minutes');

drop policy if exists "leads_read_admin" on public.leads;
create policy "leads_read_admin" on public.leads for select to authenticated using (public.is_admin());
drop policy if exists "leads_update_admin" on public.leads;
create policy "leads_update_admin" on public.leads for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "leads_delete_admin" on public.leads;
create policy "leads_delete_admin" on public.leads for delete to authenticated using (public.is_admin());

-- Antispam: um envio por WhatsApp a cada 12 h e no máximo 60 envios em 10 minutos no total.
create or replace function public.leads_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.leads where whatsapp = new.whatsapp and created_at > now() - interval '12 hours') then
    raise exception 'duplicate submission' using errcode = '23505';
  end if;
  if (select count(*) from public.leads where created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'too many submissions' using errcode = '54000';
  end if;
  return new;
end;
$$;
drop trigger if exists leads_rate_limit on public.leads;
create trigger leads_rate_limit before insert on public.leads for each row execute function public.leads_rate_limit();
revoke all on function public.leads_rate_limit() from public, anon, authenticated;

grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;
