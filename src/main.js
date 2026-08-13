import { initHeroScroll } from "./hero-scroll.js";
import { runPreloader } from "./preloader.js";
import { initChatDemo } from "./chat-demo.js";
import { initRipple } from "./ripple.js";
import { initBottomNav } from "./bottom-nav.js";

const hero = initHeroScroll();
runPreloader(hero);
initChatDemo();
initRipple();
initBottomNav();

const revealEls = document.querySelectorAll(".reveal");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15 }
);

revealEls.forEach((el) => observer.observe(el));

document.querySelectorAll(".btn").forEach((btn) => {
  btn.addEventListener("pointermove", (e) => {
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    btn.style.setProperty("--my", `${e.clientY - rect.top}px`);
  });
});
