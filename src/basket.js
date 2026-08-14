const WHATSAPP = "5567991105206";
const FULL = 15;
const BULK = 12;
// A regra da casa: 10 ou mais DO MESMO sabor saem a 12. O desconto é por
// sabor, então somar sabores diferentes não alcança a promoção.
const BULK_FROM = 10;

const money = (v) => `R$ ${String(v).replace(".", ",")}`;
const unitFor = (qty) => (qty >= BULK_FROM ? BULK : FULL);

export function initBasket() {
  const root = document.querySelector("[data-basket]");
  const list = document.querySelector("[data-basket-list]");
  const totalEl = document.querySelector("[data-basket-total]");
  const hintEl = document.querySelector("[data-basket-hint]");
  const sendEl = document.querySelector("[data-basket-send]");
  if (!root || !list) return;

  const items = new Map();

  function totals() {
    let count = 0;
    let total = 0;
    // Cada sabor tem o seu preço unitário, decidido pela própria
    // quantidade: por isso o total é somado linha a linha.
    items.forEach((qty) => {
      count += qty;
      total += qty * unitFor(qty);
    });
    return { count, total };
  }

  function message({ count, total }) {
    const lines = [];
    items.forEach((qty, name) => {
      const unit = unitFor(qty);
      lines.push(`${qty}x ${name} (${money(unit)} cada) = ${money(qty * unit)}`);
    });
    return `Oi Julia! Quero encomendar:\n${lines.join("\n")}\n\n${count} ${
      count === 1 ? "pacote" : "pacotes"
    } no total: ${money(total)}`;
  }

  function change(name, delta) {
    const next = (items.get(name) || 0) + delta;
    if (next <= 0) items.delete(name);
    else items.set(name, next);
    render();
  }

  function row(name, qty) {
    const unit = unitFor(qty);
    const li = document.createElement("li");
    li.className = "basket-item";

    const label = document.createElement("span");
    label.className = "basket-item-name";
    label.textContent = name;

    // O preço aparece por linha porque muda por sabor: sem isso o total
    // pareceria sair do nada.
    const price = document.createElement("span");
    price.className = `basket-item-unit${unit === BULK ? " is-bulk" : ""}`;
    price.textContent = `${money(unit)} cada`;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const minus = document.createElement("button");
    minus.type = "button";
    minus.textContent = "−";
    minus.setAttribute("aria-label", `Tirar um pacote de ${name}`);
    minus.addEventListener("click", () => change(name, -1));

    const out = document.createElement("output");
    out.textContent = qty;
    out.setAttribute("aria-label", `${qty} de ${name}`);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Mais um pacote de ${name}`);
    plus.addEventListener("click", () => change(name, 1));

    stepper.append(minus, out, plus);
    li.append(label, price, stepper);
    return li;
  }

  function render() {
    if (!items.size) {
      root.hidden = true;
      return;
    }
    root.hidden = false;

    list.textContent = "";
    items.forEach((qty, name) => list.append(row(name, qty)));

    const t = totals();
    totalEl.textContent = money(t.total);

    // A dica aponta o sabor mais perto de fechar os 10, que é onde somar
    // mais um vale alguma coisa.
    let closest = null;
    items.forEach((qty, name) => {
      if (qty >= BULK_FROM) return;
      if (!closest || qty > closest.qty) closest = { name, qty };
    });
    hintEl.textContent = closest
      ? `Mais ${BULK_FROM - closest.qty} de ${closest.name} e esse sai a ${money(BULK)} cada`
      : "Desconto aplicado";

    sendEl.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message(t))}`;
  }

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const name = btn.dataset.add;
      const first = items.size === 0;
      change(name, 1);
      // No primeiro item, leva o visitante até a cesta que acabou de
      // nascer: senão ela aparece fora da vista e o gesto parece não ter
      // feito nada.
      if (first) {
        requestAnimationFrame(() =>
          root.scrollIntoView({ behavior: "smooth", block: "nearest" })
        );
      }
    });
  });

  render();
}
