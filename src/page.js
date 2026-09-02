// Comportamentos da página abaixo do hero: entradas, o fio dos passos, a
// barra do celular, o paralaxe da onda e a borda do topo.

const STAGGER = 80;
const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Irmãos que entram juntos chegam em sequência, não em bloco. O atraso é
// retirado quando a entrada acaba: se ficasse, todo hover posterior nesses
// elementos herdaria ele e pareceria travado.
export function initReveals() {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const siblings = el.parentElement
          ? [...el.parentElement.querySelectorAll(":scope > .reveal")]
          : [el];
        const delay = Math.max(0, siblings.indexOf(el)) * STAGGER;

        el.style.transitionDelay = `${delay}ms`;
        el.classList.add("is-in");
        el.addEventListener("transitionend", () => {
          el.style.transitionDelay = "";
        }, { once: true });
        io.unobserve(el);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
}

// O fio que costura os passos se desenha quando a seção entra.
export function initSteps() {
  const steps = document.querySelector("[data-steps]");
  if (!steps) return;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      steps.classList.add("is-drawn");
      io.disconnect();
    },
    { threshold: 0.2 }
  );
  io.observe(steps);
}

// A borda do topo só aparece depois que a página sai do lugar.
export function initTopbar() {
  const bar = document.querySelector("[data-topbar]");
  if (!bar) return;
  const sentinel = document.createElement("div");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px";
  document.body.prepend(sentinel);
  new IntersectionObserver(
    ([entry]) => bar.classList.toggle("is-stuck", !entry.isIntersecting)
  ).observe(sentinel);
}

// Marca a aba da seção que está na tela.
export function initTabbar() {
  const tabs = [...document.querySelectorAll("[data-tab]")];
  if (!tabs.length) return;

  const targets = tabs
    .map((tab) => ({ tab, el: document.getElementById(tab.dataset.tab) }))
    .filter((t) => t.el);

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const hit = targets.find((t) => t.el === entry.target);
        if (hit) tabs.forEach((t) => t.classList.toggle("is-active", t === hit.tab));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );

  targets.forEach((t) => io.observe(t.el));
  tabs[0]?.classList.add("is-active");
}

// O brilho do botão nasce onde o cursor entrou.
export function initButtons() {
  document.querySelectorAll(".btn").forEach((btn) => {
    btn.addEventListener("pointermove", (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty("--mx", `${e.clientX - r.left}px`);
      btn.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

// ====================== as três figuras da Ju ======================
//
// São vídeos em vai-e-volta: cada arquivo tem a ida seguida da volta, então
// o último quadro do ciclo é igual ao primeiro e o loop não dá tranco.
// Procurei emenda natural nos três antes de recorrer a isso — a melhor que
// existia ainda diferia 2,4 vezes o ruído entre quadros vizinhos, ou seja,
// saltaria à vista.
//
// Loop infinito custa bateria, e são três na mesma página. Por isso nenhum
// deles roda fora da tela nem com a aba escondida.

const reduzMovimento = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Liga e desliga conforme entra e sai da vista. `pronto` existe porque os
// recortes só podem tocar depois de provarem que a transparência sobreviveu.
function rodarNaTela(alvo, video, pronto = () => true) {
  let naTela = false;
  const sincroniza = () => {
    if (!pronto()) return;
    // Autoplay recusado (aba em segundo plano, economia de bateria) não é
    // erro: o quadro que está lá continua lá.
    if (naTela && !document.hidden) video.play().catch(() => {});
    else video.pause();
  };
  new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        naTela = e.isIntersecting;
      });
      sincroniza();
    },
    { threshold: 0.2 }
  ).observe(alvo);
  document.addEventListener("visibilitychange", sincroniza);
  return sincroniza;
}

// Dois dos três são recortes com canal alfa. Nem todo navegador decodifica
// esse canal, e onde não decodifica a figura viria dentro de um retângulo
// opaco — pior do que não animar. Um quadro num canvas de 4x4 responde isso
// antes de qualquer coisa aparecer: o canto do vídeo é fundo recortado, então
// alfa alto ali significa que a transparência se perdeu no caminho.
function transparenciaChegou(video) {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 4;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, 4, 4);
    ctx.drawImage(video, 0, 0, 4, 4, 0, 0, 4, 4);
    return ctx.getImageData(0, 0, 1, 1).data[3] < 32;
  } catch {
    // Canvas bloqueado é motivo de sobra para ficar na imagem parada.
    return false;
  }
}

// Um observador só: a primeira aparição baixa o vídeo e confere o alfa; dali
// em diante ele apenas liga e desliga.
function observarRecorte(alvo, still, video) {
  if (!alvo || !still || !video || reduzMovimento()) return;
  let pronto = false;
  const sincroniza = rodarNaTela(alvo, video, () => pronto);

  const prepara = () => {
    if (video.dataset.pedido) return;
    video.dataset.pedido = "1";
    video.addEventListener(
      "loadeddata",
      () => {
        if (!transparenciaChegou(video)) return; // fica na imagem parada
        still.hidden = true;
        video.hidden = false;
        pronto = true;
        sincroniza();
      },
      { once: true }
    );
    // preload="none" adiou o download até aqui.
    video.load();
  };

  new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) prepara();
      });
    },
    { threshold: 0.2 }
  ).observe(alvo);
}

// O hero deixou de ter vídeo: virou foto parada com o açúcar em CSS. A
// função que dava play nele saiu junto — ficaria procurando um elemento
// que não existe mais. Está em b2c5f8a se um dia o vídeo voltar.

// O medalhão de "Quem faz" saiu com a chegada da foto real da Julia, e a
// função que o tocava saiu junto — ficaria procurando um elemento que não
// existe mais. Está em e4f1a13 se um dia o desenho voltar para lá.

// O aceno do rodapé.
export function initAceno() {
  const caixa = document.querySelector("[data-aceno]");
  if (!caixa) return;
  observarRecorte(
    caixa,
    caixa.querySelector(".aceno-still"),
    caixa.querySelector(".aceno-video")
  );
}

// A bandeja: aparece junto com a cesta, que só nasce quando o primeiro sabor
// entra. Não é rolagem que a traz — é o gesto de escolher. Daí observar o
// atributo hidden da cesta; a rolagem só decide se ela está rodando ou não.
export function initBandeja() {
  const bandeja = document.querySelector("[data-bandeja]");
  const cesta = document.querySelector("[data-basket]");
  if (!bandeja || !cesta) return;

  const sincroniza = () => {
    bandeja.hidden = cesta.hidden;
  };
  new MutationObserver(sincroniza).observe(cesta, {
    attributes: true,
    attributeFilter: ["hidden"],
  });
  // A cesta pode já vir preenchida de uma visita anterior.
  sincroniza();

  observarRecorte(
    bandeja,
    bandeja.querySelector(".bandeja-still"),
    bandeja.querySelector(".bandeja-video")
  );
}
