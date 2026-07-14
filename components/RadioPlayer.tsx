"use client";

import { useEffect, useRef } from "react";
import type { Config } from "@/lib/supabase";
import { ESTACOES, estacaoSegura } from "@/lib/radio";

// Player da TV: só toca e mostra o nome. Quem controla (liga/desliga, estação,
// volume) é a recepção, via config no banco. Sem controles na tela.
// Ao ligar, a TV retoma a última estação que estava salva.
export default function RadioPlayer({ config }: { config: Config }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const duckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const idx = estacaoSegura(config.radio_estacao);
  const estacao = ESTACOES[idx];
  const ativa = config.radio_ativa;
  const volume = config.radio_volume ?? 0.4;

  // Liga/desliga e troca de estação conforme o banco.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (ativa) {
      if (a.src !== estacao.url) {
        a.src = estacao.url;
        a.load();
      }
      a.volume = volume;
      a.play().catch(() => {
        /* autoplay bloqueado até um gesto — retentamos no gesto abaixo */
      });
    } else {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa, estacao.url]);

  // Volume da rádio (fora dos momentos de "duck").
  useEffect(() => {
    const a = audioRef.current;
    if (a && !duckRef.current) a.volume = volume;
  }, [volume]);

  // Autoplay no boot do kiosk: se o navegador bloquear, o primeiro gesto
  // (toque/clique/tecla) na TV destrava e a rádio começa.
  useEffect(() => {
    const tentar = () => {
      const a = audioRef.current;
      if (a && ativa && a.paused) a.play().catch(() => {});
    };
    window.addEventListener("pointerdown", tentar);
    window.addEventListener("keydown", tentar);
    window.addEventListener("touchstart", tentar);
    return () => {
      window.removeEventListener("pointerdown", tentar);
      window.removeEventListener("keydown", tentar);
      window.removeEventListener("touchstart", tentar);
    };
  }, [ativa]);

  // "Duck": quando um beep toca, abaixa a música ~1,5s pro aviso cortar por cima.
  useEffect(() => {
    const abaixar = () => {
      const a = audioRef.current;
      if (!a || !ativa) return;
      a.volume = Math.min(volume, volume * 0.15);
      if (duckRef.current) clearTimeout(duckRef.current);
      duckRef.current = setTimeout(() => {
        duckRef.current = null;
        if (audioRef.current) audioRef.current.volume = volume;
      }, 1500);
    };
    window.addEventListener("jura-beep", abaixar);
    return () => window.removeEventListener("jura-beep", abaixar);
  }, [ativa, volume]);

  return (
    <div className="flex items-center gap-2 text-jura-muted">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />
      {ativa && (
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-jura-red/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-jura-red" />
          </span>
          <span className="font-mono text-sm font-bold text-jura-ink">
            {estacao.nome}
          </span>
        </span>
      )}
    </div>
  );
}
