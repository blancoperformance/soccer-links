/* Soccer Games: links -> carrinho da loja (v2, precisa de teste na loja).
 * O links manda para /comprar/?sg=1&sgadd=PRODUTO-LICENCA,PRODUTO-LICENCA (um ou vários jogos).
 * Este script coloca cada licença no carrinho e recarrega o carrinho limpo, onde o cross-sell
 * da loja continua aparecendo. Não pula o carrinho: quem quer levar mais de um jogo segue livre.
 * Se algo falhar, a pessoa cai no carrinho normal da loja.
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

  var list = add
    .split(",")
    .map(function (x) {
      var p = x.split("-");
      return { product: p[0], variant: p[1] };
    })
    .filter(function (x) {
      return /^\d+$/.test(x.product) && /^\d+$/.test(x.variant);
    })
    .slice(0, 12);

  var post = function (item) {
    var f = new FormData();
    f.append("add_to_cart", item.product);
    f.append("variant_id", item.variant);
    f.append("quantity", "1");
    return fetch("/comprar/", { method: "POST", body: f, credentials: "same-origin" });
  };

  var clean = function () {
    // mantém as UTMs para o Analytics, tira só os parâmetros do script
    q.delete("sgadd");
    q.delete("sg");
    var rest = q.toString();
    location.replace("/comprar/" + (rest ? "?" + rest : ""));
  };

  list
    .reduce(function (chain, item) {
      return chain.then(function () {
        return post(item).catch(function () {});
      });
    }, Promise.resolve())
    .then(clean, clean);
})();
