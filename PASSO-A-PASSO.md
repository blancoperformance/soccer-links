# Publicar os links da Soccer Games

São 7 etapas. Nenhuma pede senha ou chave secreta no chat: as chaves vão direto nos painéis
(Supabase e Vercel). Tempo total: uns 40 minutos.

---

## 1. GitHub: subir o projeto

1. Em github.com, clique em **New repository**. Nome: `soccer-links`. Marque **Private**. Crie sem README.
2. Na página do repositório vazio, clique em **uploading an existing file**.
3. Descompacte o ZIP no computador e arraste **o conteúdo da pasta** `soccer-links` (não a pasta em si) para a página.
   As pastas `.github` e os arquivos que começam com ponto também vão.
4. Em **Commit changes**, escreva "Primeira versão" e confirme.

> Se o GitHub reclamar do número de arquivos, suba em duas levas: primeiro a pasta `src`, depois o resto.

## 2. Supabase: criar o banco

1. Em supabase.com, **New project** (plano grátis). Nome: `soccer-links`. Região: São Paulo.
2. Vá em **SQL Editor > New query**. Abra cada arquivo da pasta `supabase/migrations`, **em ordem**,
   cole o conteúdo e clique em **Run**:
   1. `20261016100000_soccer_links_base.sql`
   2. `20261016100100_soccer_links_quiz_leads.sql`
   3. `20261016100200_soccer_links_black_vip.sql`
   4. `20261016100300_soccer_links_events_retention.sql`
3. Ainda no SQL Editor, libere quem pode abrir os painéis (troque pelos e-mails reais):
   ```sql
   insert into public.admins (email) values ('email-da-equipe@exemplo.com') on conflict do nothing;
   insert into public.black_vip_admins (email) values ('email-da-equipe@exemplo.com') on conflict do nothing;
   ```
4. Em **Authentication > Users > Add user**, crie o usuário de cada e-mail acima com uma senha
   e marque **Auto Confirm User**. Essa senha fica com vocês, não precisa passar para ninguém.
5. Em **Project Settings > API Keys**, copie a **Project URL** e a **Publishable key** (`sb_publishable_...`).
   A chave secreta (`service_role` / `sb_secret_`) **não é usada** em lugar nenhum.

## 3. Vercel: colocar no ar

1. Em vercel.com, **Add New > Project** e importe o repositório `soccer-links`.
2. Em **Environment Variables**, cadastre:

   | Nome | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | Project URL do Supabase |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
   | `SUPABASE_URL` | Project URL (de novo) |
   | `SUPABASE_PUBLISHABLE_KEY` | Publishable key (de novo) |
   | `VITE_GTM_ID` | `GTM-NTMSLZ5H` (o contêiner que a loja já usa) |

3. Clique em **Deploy**. O `vercel.json` já diz como instalar e montar.
4. Abra o endereço `...vercel.app` que a Vercel mostrar e confira a página. Nesse endereço nada é gravado
   no banco (é ambiente de teste). As estatísticas e os cadastros só contam no domínio oficial.

## 4. Domínio: links.lojasoccergames.com.br

1. Na Vercel, **Settings > Domains > Add**: `links.lojasoccergames.com.br`.
2. A Vercel mostra um registro **CNAME** (nome `links`, valor parecido com `cname.vercel-dns.com`).
3. No painel onde fica o DNS do domínio `lojasoccergames.com.br`, crie esse CNAME.
   **Não troque os nameservers**: é só um registro novo, a loja continua igual.
4. Em alguns minutos a Vercel mostra o domínio como válido, com o cadeado (HTTPS).

## 5. Nuvemshop: fotos e preços do catálogo inteiro (recomendado)

Sem isto o site já funciona: ele lê a página de cada jogo quando o jogo aparece na tela. Com o token,
uma chamada traz tudo e fica mais rápido.

1. No Portal de Parceiros da Nuvemshop, crie um app próprio com permissão **só de leitura de produtos**.
2. Instale o app na loja da Soccer Games. Ao final, a Nuvemshop entrega o **access token** e o **ID da loja**
   (`user_id`).
3. Na Vercel, cadastre `NUVEMSHOP_TOKEN` (o token) e `NUVEMSHOP_STORE_ID` (o ID da loja) e faça **Redeploy**.
4. Teste: `https://links.lojasoccergames.com.br/api/loja?status=1` deve mostrar `"configured": true` e a
   quantidade de produtos.

> Pressuposto: os nomes das telas do portal podem mudar. Confirme na documentação de desenvolvedores
> da Nuvemshop. O token nunca vai no chat nem no GitHub, só na Vercel.

## 6. Black November: link do grupo e anúncios

1. No GitHub, abra `src/features/black/config.ts`, clique no lápis e cole o link do grupo em `groupUrl`
   (o link `chat.whatsapp.com/...` do grupo Soccer VIP). Salve com **Commit changes**.
   A Vercel publica sozinha em cerca de 1 minuto.
2. Anúncios e Instagram: use `https://links.lojasoccergames.com.br/black?utm_source=meta&utm_medium=paid&utm_campaign=black-vip`.
3. No GTM (contêiner `GTM-NTMSLZ5H`), crie um acionador **Evento personalizado** com o nome
   `black_vip_lead` e use nele a tag de Lead do Pixel da Meta. O evento leva `event_id` para não contar duas vezes.

## 7. Conferir

- [ ] `links.lojasoccergames.com.br` abre com os jogos, as fotos e os preços.
- [ ] Busca: digite "gta ps4" e "homem aranha".
- [ ] Toque num jogo, escolha a licença e toque em Comprar: cai no carrinho da loja com o jogo certo.
- [ ] Quiz até o fim, com e sem cadastro.
- [ ] `/black`: cadastre um número seu. O grupo abre e o cadastro aparece em `/admin/black`.
- [ ] `/admin`: entre com o e-mail e a senha criados no Supabase.
- [ ] No seu celular, abra uma vez `links.lojasoccergames.com.br/?interno=1` para não contar suas visitas.

## Atualizar a lista de jogos

Exporte a planilha de produtos da Nuvemshop e rode, no computador com o projeto:

```sh
python3 scripts/build-catalog.py caminho/da/planilha.csv
```

Depois suba o arquivo `src/features/public/games.json` novo no GitHub.
