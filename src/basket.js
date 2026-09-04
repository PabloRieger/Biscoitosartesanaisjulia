const WHATSAPP = "5567991105206";
// O site não publica preço. A cesta serve para montar a lista de potes; o
// valor a Julia passa na conversa, onde ela pode considerar a quantidade e
// a data. Por isso aqui não há tabela nem soma — só contagem.

// A unidade de venda é o pote de 500 ml.
const potes = (n) => `${n} ${n === 1 ? "pote" : "potes"}`;

export function initBasket() {
  const root = document.querySelector("[data-basket]");
  const list = document.querySelector("[data-basket-list]");
  const countEl = document.querySelector("[data-basket-count]");
  const badgeEl = document.querySelector("[data-basket-badge]");
  const toggleEl = document.querySelector("[data-basket-toggle]");
  const verEl = document.querySelector("[data-basket-ver]");
  // O link do WhatsApp aparece em três lugares, contando o botão da barra
  // de cima. Todos precisam mandar o mesmo pedido, então é lista, não
  // elemento único.
  const sendEls = document.querySelectorAll("[data-basket-send]");
  if (!root || !list) return;

  // O convite sem pedido, que já vem escrito no href do botão da barra de
  // cima. Guardado aqui para os links voltarem a ele quando a cesta esvazia:
  // sem isso eles ficavam congelados no último pedido, e um sabor que a
  // pessoa tirou da cesta ainda chegava para a Julia.
  const CONVITE =
    [...sendEls]
      .map((a) => a.getAttribute("href"))
      .find((h) => h && h.startsWith("https://wa.me/")) || "#";

  const items = new Map();

  function contar() {
    let count = 0;
    items.forEach((qty) => (count += qty));
    return count;
  }

  // A mensagem termina perguntando o valor. Sem preço na página, é a
  // primeira coisa que a pessoa ia querer saber, e assim ela já chega
  // perguntada — a Julia responde de uma vez em vez de trocar duas
  // mensagens só para chegar na pergunta.
  function message(count) {
    const lines = [];
    items.forEach((qty, name) => {
      lines.push(`${qty}x ${name}`);
    });
    return `Oi Julia! Quero encomendar:\n${lines.join("\n")}\n\n${potes(
      count
    )} no total. Quanto fica?`;
  }

  function change(name, delta) {
    const next = (items.get(name) || 0) + delta;
    if (next <= 0) items.delete(name);
    else items.set(name, next);
    render();
  }

  function row(name, qty) {
    const li = document.createElement("li");
    li.className = "basket-item";

    const label = document.createElement("span");
    label.className = "basket-item-name";
    label.textContent = name;

    const stepper = document.createElement("div");
    stepper.className = "stepper";

    const minus = document.createElement("button");
    minus.type = "button";
    // Com um só no pedido, a próxima tocada não tira uma unidade: apaga o
    // sabor da lista. O "−" não avisava isso; a lixeira avisa.
    if (qty === 1) {
      minus.className = "is-remove";
      minus.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
        'aria-hidden="true"><path d="M4 7h16" /><path d="M10 11v6M14 11v6" />' +
        '<path d="M6 7l1 13h10l1-13" />' +
        '<path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>';
      minus.setAttribute("aria-label", `Tirar ${name} do pedido`);
    } else {
      minus.textContent = "−";
      minus.setAttribute("aria-label", `Tirar um pote de ${name}`);
    }
    minus.addEventListener("click", () => change(name, -1));

    const out = document.createElement("output");
    out.textContent = qty;
    out.setAttribute("aria-label", `${qty} de ${name}`);

    const plus = document.createElement("button");
    plus.type = "button";
    plus.textContent = "+";
    plus.setAttribute("aria-label", `Mais um pote de ${name}`);
    plus.addEventListener("click", () => change(name, 1));

    stepper.append(minus, out, plus);
    li.append(label, stepper);
    return li;
  }

  function render() {
    if (!items.size) {
      root.hidden = true;
      // A cesta esvaziou: o detalhe do celular não pode ficar aberto sobre
      // nada, e o contador da barra de cima volta a sumir.
      fechar();
      if (badgeEl) badgeEl.hidden = true;
      // E os links voltam ao convite. Esta linha faltava: o botão da barra
      // de cima seguia mandando o pedido que a pessoa acabara de apagar.
      sendEls.forEach((el) => (el.href = CONVITE));
      return;
    }
    root.hidden = false;

    list.textContent = "";
    items.forEach((qty, name) => list.append(row(name, qty)));

    const count = contar();

    // "3 potes, 2 sabores" — sem o total, esta linha virou o resumo inteiro
    // da barra do celular, então precisa caber sozinha numa tela de 360px.
    if (countEl) {
      const sabores = `${items.size} ${items.size === 1 ? "sabor" : "sabores"}`;
      countEl.textContent = `${potes(count)}, ${sabores}`;
    }
    if (badgeEl) {
      badgeEl.hidden = false;
      badgeEl.textContent = count;
      badgeEl.setAttribute("aria-label", `${count} no pedido`);
    }

    // A dica que vivia aqui apontava o sabor mais perto de fechar os 10 do
    // desconto. Sem desconto, ela não tem o que dizer.

    const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message(count))}`;
    sendEls.forEach((el) => (el.href = href));
  }

  // O detalhe do celular. No desktop o CSS mantém o corpo sempre visível e
  // esconde o botão, então este estado simplesmente não é consultado lá.
  function fechar() {
    root.removeAttribute("data-aberto");
    if (toggleEl) toggleEl.setAttribute("aria-expanded", "false");
    if (verEl) verEl.textContent = "ver";
  }
  if (toggleEl) {
    toggleEl.addEventListener("click", () => {
      const aberto = root.hasAttribute("data-aberto");
      if (aberto) return fechar();
      root.setAttribute("data-aberto", "");
      toggleEl.setAttribute("aria-expanded", "true");
      if (verEl) verEl.textContent = "fechar";
    });
  }

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => change(btn.dataset.add, 1));
  });
  // Antes, o primeiro item rolava a página até a cesta. Com ela sempre à
  // vista — trilho no desktop, barra fixa no celular — isso virou incômodo:
  // arrancava a pessoa do produto que ela estava olhando.

  render();
}
