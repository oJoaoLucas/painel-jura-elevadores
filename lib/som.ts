// Som via Web Audio API — sem bibliotecas.
// Cada elevador tem um tom próprio, então dá pra reconhecer de ouvido
// qual elevador mudou mesmo sem olhar pra TV.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      ctx = new Ctx();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

// Destrava o áudio. PRECISA ser chamado a partir de um gesto do usuário
// (clique/toque/tecla) por causa da política de autoplay dos navegadores.
export function destravarSom() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") c.resume();
  // tick silencioso só pra "acordar" o contexto
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    gain.gain.value = 0.00001;
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start();
    osc.stop(c.currentTime + 0.02);
  } catch {
    /* ignora */
  }
}

// O som está pronto pra tocar? (contexto criado e rodando)
export function somPronto(): boolean {
  return !!ctx && ctx.state === "running";
}

// Frequências distintas por elevador (D5, F5, G#5, B5)
const TOM_ELEVADOR: Record<number, number> = {
  1: 587,
  2: 698,
  3: 831,
  4: 988,
};

function nota(freq: number, inicio: number, dur: number, volume: number) {
  const c = ctx;
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, inicio);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), inicio + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(inicio);
  osc.stop(inicio + dur);
}

// Beep de mudança de elevador. status "pronto" toca um tom triplo de atenção.
export function beepElevador(
  elevadorId: number,
  status: string,
  volume = 0.3
) {
  const c = getCtx();
  if (!c) return;
  const freq = TOM_ELEVADOR[elevadorId] || 880;
  const t = c.currentTime;

  if (status === "pronto") {
    // Triplo, sobe um tom — "carro pronto, chama o cliente"
    nota(freq, t, 0.18, volume);
    nota(freq, t + 0.22, 0.18, volume);
    nota(freq * 1.25, t + 0.44, 0.3, volume);
  } else {
    nota(freq, t, 0.25, volume);
  }
}

// Beep de carro que saiu da fila de alinhamento (chama o próximo)
export function beepFila(volume = 0.3) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  nota(523, t, 0.15, volume);
  nota(523, t + 0.18, 0.2, volume);
}

// ----- Voz do navegador (Web Speech API) -----
// Fala um texto em voz alta usando o motor de voz do próprio navegador.
// Não precisa de arquivo. Voz em pt-BR. Retorna true se conseguiu falar.
let vozesCache: SpeechSynthesisVoice[] = [];

export function prepararVoz() {
  try {
    const s = window.speechSynthesis;
    if (!s) return;
    vozesCache = s.getVoices();
    if (!vozesCache.length) {
      s.onvoiceschanged = () => {
        vozesCache = s.getVoices();
      };
    }
  } catch {
    /* ignora */
  }
}

export function falar(texto: string, volume = 1): boolean {
  try {
    const s = window.speechSynthesis;
    if (!s) return false;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    u.rate = 1;
    u.pitch = 1;
    u.volume = Math.max(0.4, Math.min(1, volume * 1.6));
    const lista = vozesCache.length ? vozesCache : s.getVoices();
    const vozPt =
      lista.find((v) => v.lang?.toLowerCase() === "pt-br") ||
      lista.find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (vozPt) u.voice = vozPt;
    s.cancel(); // não acumula fala em cima de fala
    s.speak(u);
    return true;
  } catch {
    return false;
  }
}

// ----- Voz (arquivos MP3 em /public/voz) -----
// Toca /voz/<nome>.mp3. Retorna true se o arquivo existe e tocou,
// false se não existe (aí quem chamou cai no beep como fallback).
// O volume da voz é separado dos beeps: usamos volume "cheio" pra ficar audível,
// mas respeitando um teto pelo volume configurado.
export function tocarVoz(nome: string, volume = 1): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(`/voz/${nome}.mp3`);
      // a voz costuma precisar de mais volume que o beep pra ficar clara
      audio.volume = Math.max(0.2, Math.min(1, volume * 1.5));
      let resolvido = false;
      const ok = () => {
        if (!resolvido) {
          resolvido = true;
          resolve(true);
        }
      };
      const falhou = () => {
        if (!resolvido) {
          resolvido = true;
          resolve(false);
        }
      };
      audio.addEventListener("playing", ok, { once: true });
      audio.addEventListener("error", falhou, { once: true });
      audio.play().catch(falhou);
    } catch {
      resolve(false);
    }
  });
}
