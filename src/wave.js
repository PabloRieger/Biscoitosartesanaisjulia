// Paralaxe da faixa de transição entre o hero e o "sobre". As duas curvas
// leem o mesmo progresso e o aplicam com forças diferentes, o que separa
// os planos em vez de mover a faixa inteira como um bloco só.
export function initWave() {
  const el = document.querySelector("[data-wave]");
  if (!el) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let rafId = null;
  let onScreen = false;

  function update() {
    rafId = null;
    const rect = el.getBoundingClientRect();
    const span = window.innerHeight + rect.height;
    // -1 quando a faixa ainda está inteira abaixo da dobra, 0 quando já
    // saiu por cima. Fora desse intervalo nada precisa ser escrito.
    const p = clamp(-1 + (window.innerHeight - rect.top) / span, -1, 0);
    el.style.setProperty("--p", p.toFixed(3));
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function onScroll() {
    if (!onScreen || rafId !== null) return;
    rafId = requestAnimationFrame(update);
  }

  // Só escuta o scroll enquanto a faixa está por perto: fora disso o
  // paralaxe não teria o que mostrar e o trabalho seria desperdiçado.
  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) update();
    },
    { rootMargin: "120px 0px" }
  );
  io.observe(el);

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
}
