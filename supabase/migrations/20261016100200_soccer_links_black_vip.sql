-- Black November Soccer Games: cadastro do Grupo VIP (página /black) e painel (/admin/black).
--
-- Tudo fica no banco, sem Edge Function:
--   black_vip_signup(...)  chamada pela página (chave pública). Valida, limita abuso por IP e por
--                          WhatsApp, ignora robôs e grava (ou atualiza) o cadastro.
--   black_vip_total()      total de inscritos, para a prova social da página. Nenhum dado pessoal.
--   black_vip_is_admin()   quem pode abrir o painel da Black (lista black_vip_admins).
--
-- Cadastre quem pode abrir o painel da Black depois de rodar:
--   insert into public.black_vip_admins (email) values ('voce@exemplo.com') on conflict do nothing;
-- Pode rodar mais de uma vez.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.black_vip_admins (
  email text primary key check (email = lower(email))
);
alter table public.black_vip_admins enable row level security;

create table if not exists public.black_vip_leads (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nome text not null check (char_length(nome) between 2 and 80),
  whatsapp text not null unique check (whatsapp ~ '^55[1-9]{2}9?[0-9]{8}$'),
  email text check (email is null or (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  consent_text text not null,
  consent_at timestamptz not null default now(),
  utm jsonb,
  page text check (char_length(page) <= 300),
  event_id text check (char_length(event_id) <= 64),
  submissions integer not null default 1,
  exported_huggy_at timestamptz,
  exported_email_at timestamptz
);
create index if not exists black_vip_leads_created_at_idx on public.black_vip_leads (created_at desc);
alter table public.black_vip_leads enable row level security;

-- Tentativas (para o limite por IP). Só o hash do IP com sal, nunca o IP.
create table if not exists public.black_vip_hits (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  ip_hash text not null,
  outcome text not null check (outcome in ('try', 'bot', 'rate', 'invalid', 'ok'))
);
create index if not exists black_vip_hits_ip_at_idx on public.black_vip_hits (ip_hash, at desc);
alter table public.black_vip_hits enable row level security;

-- Sal do hash do IP, gerado uma vez neste banco.
create table if not exists public.black_vip_config (
  key text primary key,
  value text not null
);
alter table public.black_vip_config enable row level security;
insert into public.black_vip_config (key, value)
  values ('ip_salt', encode(extensions.gen_random_bytes(24), 'hex'))
  on conflict (key) do nothing;

create or replace function public.black_vip_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.black_vip_admins where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.black_vip_signup(
  p_nome text,
  p_whatsapp text,
  p_email text default null,
  p_consent boolean default false,
  p_consent_text text default null,
  p_utm jsonb default null,
  p_page text default null,
  p_event_id text default null,
  p_started bigint default 0,
  p_empresa text default ''
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_headers json := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::json;
  v_ip text := trim(split_part(coalesce(v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1));
  v_salt text := (select value from public.black_vip_config where key = 'ip_salt');
  v_hash text := encode(extensions.digest(coalesce(v_salt, '') || coalesce(v_ip, ''), 'sha256'), 'hex');
  v_now_ms bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint;
  v_nome text := left(trim(regexp_replace(coalesce(p_nome, ''), '[[:cntrl:]<>]', '', 'g')), 80);
  v_whats text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
  v_email text := nullif(lower(left(trim(coalesce(p_email, '')), 254)), '');
  v_utm jsonb := null;
begin
  -- limite por IP (12 tentativas em 10 min; operadoras de celular dividem IP entre muita gente) e geral (300 em 10 min)
  if (select count(*) from public.black_vip_hits where ip_hash = v_hash and at > now() - interval '10 minutes') >= 12
     or (select count(*) from public.black_vip_hits where at > now() - interval '10 minutes') >= 300 then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'rate');
    return jsonb_build_object('ok', false, 'error', 'rate');
  end if;

  -- armadilhas: campo escondido preenchido ou envio rápido demais -> finge sucesso e não grava
  if coalesce(p_empresa, '') <> '' or (coalesce(p_started, 0) > 0 and v_now_ms - p_started < 1500) then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'bot');
    return jsonb_build_object('ok', true);
  end if;

  if length(v_whats) in (10, 11) then v_whats := '55' || v_whats; end if;
  if char_length(v_nome) < 2 then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'nome');
  end if;
  if v_whats !~ '^55[1-9]{2}9?[0-9]{8}$' then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'whatsapp');
  end if;
  if v_email is not null and v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'email');
  end if;
  if coalesce(p_consent, false) is not true then
    insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'invalid');
    return jsonb_build_object('ok', false, 'error', 'consent');
  end if;

  -- só as chaves utm_* conhecidas, cortadas em 120 caracteres
  if p_utm is not null and jsonb_typeof(p_utm) = 'object' then
    select jsonb_object_agg(key, left(value, 120)) into v_utm
    from jsonb_each_text(p_utm)
    where key in ('utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term') and value <> '';
  end if;

  insert into public.black_vip_leads (nome, whatsapp, email, consent_text, utm, page, event_id)
  values (
    v_nome, v_whats, v_email,
    left(coalesce(nullif(p_consent_text, ''), 'Aceito receber as ofertas da Soccer Games por WhatsApp e e-mail.'), 300),
    v_utm, left(p_page, 300), left(p_event_id, 64)
  )
  on conflict (whatsapp) do update set
    nome = excluded.nome,
    email = coalesce(excluded.email, public.black_vip_leads.email),
    consent_text = excluded.consent_text,
    consent_at = now(),
    utm = coalesce(public.black_vip_leads.utm, excluded.utm),
    submissions = public.black_vip_leads.submissions + 1,
    updated_at = now();

  insert into public.black_vip_hits (ip_hash, outcome) values (v_hash, 'ok');
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.black_vip_total()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.black_vip_leads;
$$;

-- Painel: listar, marcar exportação e apagar (pedido LGPD). Nada para anon.
drop policy if exists "black_vip_admins_read_self" on public.black_vip_admins;
create policy "black_vip_admins_read_self" on public.black_vip_admins
  for select to authenticated using (public.black_vip_is_admin());

drop policy if exists "black_vip_leads_read_admin" on public.black_vip_leads;
create policy "black_vip_leads_read_admin" on public.black_vip_leads
  for select to authenticated using (public.black_vip_is_admin());
drop policy if exists "black_vip_leads_update_admin" on public.black_vip_leads;
create policy "black_vip_leads_update_admin" on public.black_vip_leads
  for update to authenticated using (public.black_vip_is_admin()) with check (public.black_vip_is_admin());
drop policy if exists "black_vip_leads_delete_admin" on public.black_vip_leads;
create policy "black_vip_leads_delete_admin" on public.black_vip_leads
  for delete to authenticated using (public.black_vip_is_admin());

revoke all on public.black_vip_admins from anon, authenticated;
grant select on public.black_vip_admins to authenticated;
revoke all on public.black_vip_leads from anon, authenticated;
grant select, delete on public.black_vip_leads to authenticated;
grant update (exported_huggy_at, exported_email_at) on public.black_vip_leads to authenticated;
revoke all on public.black_vip_hits from anon, authenticated;
revoke all on public.black_vip_config from anon, authenticated;

revoke all on function public.black_vip_is_admin() from public, anon;
grant execute on function public.black_vip_is_admin() to authenticated;
revoke all on function public.black_vip_signup(text, text, text, boolean, text, jsonb, text, text, bigint, text) from public;
grant execute on function public.black_vip_signup(text, text, text, boolean, text, jsonb, text, text, bigint, text) to anon, authenticated;
revoke all on function public.black_vip_total() from public;
grant execute on function public.black_vip_total() to anon, authenticated;
