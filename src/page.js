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

// Duas curvas em velocidades diferentes separam os planos, em vez de a
// faixa inteira andar como um bloco só.
export function initWave() {
  const el = document.querySelector("[data-wave]");
  if (!el || reduced()) return;

  let rafId = null;
  let near = false;

  const update = () => {
    rafId = null;
    const rect = el.getBoundingClientRect();
    const span = window.innerHeight + rect.height;
    // -1 com a faixa inteira abaixo da dobra, 0 quando já saiu por cima.
    const p = Math.min(0, Math.max(-1, -1 + (window.innerHeight - rect.top) / span));
    el.style.setProperty("--p", p.toFixed(3));
  };

  const onScroll = () => {
    if (!near || rafId !== null) return;
    rafId = requestAnimationFrame(update);
  };

  // Só escuta enquanto a faixa está por perto: fora disso o paralaxe não
  // teria o que mostrar.
  new IntersectionObserver(
    ([entry]) => {
      near = entry.isIntersecting;
      if (near) update();
    },
    { rootMargin: "140px 0px" }
  ).observe(el);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
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
