const WHATSAPP = "5567991105206";
const PRICE_FULL = 15;
const PRICE_BULK = 12;
// A regra da casa: a partir de 15 unidades, cada pacote sai por 12.
const BULK_FROM = 15;

const money = (v) => "R$ " + v.toString().replace(".", ",");

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
    items.forEach((qty) => (count += qty));
    const unit = count >= BULK_FROM ? PRICE_BULK : PRICE_FULL;
    return { count, unit, total: count * unit };
  }

  function message({ count, unit, total }) {
    const lines = [];
    items.forEach((qty, name) => lines.push(`${qty}x ${name}`));
    return (
      "Oi Julia! Quero encomendar:\n" +
      lines.join("\n") +
      `\n\nTotal: ${count} ${count === 1 ? "pacote" : "pacotes"}` +
      ` x ${money(unit)} = ${money(total)}`
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

      const label = document.createElement("span");
      label.className = "basket-item-name";
      label.textContent = name;

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
      li.append(label, qtyBox);
      list.append(li);
    });

    const t = totals();
    totalEl.textContent = money(t.total);
    noteEl.textContent =
      t.count >= BULK_FROM
        ? `${t.count} pacotes, ${money(PRICE_BULK)} cada`
        : `Faltam ${BULK_FROM - t.count} para pagar ${money(PRICE_BULK)} cada`;
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
