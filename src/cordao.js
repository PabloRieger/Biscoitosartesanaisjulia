// O barbante que desce do pacote pendurado no fim do hero.
//
// A parte desenhada acaba onde o arquivo foi cortado; daqui para baixo o
// cordão é gerado. Ele não pode ser um traço liso: o laço do desenho é
// visivelmente torcido, e uma linha uniforme emendada nele denuncia a
// costura.
//
// A primeira tentativa desenhou dois contornos com diagonais entre eles,
// que é como a gravura faz no tamanho grande. Nesta espessura aquilo lia
// como corrente. O que funciona é imitar o objeto e não o desenho dele:
// dois fios em oposição de fase, que se cruzam a cada meia volta. É
// literalmente o que corda torcida faz, e sobrevive a qualquer escala.
//
// Medidas tiradas do próprio desenho, em fração da largura da imagem:
const CORDAO = 0.0373; // espessura
const PASSO = 0.0673; // distância entre uma volta e a seguinte
const SAIDA = 0.6615; // onde o cordão cruza a borda de baixo do pacote

// Ele afina e clareia conforme desce. Em espessura cheia por 2600px o
// cordão vira o assunto da página inteira e engole o texto.
// Ele afina conforme desce; o clarear fica por conta do gradiente no SVG,
// que é ao longo do barbante e não da rolagem.
const FIM_ESPESSURA = 0.42;

const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Balanço de corda pendurada: quase reta, com uma sobra lenta. Serpentina
// larga demais não parece barbante caindo, parece decoração.
function centro(x0, largura, altura, janela, passo) {
  const balancos = Math.max(1.5, altura / Math.max(520, janela) / 1.15);
  const amp = largura * 0.075;
  // A amostragem é ditada pelo passo da torção, não pela altura: com um
  // ponto a cada volta inteira os dois fios não chegam a se cruzar e o
  // barbante vira duas linhas paralelas.
  const passos = Math.max(48, Math.ceil(altura / (passo / 5)));
  const pts = [];
  for (let i = 0; i <= passos; i++) {
    const t = i / passos;
    // A amplitude cresce do zero: no ponto de emenda o cordão tem de sair
    // exatamente na vertical, senão aparece um bico na junta.
    const abre = Math.min(1, t * 5);
    const x =
      x0 +
      abre * amp * (Math.sin(t * Math.PI * 2 * balancos) + 0.3 * Math.sin(t * Math.PI * 2 * balancos * 2.4));
    pts.push([x, t * altura, t]);
  }
  return pts;
}

// Normal unitária em cada ponto, pela diferença com os vizinhos.
function normais(pts) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const m = Math.hypot(dx, dy) || 1;
    return [-dy / m, dx / m];
  });
}

function polilinha(pts) {
  return pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
}

export function initCordao() {
  const raiz = document.querySelector("[data-cordao]");
  if (!raiz) return;
  const svg = raiz.querySelector("svg");
  const grupo = raiz.querySelector("[data-cordao-grupo]");
  const pacote = document.querySelector("[data-pacote]");
  const fim = document.querySelector(".footer");
  if (!svg || !grupo || !pacote || !fim) return;

  let topo = 0;
  let altura = 0;
  let rafId = null;
  let assinatura = "";

  function medir() {
    const y = window.scrollY;
    const p = pacote.getBoundingClientRect();
    // Nasce na borda de baixo do pacote, no ponto exato onde o cordão
    // desenhado cruza aquela borda.
    topo = y + p.bottom;
    altura = Math.max(1, y + fim.getBoundingClientRect().top - topo);
    const largura = raiz.clientWidth;

    // Gerar o barbante custa uns dois mil pontos, e o observador dispara a
    // cada mudança de altura da página — entradas, cesta abrindo. Sem esta
    // guarda o mesmo desenho é refeito dezenas de vezes à toa.
    const nova = `${Math.round(topo)}|${Math.round(altura)}|${largura}|${Math.round(p.width)}`;
    if (nova === assinatura) return desenhar();
    assinatura = nova;
    const x0 = p.left + p.width * SAIDA;
    const esp = p.width * CORDAO;
    const passo = p.width * PASSO;

    raiz.style.top = `${Math.round(topo)}px`;
    raiz.style.height = `${Math.round(altura)}px`;
    svg.setAttribute("viewBox", `0 0 ${largura} ${altura}`);

    const pts = centro(x0, largura, altura, window.innerHeight, passo);
    const ns = normais(pts);
    const meia = (t) => (esp / 2) * (1 - (1 - FIM_ESPESSURA) * t);

    // Os dois fios só diferem pelo sinal: onde o seno zera eles se
    // encontram, e é esse encontro que o olho lê como volta da torção.
    const fio = (sinal) =>
      pts.map((p, i) => {
        const fase = (2 * Math.PI * p[1]) / passo;
        const d = sinal * meia(p[2]) * Math.sin(fase);
        return [p[0] + ns[i][0] * d, p[1] + ns[i][1] * d];
      });

    grupo.innerHTML = `<path d="${polilinha(fio(1))}"/><path d="${polilinha(fio(-1))}"/>`;

    desenhar();
  }

  function desenhar() {
    rafId = null;
    const k = reduzido()
      ? 1
      : Math.min(1, Math.max(0, (window.scrollY + window.innerHeight - topo) / altura));
    // Revela por recorte, não por tracejado: são três caminhos e um
    // dashoffset comum faria cada um andar num ritmo diferente.
    raiz.style.clipPath = `inset(0 0 ${((1 - k) * 100).toFixed(2)}% 0)`;
  }

  function aoRolar() {
    if (rafId === null) rafId = requestAnimationFrame(desenhar);
  }

  if (pacote.complete) medir();
  else pacote.addEventListener("load", medir, { once: true });

  window.addEventListener("scroll", aoRolar, { passive: true });
  new ResizeObserver(medir).observe(document.body);
}
