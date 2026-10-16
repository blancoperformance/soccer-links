# Links Soccer Games

Site do link da bio da Soccer Games (links.lojasoccergames.com.br), a página do Grupo VIP da
Black November (/black) e o painel da equipe (/admin e /admin/black).

Base: TanStack Start (React), Supabase e Vercel, integrado à Nuvemshop.

## O que tem

- **/**: botões principais, garantias, os jogos da loja com busca (entende "gta", "cod",
  "fifa", "homem aranha", "ps4"...), gêneros, abas (Lançamentos, Mais vendidos, Ofertas, PS5,
  PS4, Infantis) e uma ficha de cada jogo com escolha de licença, preço ao vivo e o botão Comprar,
  que coloca a licença direto no carrinho da loja (`/comprar/<código>`). Tem também o quiz
  "Descubra seu próximo jogo" (até 7 perguntas que mudam conforme as respostas, sem terror ou
  violência quando o jogo é para criança), o atendimento com respostas rápidas e o Grupo VIP.
- **/black**: página da Black November com contagem até a Pré-Black do GTA VI (20/11) e depois
  até a Black Friday (27/11), cadastro do Grupo VIP com antispam, dúvidas (com FAQPage para
  Google e IAs), salvar as datas na agenda e barra fixa no celular.
- **/admin**: visitas, funil até o carrinho, jogos mais clicados, buscas, respostas do quiz e
  contatos. **/admin/black**: cadastros da Black, com exportação para a Huggy e para e-mail.

## Onde mudar cada coisa

| O quê | Arquivo |
|---|---|
| Textos, botões, atendimento, quiz, banner do topo | `src/features/public/content.ts` |
| Datas da Black, link do grupo, texto do aceite | `src/features/black/config.ts` |
| Dúvidas da Black | `src/features/black/faq.ts` |
| Abas da loja e atalhos de gênero | `src/features/public/games.ts` |
| Lista de jogos | rode `python3 scripts/build-catalog.py produtos.csv` com a planilha nova exportada da Nuvemshop |
| Logo | coloque `public/logo-soccer.png` e preencha `profile.logo` em `content.ts` |
| Cores | `src/styles.css` (`[data-theme="escuro"]`) |

## Dados ao vivo da loja

A planilha não traz foto nem o código das licenças. O site busca isso ao vivo por `/api/loja`:

1. **Com token (recomendado):** `NUVEMSHOP_STORE_ID` e `NUVEMSHOP_TOKEN` na Vercel. Uma chamada
   traz o catálogo inteiro, com cache de 10 minutos. Teste em `/api/loja?status=1`.
2. **Sem token:** cada jogo é lido da própria página do produto na loja quando aparece na tela.
   Teste em `/api/loja?slug=<endereço-do-produto>`.

Preço só aparece quando vem da loja. Sem dado ao vivo, a ficha leva para a página do produto.

## Banco (Supabase)

Rode os arquivos de `supabase/migrations` em ordem no SQL Editor. Todos podem rodar mais de uma
vez. Depois cadastre os e-mails da equipe em `admins` (painel) e `black_vip_admins` (painel da Black).

## Desenvolvimento

```sh
bun install
bun run dev        # http://localhost:5173
bun run test       # testes (catálogo, busca, quiz, Nuvemshop, Black)
```

Fora de `links.lojasoccergames.com.br` nada é gravado no banco nem contado nas estatísticas
(abra com `?gravar=1` para testar o cadastro de verdade). Aparelhos da equipe: `?interno=1`.

O passo a passo completo de publicação está em `PASSO-A-PASSO.md`.
