import { initHeroScroll } from "./hero-scroll.js";
import { runPreloader } from "./preloader.js";
import { initChatDemo } from "./chat-demo.js";
import { initRipple } from "./ripple.js";
import { initBottomNav } from "./bottom-nav.js";
import { initBasket } from "./basket.js";

const hero = initHeroScroll();
runPreloader(hero);
initChatDemo();
initRipple();
initBottomNav();
initBasket();

const STAGGER_MS = 90;

// Irmaos que entram juntos chegam em sequencia, nao em bloco. O atraso e'
// inline e some quando a entrada acaba: se ficasse, todo hover posterior
// nesses elementos herdaria o atraso e pareceria travado.
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const group = el.parentElement;
      const siblings = group
        ? [...group.querySelectorAll(":scope > .reveal")]
        : [el];
      const index = Math.max(0, siblings.indexOf(el));
      const delay = index * STAGGER_MS;

      el.style.transitionDelay = `${delay}ms`;
      el.classList.add("is-visible");
      el.addEventListener(
        "transitionend",
        () => {
          el.style.transitionDelay = "";
        },
        { once: true }
      );
      observer.unobserve(el);
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));

// O fio da seção "como funciona" se desenha quando ela entra.
const drawObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-drawn");
      drawObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.2 }
);
document.querySelectorAll(".how-steps").forEach((el) => drawObserver.observe(el));

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("pointermove", (e) => {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
});
