const FRAME_COUNT = 70;
const UNDERLINE_DASH = 260;

function framePath(index) {
  return `frames/frame-${String(index + 1).padStart(4, "0")}.webp`;
}

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

// Quebra o texto de um elemento em palavras (mantendo os espaços como texto
// solto) pra poder revelar cada uma independentemente conforme o scroll.
function wrapWords(el) {
  if (!el) return [];
  const text = el.textContent;
  el.textContent = "";
  const spans = [];
  (text.match(/(\S+|\s+)/g) || []).forEach((chunk) => {
    if (chunk.trim() === "") {
      el.appendChild(document.createTextNode(chunk));
      return;
    }
    const span = document.createElement("span");
    span.className = "rv-word";
    span.textContent = chunk;
    el.appendChild(span);
    spans.push(span);
  });
  return spans;
}

// Escritos do hero (eyebrow, título, subtítulo) vão surgindo em sequência
// conforme a página desce, cada um numa janela do progresso do pin.
function setupHeroReveal() {
  const eyebrow = document.querySelector(".hero-eyebrow");
  const title = document.querySelector(".hero-title");
  const sub = document.querySelector(".hero-sub");
  const underlinePath = document.querySelector(".uline-svg path");

  const eyebrowWords = wrapWords(eyebrow);
  const subWords = wrapWords(sub);
  // Título mantém o markup (quebra de linha + sublinhado em SVG) intacto —
  // revela como bloco em vez de palavra por palavra.

  function applyWords(spans, progress, start, end) {
    if (!spans.length) return;
    const local = clamp01((progress - start) / (end - start));
    const total = spans.length;
    spans.forEach((span, i) => {
      const s = i / total;
      const e = (i + 1) / total;
      const t = clamp01((local - s) / (e - s));
      span.style.opacity = 0.25 + t * 0.75;
    });
  }

  return (progress) => {
    applyWords(eyebrowWords, progress, 0, 0.12);

    const titleLocal = clamp01((progress - 0.08) / (0.28 - 0.08));
    if (title) {
      title.style.opacity = 0.45 + titleLocal * 0.55;
      title.style.transform = `translateY(${(1 - titleLocal) * 10}px)`;
    }
    if (underlinePath) {
      underlinePath.style.strokeDashoffset = `${UNDERLINE_DASH * (1 - titleLocal)}`;
    }

    applyWords(subWords, progress, 0.28, 0.55);
  };
}

export function initHeroScroll() {
  const spacer = document.querySelector(".hero-spacer");
  const canvas = document.querySelector(".hero-canvas");
  if (!spacer || !canvas) return { ready: Promise.resolve(), progress: () => 1 };

  const ctx = canvas.getContext("2d");
  const images = new Array(FRAME_COUNT);
  let currentIndex = -1;
  const updateHeroReveal = setupHeroReveal();

  // Canvas minúsculo pro fundo ambiente: ampliá-lo já produz um desfoque
  // barato (sem ctx.filter, que é caro em canvas grande a cada frame).
  const AMBIENT_W = 24;
  const ambient = document.createElement("canvas");
  const ambientCtx = ambient.getContext("2d");

  function drawIndex(index) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    currentIndex = index;
    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Fundo: cobre o canvas inteiro (recortado), ampliado a partir de uma
    // versão minúscula da mesma imagem — vira um borrão que preenche as
    // sobras sem tarja preta e sem cortar o biscoito principal.
    ambient.width = AMBIENT_W;
    ambient.height = Math.max(1, Math.round((AMBIENT_W * ch) / cw));
    const as = Math.max(ambient.width / iw, ambient.height / ih);
    ambientCtx.drawImage(img, (ambient.width - iw * as) / 2, (ambient.height - ih * as) / 2, iw * as, ih * as);
    ctx.drawImage(ambient, 0, 0, ambient.width, ambient.height, 0, 0, cw, ch);
    ctx.fillStyle = "rgba(59,36,24,0.55)";
    ctx.fillRect(0, 0, cw, ch);

    // Frente: a imagem inteira, sem cortar nada (contain, não cover).
    const scale = Math.min(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    // Sempre recalcula o desenho no tamanho novo, mesmo sem frame novo —
    // senão a primeira chamada (antes do frame 0 carregar) nunca repete e
    // o canvas fica em branco pra sempre caso o tamanho não mude de novo.
    if (currentIndex >= 0) drawIndex(currentIndex);
  }

  function nearestLoadedIndex(target) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      const lo = target - d;
      const hi = target + d;
      if (lo >= 0 && images[lo] && images[lo].complete) return lo;
      if (hi < FRAME_COUNT && images[hi] && images[hi].complete) return hi;
    }
    return Math.max(0, currentIndex);
  }

  // Progresso vem da altura toda do spacer (não do pin, que fica fixo na
  // tela) — igual ao ScrollTrigger "top top" -> "bottom bottom" da Gorie.
  function onScroll() {
    const rect = spacer.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
    const target = Math.round(progress * (FRAME_COUNT - 1));
    drawIndex(nearestLoadedIndex(target));
    updateHeroReveal(progress);
  }

  let ticking = false;
  function onScrollThrottled() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      onScroll();
      ticking = false;
    });
  }

  function onResize() {
    resize();
    onScroll();
  }

  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScrollThrottled, { passive: true });

  let loadedCount = 0;
  const loads = [];
  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    images[i] = img;
    loads.push(
      new Promise((resolve) => {
        img.onload = () => {
          loadedCount++;
          if (i === 0) {
            resize();
            drawIndex(0);
          }
          resolve();
        };
        img.onerror = () => {
          loadedCount++;
          resolve();
        };
      })
    );
    img.src = framePath(i);
  }

  resize();
  onScroll();

  return {
    ready: Promise.all(loads).then(() => {}),
    progress: () => loadedCount / FRAME_COUNT,
  };
}
