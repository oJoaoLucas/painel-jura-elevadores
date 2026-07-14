"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

// Encolhe a fonte até TODO o conteúdo caber na caixa — nunca corta.
// O conteúdo deve usar tamanhos em "em" pra escalar junto.
const MIN_PX = 11; // menor fonte aceitável antes de parar de encolher

export default function AutoFitBox({
  children,
  dep,
  max = 64,
  className = "",
}: {
  children: ReactNode;
  dep?: string; // muda quando o conteúdo muda, pra re-ajustar
  max?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fontPx, setFontPx] = useState(max);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const content = contentRef.current;
    if (!box || !content) return;

    const ajustar = () => {
      let lo = MIN_PX;
      let hi = max;
      let melhor = MIN_PX;
      // busca binária pelo maior tamanho que ainda cabe (altura e largura)
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        content.style.fontSize = `${mid}px`;
        const cabe =
          content.scrollHeight <= box.clientHeight &&
          content.scrollWidth <= box.clientWidth;
        if (cabe) {
          melhor = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      content.style.fontSize = `${melhor}px`;
      setFontPx(melhor);
    };

    ajustar();
    const ro = new ResizeObserver(ajustar);
    ro.observe(box);
    return () => ro.disconnect();
  }, [dep, max]);

  return (
    <div
      ref={boxRef}
      className={`flex h-full w-full overflow-hidden ${
        className || "items-center justify-center"
      }`}
    >
      <div ref={contentRef} style={{ fontSize: fontPx, width: "100%" }}>
        {children}
      </div>
    </div>
  );
}
