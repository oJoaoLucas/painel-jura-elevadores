// Áudio da TV. Voz real (MP3 em /public/audios) — sem beep de tom, a voz
// já cobre todos os avisos.

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

// Destrava o áudio (contexto + autoplay de mídia, já que o "gesto do usuário"
// vale pra ambos). PRECISA ser chamado a partir de um clique/toque/tecla.
export function destravarSom() {
  const c = getCtx();
  if (!c) return;
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

// ----- Voz (arquivos MP3 em /public/audios) -----
// Toca /audios/<nome>.mp3. Resolve true se tocou, false se o arquivo não
// existe ou falhou.
export function tocarAudio(nome: string, volume = 0.3): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio(`/audios/${nome}.mp3`);
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
