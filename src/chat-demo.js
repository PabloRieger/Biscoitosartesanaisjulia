const MESSAGES = [
  { text: "Oi! Vocês têm biscoito de chocolate?", sender: false },
  { text: "Temos sim! Quantos pacotes você quer?", sender: true },
  { text: "2 pacotes, pra retirar sábado", sender: false },
  { text: "Fechado! Te aviso quando tiver pronto.", sender: true },
];
const GAP_MS = 550;

function typingDuration(text) {
  return Math.min(1800, Math.max(600, Math.round((text.length / 12) * 1000)));
}

export function initChatDemo() {
  const root = document.querySelector("[data-chat]");
  if (!root) return;

  let started = false;

  function runSequence() {
    if (started) return;
    started = true;

    let i = 0;
    function nextMessage() {
      if (i >= MESSAGES.length) return;
      const { text, sender } = MESSAGES[i];

      const typing = document.createElement("div");
      typing.className = `chat-bubble chat-typing ${sender ? "chat-out" : "chat-in"}`;
      typing.innerHTML = "<span></span><span></span><span></span>";
      root.appendChild(typing);

      setTimeout(() => {
        typing.remove();
        const bubble = document.createElement("div");
        bubble.className = `chat-bubble ${sender ? "chat-out" : "chat-in"}`;
        bubble.textContent = text;
        root.appendChild(bubble);
        i++;
        setTimeout(nextMessage, GAP_MS);
      }, typingDuration(text));
    }

    nextMessage();
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    MESSAGES.forEach(({ text, sender }) => {
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${sender ? "chat-out" : "chat-in"}`;
      bubble.textContent = text;
      root.appendChild(bubble);
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runSequence();
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.3 }
  );
  observer.observe(root);
}
