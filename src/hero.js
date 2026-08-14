// O hero é uma sequência de imagens desenhada num canvas, escolhida pelo
// progresso do scroll. Nada de <video> com seek: buscar um quadro de vídeo
// tem custo de decodificação imprevisível e trava; trocar o índice de uma
// imagem já decodificada é instantâneo.

const FRAME_COUNT = 96;

// Os primeiros quadros são poeira densa sem foco: feios como primeira
// imagem do site. O percurso começa onde a cascata já está formada.
const FRAME_START = 16;

// Os quadros têm nome fixo (frame-0001.webp...), então trocar o vídeo sem
// trocar a URL faz o navegador de quem já visitou servir os quadros
// ANTIGOS do cache. Suba este número sempre que a sequência mudar.
const FRAMES_VERSION = 2;

const framePath = (i) =>
  `frames/frame-${String(i + 1).padStart(4, "0")}.webp?v=${FRAMES_VERSION}`;

// O quadro cresce até preencher a tela, com um teto de quanto pode sumir.
// O teto é mais frouxo em retrato porque lá a diferença de proporção é
// enorme, e o assunto vive no centro: some a borda da bancada, não os
// biscoitos.
const VISIBLE_LANDSCAPE = 0.8;
const VISIBLE_PORTRAIT = 0.52;

// Avanço de câmera: a cena vai de 0.94 até o enquadramento de repouso.
const PUSH_FROM = 0.94;

const SMOOTH = 0.19;

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

// Quebra o texto em palavras para revelar uma a uma, guardando os espaços
// como texto solto para a quebra de linha continuar natural.
function splitWords(el) {
  if (!el) return [];
  const words = [];
  const text = el.textContent;
  el.textContent = "";
  (text.match(/(\S+|\s+)/g) || []).forEach((chunk) => {
    if (!chunk.trim()) {
      el.append(chunk);
      return;
    }
    const span = document.createElement("span");
    span.textContent = chunk;
    span.style.display = "inline-block";
    span.style.opacity = "0.25";
    el.append(span);
    words.push(span);
  });
  return words;
}

export function initHero() {
  const track = document.querySelector("[data-hero-track]");
  const canvas = document.querySelector("[data-hero-canvas]");
  if (!track || !canvas) return { ready: Promise.resolve(), progress: () => 1 };

  const ctx = canvas.getContext("2d", { alpha: false });
  const images = new Array(FRAME_COUNT);
  let drawn = -1;
  let drawnPush = 1;

  // Canvas minúsculo reampliado: produz o borrão de fundo praticamente de
  // graça, sem filtro caro por quadro.
  const AMBIENT_W = 24;
  const ambient = document.createElement("canvas");
  const ambientCtx = ambient.getContext("2d", { alpha: false });

  const content = document.querySelector("[data-hero-content]");
  const label = document.querySelector(".hero-label");
  const title = document.querySelector(".hero-title");
  const sub = document.querySelector(".hero-sub");
  const cta = document.querySelector("[data-hero-cta]");
  const hint = document.querySelector("[data-hero-hint]");

  const labelWords = splitWords(label);
  const subWords = splitWords(sub);

  function drawFrame(index, push) {
    const img = images[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    const cw = canvas.width;
    const ch = canvas.height;
    // Sem dimensão ainda: desenhar aqui lança erro e não pintaria nada.
    if (!cw || !ch) return;

    drawn = index;
    drawnPush = push;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;

    // Fundo: a própria cena reduzida ao extremo e reampliada, para as
    // sobras ficarem no mundo da imagem em vez de tarja preta.
    ambient.width = AMBIENT_W;
    ambient.height = Math.max(1, Math.round((AMBIENT_W * ch) / cw));
    const as = Math.max(ambient.width / iw, ambient.height / ih);
    ambientCtx.drawImage(img, (ambient.width - iw * as) / 2, (ambient.height - ih * as) / 2, iw * as, ih * as);
    ctx.drawImage(ambient, 0, 0, ambient.width, ambient.height, 0, 0, cw, ch);
    ctx.fillStyle = "rgba(46,29,18,0.5)";
    ctx.fillRect(0, 0, cw, ch);

    const contain = Math.min(cw / iw, ch / ih);
    const cover = Math.max(cw / iw, ch / ih);
    const visible = ch > cw ? VISIBLE_PORTRAIT : VISIBLE_LANDSCAPE;
    const scale = Math.min(cover, contain / visible) * push;
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    if (drawn >= 0) drawFrame(drawn, drawnPush);
  }

  // Enquanto a sequência carrega, usa o quadro carregado mais próximo em
  // vez de deixar o canvas parado.
  function nearestLoaded(target) {
    for (let d = 0; d < FRAME_COUNT; d++) {
      const lo = target - d;
      const hi = target + d;
      if (lo >= 0 && images[lo]?.complete) return lo;
      if (hi < FRAME_COUNT && images[hi]?.complete) return hi;
    }
    return Math.max(0, drawn);
  }

  // Progresso vem da altura toda da faixa, não do quadro fixo.
  function heroProgress() {
    const rect = track.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    return total > 0 ? clamp01(-rect.top / total) : 0;
  }

  // Coreografia: o hero ABRE montado, com uma entrada por tempo no
  // carregamento, e só depois o scroll assume. Sem isso a primeira coisa
  // que a pessoa vê é texto apagado esperando um gesto que ela ainda não
  // fez, e a primeira impressão morre ali.
  const EXIT_FROM = 0.86;
  const INTRO_MS = 2200;

  let introStart = null;
  let intro = 0;

  function runIntro(now) {
    if (introStart === null) introStart = now;
    intro = clamp01((now - introStart) / INTRO_MS);
    choreograph(shown);
    if (intro < 1) requestAnimationFrame(runIntro);
  }

  // A entrada por tempo e a por scroll disputam, e a maior vence: assim o
  // texto nunca "desmonta" ao voltar para o topo.
  const gate = (scrollK, from, to) =>
    Math.max(scrollK, easeOut(clamp01((intro - from) / (to - from))));

  function applyWords(words, k) {
    if (!words.length) return;
    words.forEach((w, i) => {
      const a = i / words.length;
      const b = (i + 1) / words.length;
      w.style.opacity = `${0.25 + clamp01((k - a) / (b - a)) * 0.75}`;
    });
  }

  function choreograph(p) {
    const exit = easeOut(clamp01((p - EXIT_FROM) / (1 - EXIT_FROM)));

    if (content) {
      const drift = 14 - Math.min(p, EXIT_FROM) * 28;
      content.style.transform = `translateY(${drift + exit * 44}px)`;
      content.style.opacity = `${1 - exit}`;
    }

    applyWords(labelWords, gate(easeOut(clamp01(p / 0.14)), 0.05, 0.35));

    const tp = gate(easeOut(clamp01((p - 0.1) / 0.24)), 0.15, 0.6);
    if (title) {
      title.style.opacity = `${0.15 + tp * 0.85}`;
      title.style.transform = `translateY(${(1 - tp) * 14}px)`;
    }

    applyWords(subWords, gate(easeOut(clamp01((p - 0.3) / 0.24)), 0.45, 0.8));

    const cp = gate(easeOut(clamp01((p - 0.56) / 0.2)), 0.7, 1);
    if (cta) {
      cta.style.opacity = `${cp}`;
      // Solta o transform ao chegar: preso, ele travaria o hover do CSS.
      cta.style.transform = cp >= 1 ? "" : `translateY(${(1 - cp) * 14}px)`;
      cta.style.pointerEvents = cp > 0.5 && exit < 0.5 ? "auto" : "none";
    }

    if (hint) hint.style.opacity = `${clamp01(1 - p * 12) * intro}`;
  }

  function paint(p) {
    const index = FRAME_START + Math.round(p * (FRAME_COUNT - 1 - FRAME_START));
    drawFrame(nearestLoaded(index), PUSH_FROM + (1 - PUSH_FROM) * p);
    choreograph(p);
  }

  // O progresso exibido persegue o do scroll em vez de saltar para ele: é
  // o que faz a cena fluir em vez de andar aos trancos.
  let target = 0;
  let shown = 0;
  let rafId = null;
  let last = 0;

  function tick(now) {
    const dt = Math.min(100, now - (last || now));
    last = now;
    // O expoente normaliza para 60fps: sem ele, uma tela de 120Hz
    // convergiria no dobro da velocidade e o site teria peso diferente
    // por máquina.
    shown += (target - shown) * (1 - Math.pow(1 - SMOOTH, dt / 16.667));

    if (Math.abs(target - shown) < 0.0004) {
      shown = target;
      rafId = null;
      last = 0;
    } else {
      rafId = requestAnimationFrame(tick);
    }
    paint(shown);
  }

  function onScroll() {
    target = heroProgress();
    if (rafId === null) {
      last = 0;
      rafId = requestAnimationFrame(tick);
    }
  }

  function settle() {
    // Quem pediu menos movimento recebe o hero já montado, sem animação.
    // No hero estático comum a entrada ainda roda, então aqui não se
    // força intro=1: forçar faria o texto aparecer pronto e piscar de
    // volta ao início quando a entrada começasse.
    if (reduce.matches) intro = 1;
    drawFrame(nearestLoaded(FRAME_COUNT - 1), 1);
    choreograph(0);
  }

  // Estas cinco condições precisam ser idênticas às do CSS, senão um lado
  // esconde o que o outro mostra e o hero fica vazio.
  const STILL_GATES = [
    "(max-width: 760px)",
    "(orientation: portrait) and (max-width: 1024px)",
    "(orientation: portrait) and (pointer: coarse)",
    "(orientation: landscape) and (pointer: coarse) and (max-height: 560px)",
    "(prefers-reduced-motion: reduce)",
  ].map((q) => window.matchMedia(q));

  const wantsStill = () => STILL_GATES.some((q) => q.matches);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function repaint() {
    if (reduce.matches) settle();
    else {
      target = shown = heroProgress();
      paint(shown);
    }
  }

  // null = ainda não decidido: sem isso, a primeira chamada já com o
  // movimento reduzido ligado sairia cedo e nunca pousaria a cena.
  let armed = null;

  function arm() {
    if (armed === true) return;
    armed = true;
    window.addEventListener("scroll", onScroll, { passive: true });
    target = shown = heroProgress();
    paint(shown);
  }

  function disarm() {
    if (armed === false) return;
    const was = armed === true;
    armed = false;
    if (was) window.removeEventListener("scroll", onScroll);
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
      last = 0;
    }
    settle();
  }

  const applyMode = () => {
    if (wantsStill()) {
      disarm();
      return;
    }
    // Só aqui os quadros começam a ser baixados. Quem fica no hero
    // estático nunca paga por eles, e quem gira o aparelho para paisagem
    // dispara o carregamento neste momento, não antes.
    loadFrames();
    arm();
  };
  // Decidido ao vivo: girar o aparelho, redimensionar a janela ou mudar a
  // preferência de movimento troca de modo sem recarregar a página.
  STILL_GATES.forEach((q) => q.addEventListener("change", applyMode));

  function onResize() {
    resize();
    repaint();
  }
  window.addEventListener("resize", onResize);

  // Uma aba aberta em segundo plano mede o canvas como 0x0, e o resize da
  // janela não dispara quando ela finalmente aparece: sem isto o hero
  // ficaria preto para sempre nesse caso.
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => {
      if (canvas.getBoundingClientRect().width > 0) onResize();
    }).observe(canvas);
  }

  let loaded = 0;
  let loading = null;

  function loadFrames() {
    if (loading) return loading;
    // Array.from, não images.map: `new Array(n)` é esparso e o map pula
    // os buracos, então nenhum quadro chegaria a ser pedido.
    const loads = Array.from({ length: FRAME_COUNT }, (_, i) => {
      const img = new Image();
      img.decoding = "async";
      images[i] = img;
      return new Promise((resolve) => {
        const done = () => {
          loaded++;
          // A entrada começa quando o primeiro quadro do percurso está
          // pronto: o texto surgindo sobre um canvas vazio seria pior que
          // não animar nada.
          if (i === FRAME_START) {
            resize();
            repaint();
            if (!reduce.matches && introStart === null) {
              requestAnimationFrame(runIntro);
            }
          }
          resolve();
        };
        img.onload = done;
        img.onerror = done;
        img.src = framePath(i);
      });
    });
    loading = Promise.all(loads).then(() => {});
    return loading;
  }

  resize();
  applyMode();

  // No hero estático o texto ainda precisa entrar: sem quadro para
  // esperar, a entrada começa de imediato.
  if (wantsStill() && !reduce.matches && introStart === null) {
    requestAnimationFrame(runIntro);
  }

  return {
    ready: loading || Promise.resolve(),
    progress: () => (loading ? loaded / FRAME_COUNT : 1),
  };
}
