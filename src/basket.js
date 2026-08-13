const WHATSAPP = "5567991105206";
const PRICE_FULL = 15;
const PRICE_BULK = 12;
// A regra da casa: 10 ou mais DO MESMO SABOR saem a 12 cada. O desconto
// e' por sabor, entao somar sabores diferentes nao alcanca a promocao.
const BULK_FROM = 10;

const money = (v) => "R$ " + v.toString().replace(".", ",");
const unitFor = (qty) => (qty >= BULK_FROM ? PRICE_BULK : PRICE_FULL);

export function initBasket() {
  const root = document.querySelector("[data-basket]");
  const list = document.querySelector("[data-basket-list]");
  const totalEl = document.querySelector("[data-basket-total]");
  const noteEl = document.querySelector("[data-basket-note]");
  const sendEl = document.querySelector("[data-basket-send]");
  if (!root || !list) return;

  const items = new Map();

  function totals() {
    let count = 0;
    let total = 0;
    let discounted = 0;
    // Cada sabor tem o seu proprio preco unitario, decidido pela propria
    // quantidade — por isso o total e' somado linha a linha.
    items.forEach((qty) => {
      count += qty;
      total += qty * unitFor(qty);
      if (qty >= BULK_FROM) discounted++;
    });
    return { count, total, discounted };
  }

  function message({ count, total }) {
    const lines = [];
    items.forEach((qty, name) => {
      const unit = unitFor(qty);
      lines.push(`${qty}x ${name} (${money(unit)} cada) = ${money(qty * unit)}`);
    });
    return (
      "Oi Julia! Quero encomendar:\n" +
      lines.join("\n") +
      `\n\n${count} ${count === 1 ? "pacote" : "pacotes"} no total: ${money(total)}`
    );
  }

  function render() {
    if (items.size === 0) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    list.textContent = "";
    items.forEach((qty, name) => {
      const li = document.createElement("li");
      li.className = "basket-item";

      const unit = unitFor(qty);
      const label = document.createElement("span");
      label.className = "basket-item-name";
      label.textContent = name;

      // O preço fica visível por linha porque ele muda por sabor: sem
      // isso o total pareceria sair do nada.
      const sub = document.createElement("span");
      sub.className = "basket-item-sub" + (unit === PRICE_BULK ? " is-bulk" : "");
      sub.textContent = `${money(unit)} cada`;
      if (unit === PRICE_BULK) sub.title = `10 ou mais de ${name}`;

      const qtyBox = document.createElement("div");
      qtyBox.className = "basket-qty";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute("aria-label", `Tirar um pacote de ${name}`);
      minus.addEventListener("click", () => change(name, -1));

      const count = document.createElement("span");
      count.textContent = qty;

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute("aria-label", `Mais um pacote de ${name}`);
      plus.addEventListener("click", () => change(name, 1));

      qtyBox.append(minus, count, plus);
      li.append(label, sub, qtyBox);
      list.append(li);
    });

    const t = totals();
    totalEl.textContent = money(t.total);

    // A dica aponta o sabor que está mais perto de fechar os 10, porque
    // é ali que o visitante ganha alguma coisa somando mais um.
    let closest = null;
    items.forEach((qty, name) => {
      if (qty >= BULK_FROM) return;
      if (!closest || qty > closest.qty) closest = { name, qty };
    });

    if (closest) {
      const missing = BULK_FROM - closest.qty;
      noteEl.textContent = `Mais ${missing} de ${closest.name} e esse sai a ${money(PRICE_BULK)} cada`;
    } else {
      noteEl.textContent = `Desconto aplicado em ${t.discounted} ${t.discounted === 1 ? "sabor" : "sabores"}`;
    }

    sendEl.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message(t))}`;
  }

  function change(name, delta) {
    const next = (items.get(name) || 0) + delta;
    if (next <= 0) items.delete(name);
    else items.set(name, next);
    render();
  }

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      change(btn.dataset.add, 1);
      // Primeiro item: leva o visitante ate' a cesta que acabou de nascer,
      // senao ela aparece fora da vista e o gesto parece nao ter feito nada.
      if (items.size === 1 && items.get(btn.dataset.add) === 1) {
        requestAnimationFrame(() =>
          root.scrollIntoView({ behavior: "smooth", block: "nearest" })
        );
      }
    });
  });

  render();
}
