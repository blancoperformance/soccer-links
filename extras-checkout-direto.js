/* Soccer Games: sacola do links -> carrinho -> checkout com BIO1 (v7).
 * 1. Coloca cada jogo no carrinho pelo formulário nativo (POST /comprar/), um por vez.
 * 2. No carrinho: tenta aplicar o cupom BIO1 (se o tema tiver o campo) e clica em "Iniciar compra".
 * 3. No checkout: se o cupom ainda não entrou, preenche e aplica lá.
 * Só age em quem veio da sacola do links. Se algo falhar, a pessoa segue a compra normal.
 */
(function () {
  var COUPON = "BIO1";
  var KEY = "sg_queue", GO = "sg_go_checkout", CP = "sg_coupon";
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) {} }
  };
  var q = new URLSearchParams(location.search);
  var add = q.get("sg") === "1" ? q.get("sgadd") : null;

  var COUPON_INPUT = 'input[name="coupon"], input[name*="coupon" i], input[id*="coupon" i], input[placeholder*="upom"]';
  var fill = function (input) {
    var set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
    set.call(input, COUPON);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    var scope = input.closest("form") || input.parentElement && input.parentElement.parentElement || document;
    var btn = scope.querySelector('button, input[type="submit"]');
    if (btn) btn.click();
    else input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
  };

  // 3. Checkout: aplica o cupom se ainda estiver pendente
  if (/checkout/.test(location.pathname)) {
    if (ss.get(CP) !== "pending") return;
    var n = 0;
    var t3 = setInterval(function () {
      n++;
      var input = document.querySelector(COUPON_INPUT);
      if (input && !input.value) { clearInterval(t3); ss.set(CP, "done"); fill(input); }
      if (n > 40) clearInterval(t3);
    }, 500);
    return;
  }

  var queue = [];
  try {
    if (add) {
      queue = add.split(",").map(function (x) {
        var p = x.split("-");
        return { p: p[0], v: p[1], o: decodeURIComponent(p.slice(2).join("-") || "") };
      }).filter(function (x) { return /^\d+$/.test(x.p) && /^\d+$/.test(x.v); }).slice(0, 12);
      ss.set(GO, "1");
      ss.set(CP, "pending");
    } else {
      queue = JSON.parse(ss.get(KEY) || "[]");
    }
  } catch (e) { return; }

  if (!queue.length) {
    if (ss.get(GO) !== "1") return;
    ss.del(GO);
    var checkout = function () {
      var tries = 0;
      var t = setInterval(function () {
        tries++;
        var b = document.querySelector('[name="go_to_checkout"], .js-go-checkout-btn, [data-component="cart.checkout-button"]');
        if (b) { clearInterval(t); b.click(); return; }
        if (tries > 10) { clearInterval(t); location.replace("/comprar?go_to_checkout=1"); }
      }, 300);
    };
    // 2. Carrinho: tenta o cupom aqui antes de seguir
    var input = document.querySelector(COUPON_INPUT);
    if (input) {
      ss.set(CP, "done");
      fill(input);
      setTimeout(checkout, 2500);
    } else {
      checkout();
    }
    return;
  }

  // 1. Um jogo por vez no carrinho
  var item = queue.shift();
  ss.set(KEY, JSON.stringify(queue));
  var go = function () {
    var f = document.createElement("form");
    f.method = "post"; f.action = "/comprar/"; f.style.display = "none";
    var put = function (n, v) { var i = document.createElement("input"); i.type = "hidden"; i.name = n; i.value = v; f.appendChild(i); };
    put("add_to_cart", item.p);
    put("variant_id", item.v);
    if (item.o) put("variation[0]", item.o);
    put("quantity", "1");
    document.body.appendChild(f);
    f.submit();
  };
  if (document.body) go(); else document.addEventListener("DOMContentLoaded", go);
})();
