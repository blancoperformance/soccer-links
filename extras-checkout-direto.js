/* Soccer Games: sacola do links -> carrinho da loja (v3).
 * O links manda para /comprar/?sg=1&sgadd=PRODUTO-LICENCA-OPCAO,... Este script coloca cada
 * licença no carrinho do mesmo jeito que o botão Comprar do tema (add_to_cart + variation[0])
 * e recarrega o carrinho. Se algo falhar, a pessoa fica no carrinho normal da loja.
 */
(function () {
  var q = new URLSearchParams(location.search);
  var add = q.get("sgadd");
  if (!add || q.get("sg") !== "1") return;
  var done = "sg_done_" + add;
  try {
    if (sessionStorage.getItem(done)) return;
    sessionStorage.setItem(done, "1");
  } catch (e) {}

  var list = add.split(",").map(function (x) {
    var p = x.split("-");
    return { product: p[0], variant: p[1], option: decodeURIComponent(p.slice(2).join("-") || "") };
  }).filter(function (x) {
    return /^\d+$/.test(x.product) && /^\d+$/.test(x.variant);
  }).slice(0, 12);

  var post = function (item) {
    var f = new URLSearchParams();
    f.append("add_to_cart", item.product);
    f.append("add_to_cart_enhanced", "1");
    if (item.option) f.append("variation[0]", item.option);
    f.append("variant_id", item.variant);
    f.append("quantity", "1");
    return fetch("/comprar/", {
      method: "POST",
      body: f,
      credentials: "same-origin",
      headers: { "X-Requested-With": "XMLHttpRequest" },
    });
  };

  var clean = function () {
    q.delete("sgadd");
    q.delete("sg");
    var rest = q.toString();
    location.replace("/comprar/" + (rest ? "?" + rest : ""));
  };

  list.reduce(function (chain, item) {
    return chain.then(function () { return post(item).catch(function () {}); });
  }, Promise.resolve()).then(clean, clean);
})();
