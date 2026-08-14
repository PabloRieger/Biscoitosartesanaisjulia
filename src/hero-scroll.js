const FRAME_COUNT = 96;
const UNDERLINE_DASH = 260;

// Os quadros têm nome fixo (frame-0001.webp...), então trocar o vídeo sem
// trocar a URL faz o navegador de quem já visitou servir os quadros
// ANTIGOS do cache. Suba este número sempre que a sequência mudar.
const FRAMES_VERSION = 2;

function framePath(index) {
  return `frames/frame-${String(index + 1).padStart(4, "0")}.webp?v=${FRAMES_VERSION}`;
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

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Escritos do hero (eyebrow, título, subtítulo, botão) entram em sequência
// espalhada pelos primeiros 75% do progresso do pin, seguram um instante
// revelados, e nos últimos 15% o bloco inteiro desce e desaparece junto —
// terminando bem na hora em que a onda de transição assume.
const EXIT_START = 0.85;
const EXIT_END = 1;

function setupHeroReveal() {
  const content = document.querySelector(".hero-content");
  const eyebrow = document.querySelector(".hero-eyebrow");
  const title = document.querySelector(".hero-title");
  const sub = document.querySelector(".hero-sub");
  const cta = document.querySelector(".hero-cta");
  const underlinePath = document.querySelector(".uline-svg path");

  const eyebrowWords = wrapWords(eyebrow);
  const subWords = wrapWords(sub);
  // Título mantém o markup (quebra de linha + sublinhado em SVG) intacto —
  // revela como bloco em vez de palavra por palavra.

  function applyWords(spans, progress, start, end) {
    if (!spans.length) return;
    const local = easeOutCubic(clamp01((progress - start) / (end - start)));
    const total = spans.length;
    spans.forEach((span, i) => {
      const s = i / total;
      const e = (i + 1) / total;
      const t = clamp01((local - s) / (e - s));
      span.style.opacity = 0.25 + t * 0.75;
    });
  }

  return (progress) => {
    const exitLocal = easeOutCubic(clamp01((progress - EXIT_START) / (EXIT_END - EXIT_START)));

    if (content) {
      // Drift sutil contínuo até o início da saída, depois some empurrando
      // pra baixo — as duas fases somadas num só translateY.
      const drift = 16 - Math.min(progress, EXIT_START) * 32;
      content.style.transform = `translateY(${drift + exitLocal * 46}px)`;
      content.style.opacity = `${1 - exitLocal}`;
    }

    applyWords(eyebrowWords, progress, 0, 0.14);

    const titleLocal = easeOutCubic(clamp01((progress - 0.1) / (0.32 - 0.1)));
    if (title) {
      title.style.opacity = 0.45 + titleLocal * 0.55;
      title.style.transform = `translateY(${(1 - titleLocal) * 10}px)`;
    }
    if (underlinePath) {
      underlinePath.style.strokeDashoffset = `${UNDERLINE_DASH * (1 - titleLocal)}`;
    }

    applyWords(subWords, progress, 0.28, 0.5);

    const ctaLocal = easeOutCubic(clamp01((progress - 0.55) / (0.75 - 0.55)));
    if (cta) {
      cta.style.opacity = `${ctaLocal}`;
      // Só força o transform enquanto está entrando — assim que chega em
      // 1, limpa o inline pra devolver o controle ao :hover/:active do CSS
      // (senão o estilo inline travaria o lift do hover pra sempre).
      cta.style.transform = ctaLocal >= 1 ? "" : `translateY(${(1 - ctaLocal) * 16}px) scale(${0.85 + ctaLocal * 0.15})`;
      cta.style.pointerEvents = ctaLocal > 0.5 && exitLocal < 0.5 ? "auto" : "none";
    }
  };
}

export function initHeroScroll() {
  const spacer = document.querySelector(".hero-spacer");
  const canvas = document.querySelector(".hero-canvas");
  if (!spacer || !canvas) return { ready: Promise.resolve(), progress: () => 1 };

  const ctx = canvas.getContext("2d");
  const images = new Array(FRAME_COUNT);
  let currentIndex = -1;
  let currentPush = 1;
  const updateHeroReveal = setupHeroReveal();

  // Canvas minúsculo pro fundo ambiente: ampliá-lo já produz um desfoque
  // barato (sem ctx.filter, que é caro em canvas grande a cada frame).
  const AMBIENT_W = 24;
  const ambient = document.createElement("canvas");
  const ambientCtx = ambient.getContext("2d");

  // Push-in: a cena avança de 0.94 até 1.0 do enquadramento de repouso.
  const PUSH_FROM = 0.94;
  // O vídeo é 16:9 e a tela costuma ser mais alta, então "cabe inteiro"
  // puro deixaria uma faixa fina no meio e borrão no resto. Amplia até
  // preencher, com um teto de quanto do quadro pode sumir. O teto é mais
  // frouxo em retrato porque lá a diferença de proporção é enorme, e o
  // assunto vive no centro: some a borda da bancada, não os biscoitos.
  const MIN_VISIBLE_LANDSCAPE = 0.8;
  const MIN_VISIBLE_PORTRAIT = 0.52;

  function drawIndex(index, push = 1) {
    const img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;
    const cw = canvas.width;
    const ch = canvas.height;
    // Canvas ainda sem dimensão (pintura pedida antes do primeiro layout):
    // desenhar aqui lança InvalidStateError e não pintaria nada de útil.
    if (!cw || !ch) return;
    currentIndex = index;
    currentPush = push;
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

    // Frente: cresce até preencher, com o teto de visibilidade acima, e
    // o push por cima. O fundo ambiente cobre o que ainda sobrar.
    const contain = Math.min(cw / iw, ch / ih);
    const cover = Math.max(cw / iw, ch / ih);
    const minVisible = ch > cw ? MIN_VISIBLE_PORTRAIT : MIN_VISIBLE_LANDSCAPE;
    const scale = Math.min(cover, contain / minVisible) * push;
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
    if (currentIndex >= 0) drawIndex(currentIndex, currentPush);
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
  function heroProgress() {
    const rect = spacer.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    return total > 0 ? clamp01(-rect.top / total) : 0;
  }

  function paint(p) {
    const index = Math.round(p * (FRAME_COUNT - 1));
    drawIndex(nearestLoadedIndex(index), PUSH_FROM + (1 - PUSH_FROM) * p);
    updateHeroReveal(p);
  }

  // Suavização: o progresso exibido persegue o do scroll em vez de saltar
  // direto pra ele. É o que faz o vídeo fluir em vez de andar aos trancos.
  let target = 0;
  let shown = 0;
  let rafId = null;
  let lastTick = 0;
  const SMOOTH = 0.19;

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    // O expoente normaliza a suavização para 60fps: sem ele, uma tela de
    // 120Hz convergiria no dobro da velocidade e o site teria um "peso"
    // diferente por máquina.
    shown += (target - shown) * (1 - Math.pow(1 - SMOOTH, dt / 16.667));

    if (Math.abs(target - shown) < 0.0004) {
      shown = target;
      rafId = null;
      lastTick = 0; // alcançou: o laço descansa em vez de rodar à toa
    } else {
      rafId = requestAnimationFrame(tick);
    }
    paint(shown);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null) {
      lastTick = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTick = 0;
    }
  }

  function onResize() {
    resize();
    paintCurrent();
  }

  window.addEventListener("resize", onResize);

  // Uma aba aberta em segundo plano mede o canvas como 0x0, e o evento de
  // resize da janela não dispara quando ela finalmente aparece: sem isto o
  // hero ficaria preto para sempre nesse caso.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (canvas.getBoundingClientRect().width > 0) onResize();
    }).observe(canvas);
  }

  // O scrub é armado e desarmado ao vivo: se a pessoa liga "reduzir
  // movimento" com a página aberta, o hero pousa no estado final em vez
  // de continuar preso ao scroll; se desligar, volta a responder.
  const reduceQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  // null = ainda não decidido; sem isso a primeira chamada com "reduzir
  // movimento" já ligado sairia cedo e nunca pousaria o hero.
  let scrubOn = null;

  function enableScrub() {
    if (scrubOn === true) return;
    scrubOn = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    // Sem salto: parte de onde a tela já está, em vez de animar do zero.
    target = shown = heroProgress();
    paint(shown);
  }

  // Estado final e legível, sem meia animação congelada.
  function paintRestState() {
    drawIndex(nearestLoadedIndex(FRAME_COUNT - 1), 1);
    updateHeroReveal(0.8);
  }

  // Todo repaint passa por aqui, senão o carregamento do primeiro frame
  // sobrescreveria o estado pousado de quem pediu menos movimento.
  function paintCurrent() {
    if (reduceQuery.matches) paintRestState();
    else {
      target = shown = heroProgress();
      paint(shown);
    }
  }

  function disableScrub() {
    if (scrubOn === false) return;
    const wasOn = scrubOn === true;
    scrubOn = false;
    if (wasOn) window.removeEventListener("scroll", onScroll);
    stopLoop();
    paintRestState();
  }

  function applyHeroMode() {
    if (reduceQuery.matches) disableScrub();
    else enableScrub();
  }

  reduceQuery.addEventListener("change", applyHeroMode);
  applyHeroMode();

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
            paintCurrent();
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
  paintCurrent();

  return {
    ready: Promise.all(loads).then(() => {}),
    progress: () => loadedCount / FRAME_COUNT,
  };
}
