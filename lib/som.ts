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
  // tick silencioso só pra "acordar" o contexto (getCtx já deu resume)
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

// Toca uma nota tipo "sino": onda senoidal (sem os harmônicos ásperos da
// onda quadrada) + um sobretom sutil uma oitava acima + um filtro que vai
// "fechando" ao longo da nota. É o que dá o timbre redondo de campainha em
// vez do apito de despertador.
function nota(freq: number, inicio: number, dur: number, volume: number) {
  const c = ctx;
  if (!c) return;

  const corpo = c.createOscillator();
  corpo.type = "sine";
  corpo.frequency.value = freq;

  const brilho = c.createOscillator();
  brilho.type = "sine";
  brilho.frequency.value = freq * 2;

  const filtro = c.createBiquadFilter();
  filtro.type = "lowpass";
  filtro.frequency.setValueAtTime(freq * 5, inicio);
  filtro.frequency.exponentialRampToValueAtTime(freq * 1.2, inicio + dur);

  const gainCorpo = c.createGain();
  gainCorpo.gain.setValueAtTime(0.0001, inicio);
  gainCorpo.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), inicio + 0.008);
  gainCorpo.gain.exponentialRampToValueAtTime(0.0001, inicio + dur);

  const gainBrilho = c.createGain();
  gainBrilho.gain.setValueAtTime(0.0001, inicio);
  gainBrilho.gain.exponentialRampToValueAtTime(
    Math.max(0.0005, volume * 0.3),
    inicio + 0.008
  );
  gainBrilho.gain.exponentialRampToValueAtTime(0.0001, inicio + dur * 0.6);

  corpo.connect(gainCorpo);
  brilho.connect(gainBrilho);
  gainCorpo.connect(filtro);
  gainBrilho.connect(filtro);
  filtro.connect(c.destination);

  corpo.start(inicio);
  corpo.stop(inicio + dur);
  brilho.start(inicio);
  brilho.stop(inicio + dur);
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

// Beep de novo recado/lembrete (dois tons subindo, diferente da fila)
export function beepAviso(volume = 0.3) {
  const c = getCtx();
  if (!c) return;
  const t = c.currentTime;
  nota(880, t, 0.12, volume);
  nota(1108, t + 0.14, 0.2, volume);
}

// ----- Voz (arquivos MP3 em /public/audios) -----
// Toca /audios/<nome>.mp3. Resolve true se tocou, false se o arquivo não
// existe ou falhou — quem chamou cai no beep como fallback (nunca fica mudo).
// Volume um pouco mais alto que o beep pra voz ficar clara.
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
