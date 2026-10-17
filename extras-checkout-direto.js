/* Soccer Games: sacola do links -> carrinho da loja (v5).
 * Faz igual aos apps de "compre junto" da loja: envia o formulário nativo de compra
 * (POST /comprar/ com add_to_cart), um jogo por vez. A fila fica no sessionStorage
 * e continua sozinha a cada recarga do carrinho. No fim, vai direto para o checkout.
 * Só age em quem veio da sacola do links.
 */
(function () {
  var KEY = "sg_queue";
  var GO = "sg_go_checkout";
  var q = new URLSearchParams(location.search);
  var add = q.get("sg") === "1" ? q.get("sgadd") : null;
  var queue = [];
  try {
    if (add) {
      queue = add.split(",").map(function (x) {
        var p = x.split("-");
        return { p: p[0], v: p[1], o: decodeURIComponent(p.slice(2).join("-") || "") };
      }).filter(function (x) { return /^\d+$/.test(x.p) && /^\d+$/.test(x.v); }).slice(0, 12);
    } else {
      queue = JSON.parse(sessionStorage.getItem(KEY) || "[]");
    }
  } catch (e) { return; }
  if (add) { try { sessionStorage.setItem(GO, "1"); } catch (e) {} }
  if (!queue.length) {
    var go2 = false;
    try { go2 = sessionStorage.getItem(GO) === "1"; sessionStorage.removeItem(GO); } catch (e) {}
    if (go2) location.replace("/comprar?go_to_checkout=1");
    return;
  }
  var item = queue.shift();
  try { sessionStorage.setItem(KEY, JSON.stringify(queue)); } catch (e) { return; }

  var go = function () {
    var f = document.createElement("form");
    f.method = "post";
    f.action = "/comprar/";
    f.style.display = "none";
    var put = function (n, v) {
      var i = document.createElement("input");
      i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i);
    };
    put("add_to_cart", item.p);
    put("variant_id", item.v);
    if (item.o) put("variation[0]", item.o);
    put("quantity", "1");
    document.body.appendChild(f);
    f.submit();
  };
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
})();
