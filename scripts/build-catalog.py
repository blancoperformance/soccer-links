# -*- coding: utf-8 -*-
"""
Gera src/features/public/games.json a partir do CSV exportado da Nuvemshop
(Produtos > Exportar, separador ponto e vírgula, codificação latin-1).

Uso:
  python3 scripts/build-catalog.py caminho/para/produtos.csv

O que vai para o site (por jogo): endereço (handle), nome limpo, plataforma, gêneros (das
categorias da loja), coleções (Lançamentos, Best Sellers, Sazonal PSN, Clássicos), tags,
licenças com o preço da planilha (só usado para ordenar e pontuar, o preço mostrado vem ao
vivo da loja), um resumo do texto do jogo e a ficha (idiomas, legendas, tamanho) quando a
própria página da loja informa.

Produtos criados por "duplicar" na Nuvemshop (endereço com "-copia") herdam tags e marca do
original e costumam estar errados. Para eles o script ignora tags e marca e usa só as
categorias, que são conferidas na hora de cadastrar.
"""
import csv, collections, html, json, re, sys, unicodedata, os
from datetime import date

SRC = sys.argv[1] if len(sys.argv) > 1 else "produtos.csv"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "features", "public", "games.json")

def fold(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")

def slugify(t):
    return re.sub(r"[^a-z0-9]+", "-", fold(t)).strip("-")

def read_rows(path):
    raw = open(path, "rb").read()
    for enc in ("utf-8-sig", "latin-1"):
        try:
            text = raw.decode(enc)
            break
        except UnicodeDecodeError:
            continue
    r = csv.reader(text.splitlines(True), delimiter=";")
    head = next(r)
    return head, list(r)

head, rows = read_rows(SRC)
I = {k: i for i, k in enumerate(head)}
col = lambda row, k: row[I[k]].strip() if k in I and I[k] < len(row) else ""

products = collections.OrderedDict()
for row in rows:
    h = col(row, "Identificador URL")
    if h:
        products.setdefault(h, []).append(row)

GENRES = {
    "acao": "Ação", "aventura": "Aventura", "tiro": "Tiro", "infantis": "Infantil",
    "corrida": "Corrida", "luta": "Luta", "terror": "Terror", "rpg": "RPG",
    "esporte": "Esportes", "faroeste": "Faroeste",
}
COLLECTION_OF = {
    "lancamentos": "lancamentos", "best sellers": "mais-vendidos", "sazonal psn": "sazonal",
    "oferta das criancas e classicos": "classicos",
}

def clean_name(n):
    n = re.sub(r"\((TM|R)\)|™|®", "", n, flags=re.I)
    n = re.sub(r"\s*[-–]\s*m[ií]dia digital", "", n, flags=re.I)
    n = re.sub(r"\s*m[ií]dia digital", "", n, flags=re.I)
    n = re.sub(r"\s*\((pr[eé][\s-]?venda)\)", r" (\1)", n, flags=re.I)
    n = re.sub(r"\s{2,}", " ", n).strip(" -")
    return n

def short_name(n):
    s = re.sub(r"\s+(para|para o)?\s*ps[45]( e ps[45])?\b.*$", "", n, flags=re.I)
    s = re.sub(r"\s*\(pr[eé][\s-]?venda\)", "", s, flags=re.I)
    s = re.sub(r"^pr[eé][\s-]?venda\s*", "", s, flags=re.I)
    return s.strip(" -") or n

def text_blocks(desc):
    d = desc
    cut = d.find("SEÇÃO 1")
    if cut > 0:
        d = d[:cut]
    parts = re.split(r"</(?:p|h\d|li|div)>|<br\s*/?>", d, flags=re.I)
    out = []
    for p in parts:
        t = html.unescape(re.sub(r"<[^>]+>", " ", p))
        t = re.sub(r"\*+", "", t)
        t = re.sub(r"\s+", " ", t).replace("\xa0", " ").strip(" -•")
        if t:
            out.append(t)
    return out

SPEC_KEYS = {"idiomas": "Idiomas", "idioma": "Idiomas", "legenda": "Legendas", "legendas": "Legendas",
             "tamanho": "Tamanho", "audio": "Áudio", "áudio": "Áudio", "dublagem": "Áudio"}

def parse(desc, name):
    blocks = text_blocks(desc)
    summary, specs, in_specs = [], {}, False
    sn = fold(short_name(name))
    for b in blocks:
        fb = fold(b)
        if fb.startswith("especifica") or fb.startswith("ficha tecnica"):
            in_specs = True
            continue
        m = re.match(r"^([A-Za-zÀ-ú ]{3,20}):\s*(.+)$", b)
        if m and fold(m.group(1).strip()) in {fold(k) for k in SPEC_KEYS}:
            in_specs = True
            key = SPEC_KEYS.get(fold(m.group(1).strip()), m.group(1).strip())
            val = re.sub(r"\s+", " ", m.group(2)).strip(" ,")
            if val and key not in specs and len(val) <= 160:
                specs[key] = val
            continue
        if in_specs:
            continue
        if len(b) < 40:
            # títulos repetidos do nome do jogo, "Mídia digital", etc.
            continue
        if fb.startswith(sn[:20]) and len(b) < 90:
            continue
        summary.append(b)
    text = " ".join(summary)
    if len(text) > 380:
        cut = text[:380]
        text = cut[: max(cut.rfind(". "), 220) + 1].strip()
    return text, specs

def license_key(v):
    f = fold(v)
    if f.startswith("prim"):
        return "primaria"
    if f.startswith("secund"):
        return "secundaria"
    return slugify(v) or "unica"

def num(v):
    try:
        return round(float(v.replace(",", ".")), 2)
    except ValueError:
        return None

games = []
for handle, vs in products.items():
    first = vs[0]
    name_raw = col(first, "Nome")
    if not name_raw or fold(name_raw).strip() in {"brinde"}:
        continue
    if col(first, "Exibir na loja").upper() not in {"SIM", "S", "YES"}:
        continue
    copied = "-copia" in handle
    name = clean_name(name_raw)
    cats = [c.strip() for c in col(first, "Categorias").split(",") if c.strip()]
    fname = fold(name_raw) + " " + fold(handle)
    plats = set()
    for src in (fold(name_raw), fold(handle).replace("-", " ")):  # nome primeiro, depois o endereço
        if re.search(r"\bps5\b", src): plats.add("PS5")
        if re.search(r"\bps4\b", src): plats.add("PS4")
        if plats:
            break
    # O nome manda (ex.: "... para PS5"). Categoria só quando o nome não diz a plataforma,
    # porque cadastros copiados às vezes ficam nas categorias de PS4 e de PS5 ao mesmo tempo.
    if not plats:
        for c in cats:
            if fold(c).startswith("playstation 5"): plats.add("PS5")
            if fold(c).startswith("playstation 4"): plats.add("PS4")
    genres, colls = [], []
    for c in cats:
        leaf = fold(c.split(">")[-1].strip())
        if ">" in c and leaf in GENRES and GENRES[leaf] not in genres:
            genres.append(GENRES[leaf])
        if fold(c) in COLLECTION_OF:
            colls.append(COLLECTION_OF[fold(c)])
    if re.search(r"pr[eé][\s-]?venda", fname):
        colls.append("pre-venda")
    tags = []
    if not copied:
        for t in col(first, "Tags").split(","):
            ft = slugify(t)
            if ft and ft not in {"soccer-games", "digital", "midia-digital", "ps4", "ps5", "playstation"} and ft not in tags:
                tags.append(ft)
    licenses = []
    for v in vs:
        val = col(v, "Valor da variação 1") or "Única"
        price, promo = num(col(v, "Preço")), num(col(v, "Preço promocional"))
        stock = col(v, "Estoque")
        licenses.append({
            "key": license_key(val),
            "label": val.strip().capitalize() if val.isupper() else val.strip(),
            "price": promo if promo else price,
            "from": price if promo and price and promo < price else None,
            "out": stock == "0",
        })
    summary, specs = parse(col(first, "Descrição"), name_raw)
    if copied:
        specs = {}
    kind = "jogo"
    if re.search(r"assinatura|psn[\s-]?plus|ps[\s-]?plus", fname):
        kind = "assinatura"
    elif re.search(r"caixa[\s-]misteriosa|combo|kit-de-jogos", fname) or len(licenses) > 2:
        kind = "combo"
    games.append({
        "slug": handle,
        "kind": kind,
        "name": name,
        "short": short_name(name),
        "platforms": sorted(plats, reverse=True),
        "genres": genres,
        "collections": sorted(set(colls)),
        "tags": tags[:24],
        "brand": "" if copied else col(first, "Marca"),
        "licenses": licenses,
        "summary": summary,
        "specs": specs,
        "checked": not copied,
    })

out = {"syncedAt": date.today().isoformat(), "source": os.path.basename(SRC), "count": len(games), "games": games}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(games)} jogos -> {os.path.relpath(OUT)} ({os.path.getsize(OUT)//1024} KB)")
print("sem plataforma:", [g["slug"] for g in games if not g["platforms"]])
print("sem gênero:", [g["slug"] for g in games if not g["genres"]])
print("sem resumo:", [g["slug"] for g in games if not g["summary"]])
print("copiados (tags ignoradas):", sum(1 for g in games if not g["checked"]))
