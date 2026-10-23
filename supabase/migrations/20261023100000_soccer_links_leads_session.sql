-- Soccer Links | contatos ligados à visita (lista "Foi para a compra e não comprou")
--
-- Guarda no contato do quiz o mesmo código anônimo de visita que os eventos já usam e que vai
-- nos links para a loja (sgs). Assim o painel cruza: deixou o WhatsApp -> tocou em Comprar ->
-- pagou ou não. Não guarda nenhum dado novo da pessoa: o código é aleatório e só existe naquela visita.
--
-- Seguro rodar mais de uma vez. Não mexe em nenhum contato que já existe.

alter table public.leads
  add column if not exists session_id text
  check (session_id is null or char_length(session_id) between 8 and 64);

create index if not exists leads_session_id_idx on public.leads (session_id);
