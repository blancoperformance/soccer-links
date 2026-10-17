/* Soccer Games: checkout direto vindo do links (v1, precisa de teste na loja).
 * O links abre o produto com ?variant=ID&sg=1. Este script:
 *  1. na página do produto: escolhe a licença, adiciona ao carrinho pelo formulário do próprio tema;
 *  2. no carrinho: clica em "Iniciar compra";
 *  3. no checkout: aplica o cupom BIO1.
 * Se qualquer passo falhar, não faz nada e a pessoa segue normalmente pela loja.
 */
(function () {
  var KEY = "sg_bio";
  var COUPON = "BIO1";
  var q = new URLSearchParams(location.search);
  try {
    if (q.get("sg") === "1") sessionStorage.setItem(KEY, "1");
  } catch (e) {}
  var fromBio = false;
  try {
    fromBio = sessionStorage.getItem(KEY) === "1";
  } catch (e) {}
  if (!fromBio) return;

  var path = location.pathname;
  var once = function (k) {
    try {
      if (sessionStorage.getItem(k)) return false;
      sessionStorage.setItem(k, "1");
    } catch (e) {}
    return true;
  };

  // 1. Produto
  if (/^\/produtos\//.test(path) && q.get("sg") === "1") {
    var variant = q.get("variant");
    var form = document.querySelector('form[action*="comprar"], form.js-product-form, #product_form');
    if (!form || !variant || !once("sg_add_" + variant)) return;
    // escolhe a licença: alguns temas usam um campo com o id da variante, outros um select
    var field = form.querySelector('[name="variant_id"], [name="add_to_cart_enhanced"]');
    if (field) field.value = variant;
    var data = new FormData(form);
    if (!field) data.set("variant_id", variant);
    fetch(form.action || "/comprar/", { method: "POST", body: data, credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("add");
        location.href = "/comprar/";
      })
      .catch(function () {
        /* deixa a pessoa clicar em Comprar normalmente */
      });
    return;
  }

  // 2. Carrinho: inicia a compra
  if (/^\/comprar\/?$/.test(path) && once("sg_cart")) {
    var go = function () {
      var b = document.querySelector(
        '[name="go_to_checkout"], .js-go-checkout-btn, a[href*="checkout"], button[type="submit"][value*="ompra"]',
      );
      if (b) b.click();
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go);
    else setTimeout(go, 300);
    return;
  }

  // 3. Checkout: aplica o BIO1 se o campo de cupom existir
  if (/checkout/.test(path) && once("sg_coupon")) {
    var tries = 0;
    var t = setInterval(function () {
      tries++;
      var input = document.querySelector('input[name*="coupon" i], input[id*="coupon" i], input[placeholder*="upom"]');
      if (input) {
        clearInterval(t);
        var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        set.call(input, COUPON);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        var btn = input.closest("form") && input.closest("form").querySelector("button");
        if (btn) btn.click();
      }
      if (tries > 30) clearInterval(t);
    }, 500);
  }
})();
