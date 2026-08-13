const MAX_WAIT_MS = 6000;

export function runPreloader(hero) {
  const root = document.querySelector("[data-preloader]");
  const bar = document.querySelector("[data-preloader-bar]");

  if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root?.remove();
    return Promise.resolve();
  }

  document.body.classList.add("is-loading");

  return new Promise((resolve) => {
    let finished = false;

    const tick = () => {
      if (bar) bar.style.width = `${hero.progress() * 100}%`;
    };
    const ticker = setInterval(tick, 100);

    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(ticker);
      clearTimeout(ceiling);
      if (bar) bar.style.width = "100%";
      root.classList.add("is-done");
      document.body.classList.remove("is-loading");
      root.addEventListener("transitionend", () => root.remove(), { once: true });
      resolve();
    };

    const ceiling = setTimeout(finish, MAX_WAIT_MS);
    hero.ready.then(finish);
  });
}
