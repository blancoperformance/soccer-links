-- Black 2026 Soccer Games: plano da campanha no painel /admin/black.
--
-- Cria (só coisas novas, não mexe nos cadastros do Grupo VIP):
--   painel_donos       quem é dono do painel (vê e edita tudo e libera os acessos)
--   black_team         equipe da Black: 'editor' (edita) ou 'leitor' (só vê)
--   black_ofertas      calendário de ofertas do Grupo VIP (um jogo por linha)
--   black_config       ajustes da campanha (ex.: desconto do Pix)
--   black_tarefas      quadro do time (arte, vídeo, mensagem...)
--   black_papel()      papel de quem está logado: 'editor', 'leitor' ou null
--   painel_eh_dono(), painel_acessos(), painel_acesso_definir(...)  tela "Equipe e acessos"
--
-- Rode uma vez no Supabase (SQL Editor). Pode rodar de novo sem estragar nada.
-- O dono abaixo é o e-mail com que você entra no painel. Se for outro, troque antes de rodar.

-- ---------------------------------------------------------------- dono e equipe
create table if not exists public.painel_donos (
  email text primary key check (email = lower(email))
);
alter table public.painel_donos enable row level security;
revoke all on public.painel_donos from anon, authenticated;
insert into public.painel_donos (email) values ('blancodesgn@gmail.com') on conflict do nothing;

create or replace function public.painel_eh_dono()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.painel_donos where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create table if not exists public.black_team (
  email text primary key check (email = lower(email)),
  papel text not null default 'leitor' check (papel in ('editor', 'leitor'))
);
alter table public.black_team enable row level security;
revoke all on public.black_team from anon, authenticated;

-- Dono conta como editor.
create or replace function public.black_papel()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.painel_eh_dono() then 'editor'
    else (select t.papel from public.black_team t where t.email = lower(coalesce(auth.jwt() ->> 'email', '')))
  end;
$$;

-- ---------------------------------------------------------------- toque de auditoria
create or replace function public.black_touch()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := coalesce(auth.jwt() ->> 'email', new.atualizado_por);
  return new;
end
$$;

-- ---------------------------------------------------------------- ofertas
create table if not exists public.black_ofertas (
  id bigint generated always as identity primary key,
  data date not null,
  hora time,
  produto text check (char_length(produto) <= 200),
  slug text check (char_length(slug) <= 200),
  plataforma text check (char_length(plataforma) <= 40),
  licencas text check (char_length(licencas) <= 200),
  preco_de numeric(10, 2) check (preco_de is null or preco_de >= 0),
  preco_por numeric(10, 2) check (preco_por is null or preco_por >= 0),
  link text check (char_length(link) <= 500),
  resp text check (char_length(resp) <= 80),
  obs text check (char_length(obs) <= 1000),
  ok_pagina boolean not null default false,
  ok_arte boolean not null default false,
  ok_envio boolean not null default false,
  msg_custom text check (char_length(msg_custom) <= 4000),
  criado_por text default (auth.jwt() ->> 'email'),
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
create index if not exists black_ofertas_data_idx on public.black_ofertas (data, hora);

drop trigger if exists black_ofertas_touch on public.black_ofertas;
create trigger black_ofertas_touch
before insert or update on public.black_ofertas
for each row execute function public.black_touch();

alter table public.black_ofertas enable row level security;
drop policy if exists black_ofertas_ler on public.black_ofertas;
create policy black_ofertas_ler on public.black_ofertas
  for select to authenticated using (public.black_papel() is not null);
drop policy if exists black_ofertas_criar on public.black_ofertas;
create policy black_ofertas_criar on public.black_ofertas
  for insert to authenticated with check (public.black_papel() = 'editor');
drop policy if exists black_ofertas_editar on public.black_ofertas;
create policy black_ofertas_editar on public.black_ofertas
  for update to authenticated using (public.black_papel() = 'editor') with check (public.black_papel() = 'editor');
drop policy if exists black_ofertas_excluir on public.black_ofertas;
create policy black_ofertas_excluir on public.black_ofertas
  for delete to authenticated using (public.black_papel() = 'editor');
revoke all on public.black_ofertas from anon;
grant select, insert, update, delete on public.black_ofertas to authenticated;

-- ---------------------------------------------------------------- ajustes da campanha
create table if not exists public.black_config (
  chave text primary key check (char_length(chave) <= 60),
  valor jsonb
);
alter table public.black_config enable row level security;
drop policy if exists black_config_ler on public.black_config;
create policy black_config_ler on public.black_config
  for select to authenticated using (public.black_papel() is not null);
drop policy if exists black_config_gravar on public.black_config;
create policy black_config_gravar on public.black_config
  for all to authenticated using (public.black_papel() = 'editor') with check (public.black_papel() = 'editor');
revoke all on public.black_config from anon;
grant select, insert, update, delete on public.black_config to authenticated;

-- ---------------------------------------------------------------- quadro do time
create table if not exists public.black_tarefas (
  id bigint generated always as identity primary key,
  titulo text not null default '' check (char_length(titulo) <= 200),
  tipo text not null default 'outro'
    check (tipo in ('arte', 'video', 'mensagem', 'pagina', 'banner', 'post', 'live', 'anuncio', 'outro')),
  status text not null default 'fazer' check (status in ('fazer', 'andamento', 'revisao', 'pronto')),
  prioridade text not null default 'normal' check (prioridade in ('urgente', 'alta', 'normal', 'baixa')),
  resp text not null default '' check (char_length(resp) <= 80),
  prazo date,
  oferta_id text,
  obs text not null default '' check (char_length(obs) <= 1000),
  ordem double precision not null default extract(epoch from now()),
  criado_por text default (auth.jwt() ->> 'email'),
  criado_em timestamptz not null default now(),
  atualizado_por text,
  atualizado_em timestamptz not null default now()
);
create index if not exists black_tarefas_status_idx on public.black_tarefas (status, ordem);

drop trigger if exists black_tarefas_touch on public.black_tarefas;
create trigger black_tarefas_touch
before insert or update on public.black_tarefas
for each row execute function public.black_touch();

alter table public.black_tarefas enable row level security;
drop policy if exists black_tarefas_ler on public.black_tarefas;
create policy black_tarefas_ler on public.black_tarefas
  for select to authenticated using (public.black_papel() is not null);
drop policy if exists black_tarefas_criar on public.black_tarefas;
create policy black_tarefas_criar on public.black_tarefas
  for insert to authenticated with check (public.black_papel() = 'editor');
drop policy if exists black_tarefas_editar on public.black_tarefas;
create policy black_tarefas_editar on public.black_tarefas
  for update to authenticated using (public.black_papel() = 'editor') with check (public.black_papel() = 'editor');
drop policy if exists black_tarefas_excluir on public.black_tarefas;
create policy black_tarefas_excluir on public.black_tarefas
  for delete to authenticated using (public.black_papel() = 'editor');
revoke all on public.black_tarefas from anon;
grant select, insert, update, delete on public.black_tarefas to authenticated;

-- Tempo real: o painel atualiza sozinho quando alguém mexe numa oferta ou num card.
do $$
begin
  alter publication supabase_realtime add table public.black_ofertas;
exception when duplicate_object then null; when undefined_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.black_tarefas;
exception when duplicate_object then null; when undefined_object then null;
end $$;

-- ---------------------------------------------------------------- equipe e acessos (só o dono)
-- O dono também pode abrir o painel Links e os cadastros do VIP.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')))
      or public.painel_eh_dono();
$$;

create or replace function public.black_vip_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.black_vip_admins where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  ) or public.painel_eh_dono();
$$;

create or replace function public.painel_acessos()
returns table (
  email text,
  conta boolean,
  ultimo_acesso timestamptz,
  dono boolean,
  links boolean,
  leads boolean,
  black text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.painel_eh_dono() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  return query
  with e as (
    select d.email from public.painel_donos d
    union select a.email from public.admins a
    union select v.email from public.black_vip_admins v
    union select t.email from public.black_team t
    union select lower(u.email) from auth.users u where u.email is not null
  )
  select
    e.email,
    exists (select 1 from auth.users u where lower(u.email) = e.email),
    (select max(u.last_sign_in_at) from auth.users u where lower(u.email) = e.email),
    exists (select 1 from public.painel_donos d where d.email = e.email),
    exists (select 1 from public.admins a where a.email = e.email),
    exists (select 1 from public.black_vip_admins v where v.email = e.email),
    (select t.papel from public.black_team t where t.email = e.email)
  from e
  order by e.email;
end
$$;

-- links: painel Links · leads: cadastros do Grupo VIP · black: 'editor', 'leitor' ou null.
create or replace function public.painel_acesso_definir(
  p_email text,
  p_links boolean,
  p_leads boolean,
  p_black text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  e text := lower(trim(p_email));
begin
  if not public.painel_eh_dono() then
    raise exception 'sem permissão' using errcode = '42501';
  end if;
  if e is null or e !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'e-mail inválido' using errcode = '22023';
  end if;
  if p_black is not null and p_black not in ('editor', 'leitor') then
    raise exception 'papel inválido' using errcode = '22023';
  end if;
  if exists (select 1 from public.painel_donos d where d.email = e) then
    raise exception 'o acesso do dono não muda por aqui' using errcode = '42501';
  end if;

  delete from public.admins where email = e;
  if p_links then insert into public.admins (email) values (e); end if;

  delete from public.black_vip_admins where email = e;
  if p_leads then insert into public.black_vip_admins (email) values (e); end if;

  delete from public.black_team where email = e;
  if p_black is not null then insert into public.black_team (email, papel) values (e, p_black); end if;
end
$$;

revoke all on function public.painel_eh_dono() from public, anon;
revoke all on function public.black_papel() from public, anon;
revoke all on function public.painel_acessos() from public, anon;
revoke all on function public.painel_acesso_definir(text, boolean, boolean, text) from public, anon;
grant execute on function public.painel_eh_dono() to authenticated;
grant execute on function public.black_papel() to authenticated;
grant execute on function public.painel_acessos() to authenticated;
grant execute on function public.painel_acesso_definir(text, boolean, boolean, text) to authenticated;
grant execute on function public.is_admin() to authenticated, anon;
grant execute on function public.black_vip_is_admin() to authenticated;
