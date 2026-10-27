"""Porta a landing da Black da MTS (HTML da ShopPub) para a /black da Soccer Games.

Saídas em soccer-links/src/features/black/:
  landing.html  -> estilo + marcação (sem scripts), com <!--FAQ--> para as dúvidas
  landing-engine.txt -> todos os scripts da página, adaptados
"""
import re, sys

SRC = sys.argv[1]
OUT = sys.argv[2]
s = open(SRC, encoding="utf-8").read()


def rep(a, b, count=1, text=None):
    global s
    t = s if text is None else text
    if a not in t:
        raise SystemExit(f"NAO ACHEI: {a[:90]!r}")
    t = t.replace(a, b, count) if count else t.replace(a, b)
    if text is None:
        s = t
    return t


def cut(start, end):
    """Remove de start até end (inclusive)."""
    global s
    i = s.index(start)
    j = s.index(end, i) + len(end)
    s = s[:i] + s[j:]


AC = "#BF3BFF"  # roxo Soccer (mais claro que #c000ff para texto em fundo escuro)
AC_RGB = "191,59,255"
AC2_RGB = "120,40,255"

# ---------- cores ----------
s = re.sub(r"#FF6C00", AC, s, flags=re.I)
s = s.replace("255,108,0", AC_RGB).replace("216,67,42", AC2_RGB)
s = s.replace("--laranja:#BF3BFF", f"--laranja:{AC}")

# ---------- script de encaixe na ShopPub: não serve aqui ----------
cut("<script>\n/* Executado antes do conteúdo", "</script>")

# ---------- fundo: montagem dos trailers oficiais (YouTube) ----------
rep(
    '<div class="bfm-bg-full" aria-hidden="true">\n  <video id="bfm-vid" autoplay muted playsinline preload="auto" src="https://assets.mixkit.co/videos/39917/39917-720.mp4">&nbsp;</video>\n</div>',
    '<div class="bfm-bg-full bfm-wait" aria-hidden="true"><div id="bfm-yt"></div></div>',
)
rep(
    "#bfm-vip .bfm-bg-full::after{",
    "#bfm-vip .bfm-bg-full #bfm-yt{position:absolute;top:50%;left:50%;width:max(100%,177.78vh);height:max(100%,56.25vw);transform:translate(-50%,-50%) scale(1.04);border:0;transition:opacity .35s linear}\n"
    "#bfm-vip .bfm-bg-full.bfm-wait #bfm-yt{opacity:0}\n"
    "#bfm-vip .bfm-bg-full::after{",
)
s = s.replace("background:rgba(11,11,11,.8);pointer-events:none}", "background:linear-gradient(90deg,rgba(11,11,11,.86) 0%,rgba(11,11,11,.62) 45%,rgba(11,11,11,.5) 100%);pointer-events:none}", 1)

# ---------- topo ----------
rep(
    '<div class="bfm-brandline"><span class="bfm-edition">Black 2026</span></div>',
    '<div class="bfm-brandline"><a class="bfm-logo" href="/" data-t="Black: logo" aria-label="Soccer Games"><img src="/logo-soccer.png" alt="" width="40" height="40"></a><span class="bfm-edition">Black 2026</span></div>',
)
rep(
    '<span class="bfm-l1">A <span class="bfm-w"><span>maior</span></span></span><span class="bfm-l2">Black November <span class="bfm-h-end">da MTS.</span></span>',
    '<span class="bfm-l1"><span class="bfm-w"><span>GTA 6</span></span></span><span class="bfm-l2">na Black <span class="bfm-h-end">da Soccer.</span></span>',
)
rep(
    '<p class="bfm-sub">Ofertas novas toda semana. Quem está no grupo vê antes.</p>',
    '<p class="bfm-sub">O GTA 6 chega dia 19/11. O preço do fim de semana do lançamento e da Black Friday sai primeiro no grupo.</p>',
)
rep('aria-label="Black November by MTS"', 'aria-label="Black Friday da Soccer Games"')
rep(
    'aria-label="Contagem regressiva para a abertura geral"',
    'aria-label="Contagem regressiva"',
)
rep(
    '<div class="bfm-when" id="bfm-when">Abertura em 2 de novembro, 00h</div>',
    '<div class="bfm-when" id="bfm-when">O GTA 6 chega em 19 de novembro</div>',
)
rep(
    '<p class="bfm-lead">Toda semana tem oferta nova. O link chega no grupo antes de todo mundo.</p>',
    '<p class="bfm-lead">O preço do GTA 6 e as ofertas da Black chegam no grupo antes de todo mundo.</p>',
)
s = re.sub(
    r'<span>Aceito receber as ofertas da MTS por WhatsApp e e-mail\. <a href="[^"]*"',
    '<span>Aceito receber as ofertas da Soccer Games por WhatsApp e e-mail. Você sai quando quiser. <a href="https://lojasoccergames.com.br/central-de-atendimento/" target="_blank" rel="noopener"',
    s,
    count=1,
)
rep('<p class="bfm-trust">Grátis. Você sai do grupo quando quiser.</p>', '<p class="bfm-trust">Grátis. Só os administradores mandam mensagem.</p>')
rep('Salvar a abertura na agenda</button>', 'Salvar as datas na agenda</button>')

# ---------- o que vai ter ----------
rep(
    '<span class="bfm-tag">O que vai ter no Black November</span><h2 id="bfm-what-h">O mês inteiro.<br>Com estoque contado.</h2>',
    '<span class="bfm-tag">O que vai ter na Black da Soccer</span><h2 id="bfm-what-h">O GTA 6 chega.<br>A Black vem junto.</h2>',
)
mq_items = [
    "GTA 6 dia 19/11",
    "Fim de semana do GTA",
    "Live na sexta, 20/11",
    "Black Friday de 27 a 30/11",
    "Entrega no e-mail",
    "Garantia vitalícia",
]
i = s.index('<div class="bfm-mq"')
j = s.index("</div></div>", i) + len("</div></div>")
old_mq = s[i:j]
star = re.search(r'<span class="bfm-mq-s">.*?</span>', old_mq).group(0)
group = "".join(f'<span class="bfm-mq-i">{t}</span>{star}' for t in mq_items)
s = s[:i] + f'<div class="bfm-mq" aria-label="{" · ".join(mq_items)}"><div class="bfm-mq-t"><span class="bfm-mq-g">{group}</span><span class="bfm-mq-g" aria-hidden="true">{group}</span></div></div>' + s[j:]

rep(
    '<h3 class="bfm-fig-t">Queima de estoque multimarcas</h3><p class="bfm-fig-d">As peças de outras marcas que vendemos saem com preço de liquidação. Acabou, não volta para a loja.</p>',
    '<h3 class="bfm-fig-t">Fim de semana do GTA</h3><p class="bfm-fig-d">De 20 a 22/11, os preços da loja descem para a abertura da Black. Live na sexta, 20.</p>',
)
rep(
    '<h3 class="bfm-fig-t">Preço que não volta</h3><p class="bfm-fig-d">Os valores valem só durante a campanha. Depois, as peças voltam ao preço normal ou saem do catálogo.</p>',
    '<h3 class="bfm-fig-t">Black Friday, 27 a 30/11</h3><p class="bfm-fig-d">A Black da Soccer, com o GTA 6 junto, até a Cyber Monday. Quem está no grupo vê cada oferta antes.</p>',
)
rep(
    '<h3 class="bfm-fig-t">Estoque contado</h3><p class="bfm-fig-d">Cada tamanho tem poucas unidades. Quem está no Grupo VIP recebe o link e escolhe primeiro.</p>',
    '<h3 class="bfm-fig-t">PS4 e PS5, mídia digital</h3><p class="bfm-fig-d">Os dados de acesso chegam no seu e-mail. No Pix, em geral em menos de 30 minutos. Garantia vitalícia.</p>',
)
rep(
    '<p class="bfm-cta-t">Faltam <b id="bfm-cta-d">41 dias</b>. Quem está no grupo recebe cada oferta antes.</p>',
    '<p class="bfm-cta-t">Faltam <b id="bfm-cta-d">23 dias</b>. Quem está no grupo vê o preço antes.</p>',
)

# ---------- trilho: capas dos jogos ----------
GAMES = [
    ("gta-6-grand-theft-auto-vi-ps5-midia-digital", "GTA 6", "Pré-venda"),
    ("ea-sports-fc-26-para-ps5-midia-digital", "EA FC 26", "Ver na loja"),
    ("marvels-spider-man-2-para-ps5-midia-digital", "Spider-Man 2", "Ver na loja"),
    ("god-of-war-ragnarok-ps5-midia-digital", "God of War Ragnarök", "Ver na loja"),
    ("call-of-duty-black-ops-7-midia-digital-ps5", "Black Ops 7", "Ver na loja"),
    ("red-dead-redemption-2-ps4-midia-digital", "Red Dead 2", "Ver na loja"),
]
i = s.index('<section class="bfm-sec bfm-cat"')
j = s.index("</section>", i) + len("</section>")
cat = s[i:j]
ic = re.search(r'<span class="bfm-tile-ic">.*?</svg></span>', cat).group(0)
tiles = "\n".join(
    f'    <a class="bfm-tile bfm-cc" href="https://lojasoccergames.com.br/produtos/{slug}/?utm_source=links&amp;utm_medium=black&amp;utm_campaign=black-2026&amp;utm_content=trilho" data-slug="{slug}" data-t="Black: {name}" target="_blank" rel="noopener"><img alt="{name}" loading="lazy" decoding="async" width="900" height="900">\n'
    f'      <span class="bfm-tile-body"><span class="bfm-cc-t">{name}</span><span class="bfm-cc-a">{cta} {ic}</span></span></a>'
    for slug, name, cta in GAMES
)
s = s[:i] + (
    '<section class="bfm-sec bfm-cat" aria-labelledby="bfm-cat-h">\n'
    '  <div class="bfm-head bfm-reveal"><span class="bfm-tag">Jogos na loja</span><h2 id="bfm-cat-h">Escolha antes da próxima oferta.</h2></div>\n'
    '  <div class="bfm-grid bfm-g3 bfm-glow bfm-rail" tabindex="0" role="region" aria-label="Jogos da loja. Arraste para os lados ou use as setas do teclado.">\n'
    + tiles
    + "\n  </div>\n</section>"
) + s[j:]

# ---------- dúvidas: geradas a partir do faq.ts ----------
i = s.index('<div class="bfm-faq-b">')
j = s.index("</section>", i)
s = s[:i] + "<!--FAQ-->\n" + s[j:]

# ---------- fechamento e atendimento ----------
i = s.index('<section class="bfm-sec bfm-help"')
j = s.index("</section>", i) + len("</section>")
help_ = s[i:j]
hic = re.search(r'<span class="bfm-tile-ic">.*?</svg></span>', help_).group(0)
links = [
    ("https://lojasoccergames.com.br/central-de-atendimento/?utm_source=links&amp;utm_medium=black&amp;utm_content=black-central", "Entrega, ativação, licenças e garantia", "Central de Atendimento", ' target="_blank" rel="noopener"'),
    ("/", "Jogos de PS4 e PS5", "Ver os jogos", ""),
    ("https://wa.me/5518996366686?text=Ol%C3%A1!%20Vim%20pela%20p%C3%A1gina%20da%20Black%20da%20Soccer.", "Dúvida antes de comprar", "Falar no WhatsApp", ' target="_blank" rel="noopener"'),
]
items = "\n".join(
    f'    <a class="bfm-tile bfm-hl" href="{u}" data-t="Black: {t}"{x}><span class="bfm-tile-top"><span class="bfm-tile-i">{d}</span>{hic}</span><span class="bfm-tile-body"><span class="bfm-hl-t">{t}</span></span></a>'
    for u, d, t, x in links
)
s = s[:i] + (
    '<section class="bfm-sec bfm-help" aria-labelledby="bfm-help-h">\n'
    '  <div class="bfm-head bfm-head-sm"><span class="bfm-tag" id="bfm-help-h">Atendimento · segunda a sábado, das 9h às 21h · domingo, das 9h às 15h</span></div>\n'
    '  <div class="bfm-grid bfm-g3 bfm-glow">\n' + items + "\n  </div>\n</section>\n"
    '<footer class="bfm-foot">Soccer Games · lojasoccergames.com.br · GTA VI é marca da Rockstar Games</footer>'
) + s[j:]

# JSON-LD (a rota já tem o seu)
s = re.sub(r'<script type="application/ld\+json">.*?</script>\s*', "", s, flags=re.S)
rep('<span id="bfm-bt-l">para o Black November</span>', '<span id="bfm-bt-l">para o GTA 6</span>')

# ---------- separa estilo/marcação e scripts ----------
scripts = re.findall(r"<script>(.*?)</script>", s, flags=re.S)
markup = re.sub(r"<script>.*?</script>\s*", "", s, flags=re.S)
js = "\n;\n".join(scripts)


def jrep(a, b):
    global js
    if a not in js:
        raise SystemExit(f"JS NAO ACHEI: {a[:90]!r}")
    js = js.replace(a, b, 1)


# tamanhos -> plataformas: só PlayStation fica de pé
jrep(
    "else if(v==='sizes'){['P','M','G','GG','XG'].forEach(function(z,i){h+='<b class=\"'+(i===1?'vz-keep':'')+'\" style=\"--k:'+[0,4,1,3,2][i]+'\">'+z+'</b>'});",
    "else if(v==='sizes'){['PC','PS4','XBOX','PS5','NSW'].forEach(function(z,i){h+='<b class=\"'+(i===1||i===3?'vz-keep':'')+'\" style=\"--k:'+[0,0,1,0,2][i]+'\">'+z+'</b>'});",
)
# dias do CTA
jrep(
    "var OPEN=(Date.now()<new Date('2026-11-02T00:00:00-03:00').getTime()?new Date('2026-11-02T00:00:00-03:00'):new Date('2026-11-27T00:00:00-03:00')).getTime(),cd=document.getElementById('bfm-cta-d');",
    "var OPEN=window.SOCCER_BLACK.next().t,cd=document.getElementById('bfm-cta-d');",
)
# pausa de vídeo: o fundo agora é o player do YouTube
i = js.index("  /* vídeo: pausa quando o hero sai da tela")
k = js.index("  /* entrada suave */", i)
js = js[:i] + js[k:]

jrep("var GROUP_URL='https://chat.whatsapp.com/E1cuydknwI5DAh7NOBuqe3';", "var GROUP_URL=window.SOCCER_BLACK.groupUrl;")
jrep("var LEAD_ENDPOINT='https://ytyqwtqsvyrunzetfint.supabase.co/functions/v1/black-vip-lead';", "var LEAD_ENDPOINT='';")
i = js.index("  var START=new Date('2026-11-02T00:00:00-03:00')")
k = js.index("  var WORDS=", i)
js = js[:i] + (
    "  var NX=window.SOCCER_BLACK.next(),OPEN=new Date(NX.t);\n"
    "  (function(){var w=document.getElementById('bfm-when'),l=document.getElementById('bfm-bt-l');if(w)w.textContent=NX.when;if(l)l.textContent=NX.bar;})();\n"
) + js[k:]
jrep("var WORDS=['maior','melhor'];", "var WORDS=['GTA 6','PS5','PS4'];")
i = js.index("  var CLIPS=")
k = js.index("  var pad=function", i)
js = js[:i] + "  window.SOCCER_BLACK.reel(root);\n" + js[k:]
# selo: logo da Soccer e "Friday"
js = re.sub(
    r'<svg class="bs-logo" viewBox="0 0 198\.4 92" aria-label="MTS">.*?</svg>',
    '<img class="bs-logo bs-logo-sg" src="/logo-soccer.png" alt="Soccer Games">',
    js,
    count=1,
    flags=re.S,
)
jrep("<div class=\"bs-ln bs-long\"><b>November</b></div>", "<div class=\"bs-ln bs-long\"><b>Friday</b></div>")
# ics
i = js.index("    var ics=['BEGIN:VCALENDAR'")
k = js.index("a.download='black-november-mts.ics'", i)
js = js[:i] + "    var ics=window.SOCCER_BLACK.ics();\n    var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));" + js[k:]
js = js.replace("a.download='black-november-mts.ics'", "a.download='black-soccer-games-2026.ics'")
jrep("vid.pause();vid.removeAttribute('autoplay');", "")
jrep(
    "if(window.fbq)fbq('track','Lead',{content_name:'Grupo VIP Black 2026'},{eventID:eid});",
    "if(window.fbq)fbq('track','Lead',{content_name:'Grupo VIP Black 2026'},{eventID:eid});if(window.SOCCER_BLACK.lead)window.SOCCER_BLACK.lead(eid);",
)
js = js.replace("form_id:'black_vip_2026'", "form_id:'black_vip_2026'")
js = js.replace("'bf26-'+Date.now()", "'bn2026-'+Date.now()")

# CSS extra da Soccer
extra = """
/* Soccer: a página não tem o cabeçalho da loja por cima, então o topo ganha respiro */
#bfm-vip{--bfm-header-overlap:56px}
@media (max-width:900px){#bfm-vip{--bfm-header-overlap:8px}}
/* Soccer: logo no topo, selo com o SG, rodapé */
#bfm-vip .bfm-brandline{display:flex;align-items:center;gap:14px}
#bfm-vip .bfm-logo{display:block;width:40px;height:40px;flex:none}
#bfm-vip .bfm-logo img{display:block;width:100%;height:100%}
#bfm-vip .bs-logo-sg{width:6.6cqw!important;height:6.6cqw!important;object-fit:contain}
#bfm-vip .bfm-cc img:not([src]){visibility:hidden}
#bfm-vip .bfm-cc{background:linear-gradient(160deg,#1b0d26,#0b0910)}
#bfm-vip .bfm-foot{position:relative;z-index:1;padding:28px 24px 120px;text-align:center;font-size:11px;color:rgba(243,241,237,.42);background:#0c0c0c}
@media (min-width:901px){#bfm-vip .bfm-foot{padding-bottom:36px}}
#bfm-vip .vz-sz b{width:auto;min-width:52px;padding:0 12px}
"""
markup = markup.replace("</style>", extra + "</style>", 1)

open(f"{OUT}/landing.html", "w", encoding="utf-8").write(markup.strip() + "\n")
open(f"{OUT}/landing-engine.txt", "w", encoding="utf-8").write("/* Gerado de port.py a partir da landing da MTS. Não editar à mão sem atualizar o script. */\n" + js.strip() + "\n")
print("ok", len(markup), len(js))
