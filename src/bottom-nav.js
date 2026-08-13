const SECTIONS = [
  { id: "main", key: "inicio" },
  { id: "sobre", key: "sobre" },
  { id: "cardapio", key: "cardapio" },
];

export function initBottomNav() {
  const items = document.querySelectorAll("[data-bottom-nav]");
  if (!items.length) return;

  const setActive = (key) => {
    items.forEach((item) => {
      item.classList.toggle("is-active", item.dataset.bottomNav === key);
    });
  };

  const targets = SECTIONS.map(({ id, key }) => ({
    key,
    el: document.getElementById(id),
  })).filter((t) => t.el);

  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const match = targets.find((t) => t.el === entry.target);
          if (match) setActive(match.key);
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
  );

  targets.forEach((t) => observer.observe(t.el));
  setActive("inicio");
}
