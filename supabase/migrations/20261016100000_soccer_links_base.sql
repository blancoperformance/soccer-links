-- Links Soccer Games (links.lojasoccergames.com.br): estatísticas anônimas + painel.
-- Nenhum dado pessoal aqui: só um id anônimo por aba, o que foi tocado/buscado/respondido e a origem (UTM).
-- Pode rodar mais de uma vez.

create table if not exists public.events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  session_id text not null check (char_length(session_id) between 8 and 64),
  event text not null,
  item text check (char_length(item) <= 200),
  detail text check (char_length(detail) <= 400),
  path text check (char_length(path) <= 300),
  referrer text check (char_length(referrer) <= 300),
  device text check (device in ('mobile', 'tablet', 'desktop')),
  utm_source text check (char_length(utm_source) <= 100),
  utm_medium text check (char_length(utm_medium) <= 100),
  utm_campaign text check (char_length(utm_campaign) <= 100),
  utm_content text check (char_length(utm_content) <= 100)
);

alter table public.events drop constraint if exists events_event_check;
-- size_select / buy_no_size: na Soccer o "tamanho" é a licença (Primária ou Secundária).
alter table public.events add constraint events_event_check check (event in (
  'page_view', 'links_clique', 'intent_select', 'search', 'search_no_result',
  'quiz_start', 'quiz_answer', 'quiz_complete', 'quiz_result_click',
  'context_view', 'assistant_question', 'assistant_result_click',
  'size_select', 'checkout_click', 'buy_no_size', 'black_lead'
));

create index if not exists events_created_at_idx on public.events (created_at desc);
create index if not exists events_event_created_idx on public.events (event, created_at desc);

alter table public.events enable row level security;

-- Visitantes só gravam (nunca leem, alteram ou apagam).
drop policy if exists "events_insert_anon" on public.events;
create policy "events_insert_anon" on public.events
  for insert to anon, authenticated
  with check (created_at > now() - interval '5 minutes' and created_at < now() + interval '5 minutes');

-- Quem pode abrir o painel (lista de e-mails). Cadastre os e-mails da equipe depois de rodar:
--   insert into public.admins (email) values ('voce@exemplo.com') on conflict do nothing;
create table if not exists public.admins (
  email text primary key check (email = lower(email))
);
alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where email = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

drop policy if exists "admins_read_self" on public.admins;
create policy "admins_read_self" on public.admins
  for select to authenticated using (public.is_admin());

drop policy if exists "events_read_admin" on public.events;
create policy "events_read_admin" on public.events
  for select to authenticated using (public.is_admin());

-- Uma chamada traz tudo o que o painel precisa para um período.
create or replace function public.soccer_dashboard(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
  tz constant text := 'America/Sao_Paulo';
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  with e as (
    select *,
           (event = 'links_clique' and detail like '%/produtos/%') or event in ('quiz_result_click', 'assistant_result_click') as is_product,
           event in ('links_clique', 'quiz_result_click', 'assistant_result_click') as is_click
    from public.events
    where created_at >= p_from and created_at < p_to
  ),
  visits as (
    select distinct session_id from e where event = 'page_view'
  ),
  engaged as (
    select distinct session_id from e where event <> 'page_view' and event <> 'context_view'
  ),
  explored as (
    select distinct session_id from e where event in ('intent_select', 'quiz_start', 'search', 'search_no_result')
  ),
  to_site as (
    select distinct session_id from e
    where is_product or event = 'checkout_click' or (event = 'links_clique' and detail like '%lojasoccergames.com.br%')
  ),
  days as (
    select to_char(d, 'YYYY-MM-DD') as day
    from generate_series(
      date_trunc('day', p_from at time zone tz),
      date_trunc('day', (p_to - interval '1 second') at time zone tz),
      interval '1 day'
    ) as d
  ),
  daily_raw as (
    select to_char(date_trunc('day', created_at at time zone tz), 'YYYY-MM-DD') as day,
           count(distinct session_id) filter (where event = 'page_view') as visits,
           count(*) filter (where is_click) as clicks
    from e group by 1
  ),
  daily as (
    select d.day, coalesce(r.visits, 0) as visits, coalesce(r.clicks, 0) as clicks
    from days d left join daily_raw r using (day) order by d.day
  ),
  hours as (
    select h as hour,
           (select count(distinct session_id) from e
             where event = 'page_view' and extract(hour from created_at at time zone tz) = h) as visits
    from generate_series(0, 23) as h
  ),
  weekdays as (
    select w as dow,
           (select count(distinct session_id) from e
             where event = 'page_view' and extract(dow from created_at at time zone tz) = w) as visits
    from generate_series(0, 6) as w
  ),
  devices as (
    select coalesce(device, 'desconhecido') as device, count(distinct session_id) as n
    from e where event = 'page_view' group by 1 order by n desc
  ),
  top_links as (
    select item, count(*) as n, count(distinct session_id) as sessions
    from e where event = 'links_clique' and not is_product and item is not null
    group by item order by n desc limit 20
  ),
  products as (
    select case when event = 'links_clique'
                then 'url:' || regexp_replace(detail, '^.*/produtos/([^/?#]+).*$', '\1')
                else 'slug:' || item end as key,
           max(item) filter (where event = 'links_clique') as name,
           count(*) as n,
           count(*) filter (where event = 'quiz_result_click') as from_quiz
    from e where is_product and (detail is not null or item is not null)
    group by 1 order by n desc limit 30
  ),
  categories as (
    select coalesce(item, detail) as item, count(distinct session_id) as n
    from e where event = 'intent_select' and coalesce(item, detail) is not null
    group by 1 order by n desc limit 12
  ),
  s as (
    select distinct session_id, lower(trim(detail)) as term, event
    from e where event in ('search', 'search_no_result') and detail is not null and trim(detail) <> ''
  ),
  s_final as (
    -- "rac", "race", "racer" typed in the same visit count only as "racer".
    select a.* from s a
    where not exists (
      select 1 from s b
      where b.session_id = a.session_id and b.term <> a.term
        and length(b.term) > length(a.term) and left(b.term, length(a.term)) = a.term
    )
  ),
  searches as (
    select term, count(distinct session_id) as n, bool_and(event = 'search_no_result') as no_result
    from s_final group by term order by n desc, term limit 25
  ),
  quiz_answers as (
    select question, answer, count(*) as n from (
      select distinct on (session_id, item) session_id, item as question, detail as answer
      from e where event = 'quiz_answer' and item is not null and detail is not null
      order by session_id, item, created_at desc
    ) x group by 1, 2 order by 1, n desc
  ),
  quiz_results as (
    select detail as product, count(distinct session_id) as n
    from e where event = 'quiz_complete' and detail is not null
    group by 1 order by n desc limit 10
  ),
  questions as (
    select detail as question, created_at from e where event = 'assistant_question'
    order by created_at desc limit 40
  ),
  src as (
    select session_id,
           coalesce(
             case lower(nullif(utm_source, ''))
               when 'ig' then 'instagram'
               when 'fb' then 'facebook'
               else lower(nullif(utm_source, ''))
             end,
             case
               when referrer ilike '%instagram%' then 'instagram'
               when referrer ilike '%facebook%' or referrer ilike '%fb.%' then 'facebook'
               when referrer ilike '%tiktok%' then 'tiktok'
               when referrer ilike '%google%' then 'google'
               when referrer ilike '%youtube%' then 'youtube'
               when referrer ilike '%whatsapp%' then 'whatsapp'
               when referrer is not null and referrer <> '' then referrer
               else 'direto'
             end
           ) as source
    from e where event = 'page_view'
  ),
  sources as (
    select source, count(distinct session_id) as n from src group by 1 order by n desc limit 10
  ),
  campaigns as (
    select utm_campaign as campaign, count(distinct session_id) as n
    from e where event = 'page_view' and utm_campaign is not null and utm_campaign <> ''
    group by 1 order by n desc limit 10
  ),
  -- Purchase funnel: every number counts visits (one per person), except the *_events totals.
  checkout_products as (
    select item, count(*) as n, count(distinct session_id) as sessions
    from e where event = 'checkout_click' and item is not null
    group by item order by sessions desc, n desc limit 20
  ),
  checkout_sizes as (
    select regexp_replace(detail, ' · com cupom$', '') as size, count(distinct session_id) as n
    from e where event = 'checkout_click' and detail is not null
    group by 1 order by n desc limit 20
  ),
  checkout_by_source as (
    select src.source, count(distinct e.session_id) as n
    from e join src using (session_id)
    where e.event = 'checkout_click'
    group by 1 order by n desc limit 10
  ),
  no_size_products as (
    select item, count(distinct session_id) as n
    from e where event = 'buy_no_size' and item is not null
    group by item order by n desc limit 10
  )
  select jsonb_build_object(
    'version', 2,
    'totals', jsonb_build_object(
      'visits', (select count(*) from visits),
      'engaged', (select count(*) from engaged),
      'explored', (select count(*) from explored),
      'to_site', (select count(*) from to_site),
      'clicks', (select count(*) from e where is_click),
      'product_clicks', (select count(*) from e where is_product),
      'support_clicks', (select count(*) from e where event = 'links_clique'
                           and (detail ilike '%wa.me%' or item ilike any (array['%whatsapp%', '%central%', '%ativar%', '%licen%', '%pedido%', '%garantia%', '%atendimento%', '%e-mail%']))),
      'quiz_start', (select count(distinct session_id) from e where event = 'quiz_start'),
      'quiz_complete', (select count(distinct session_id) from e where event = 'quiz_complete'),
      'quiz_result_click', (select count(distinct session_id) from e where event = 'quiz_result_click'),
      'searches', (select count(*) from s_final),
      'searches_no_result', (select count(*) from s_final where event = 'search_no_result'),
      'assistant_questions', (select count(*) from e where event = 'assistant_question'),
      'events', (select count(*) from e),
      'product_viewers', (select count(distinct session_id) from e where is_product),
      'size_selectors', (select count(distinct session_id) from e where event = 'size_select'),
      'checkout_sessions', (select count(distinct session_id) from e where event = 'checkout_click'),
      'checkout_events', (select count(*) from e where event = 'checkout_click'),
      'no_size_sessions', (select count(distinct session_id) from e where event = 'buy_no_size'),
      'checkout_with_coupon', (select count(distinct session_id) from e where event = 'checkout_click' and detail like '%com cupom'),
      'checkout_from_quiz', (select count(distinct session_id) from e where event = 'checkout_click'
                               and session_id in (select session_id from e where event = 'quiz_complete'))
    ),
    'daily', coalesce((select jsonb_agg(daily) from daily), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(hours order by hour) from hours), '[]'::jsonb),
    'weekdays', coalesce((select jsonb_agg(weekdays order by dow) from weekdays), '[]'::jsonb),
    'devices', coalesce((select jsonb_agg(devices) from devices), '[]'::jsonb),
    'top_links', coalesce((select jsonb_agg(top_links) from top_links), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(products) from products), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(categories) from categories), '[]'::jsonb),
    'searches', coalesce((select jsonb_agg(searches) from searches), '[]'::jsonb),
    'quiz_answers', coalesce((select jsonb_agg(quiz_answers) from quiz_answers), '[]'::jsonb),
    'quiz_results', coalesce((select jsonb_agg(quiz_results) from quiz_results), '[]'::jsonb),
    'questions', coalesce((select jsonb_agg(questions) from questions), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(sources) from sources), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(campaigns) from campaigns), '[]'::jsonb),
    'checkout_products', coalesce((select jsonb_agg(checkout_products) from checkout_products), '[]'::jsonb),
    'checkout_sizes', coalesce((select jsonb_agg(checkout_sizes) from checkout_sizes), '[]'::jsonb),
    'checkout_by_source', coalesce((select jsonb_agg(checkout_by_source) from checkout_by_source), '[]'::jsonb),
    'no_size_products', coalesce((select jsonb_agg(no_size_products) from no_size_products), '[]'::jsonb)
  ) into result;

  return result;
end;
$$;
revoke all on function public.soccer_dashboard(timestamptz, timestamptz) from public, anon;
grant execute on function public.soccer_dashboard(timestamptz, timestamptz) to authenticated;

-- Apaga os dados de teste. Só admin. Devolve quantos registros saíram.
create or replace function public.soccer_reset_events()
returns bigint
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  if not public.is_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  delete from public.events;
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.soccer_reset_events() from public, anon;
grant execute on function public.soccer_reset_events() to authenticated;
grant execute on function public.is_admin() to authenticated, anon;

-- Permissões explícitas (funciona mesmo com "Automatically expose new tables" desligado).
grant usage on schema public to anon, authenticated;
grant insert on public.events to anon, authenticated;
grant select on public.events to authenticated;
grant select on public.admins to authenticated;
