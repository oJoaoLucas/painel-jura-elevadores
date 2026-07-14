"use client";

import { useState } from "react";

// Mostra a logo (public/logo.png) sobre uma "placa" clara — a arte é escura
// (pneu preto + texto) e foi feita pra fundo branco, então no tema escuro
// some sem esse fundo. Se o arquivo não existir, cai no wordmark em texto.
export default function Logo({
  imgClassName = "h-12 w-auto",
  textClassName = "text-3xl",
  plate = true,
}: {
  imgClassName?: string;
  textClassName?: string;
  plate?: boolean;
}) {
  const [erro, setErro] = useState(false);

  if (erro) {
    return (
      <span className={`font-display font-extrabold uppercase tracking-wider ${textClassName}`}>
        <span className="text-jura-red">Jura</span>{" "}
        <span className="text-jura-ink">Auto Center</span>
      </span>
    );
  }

  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Jura Auto Center"
      className={imgClassName}
      onError={() => setErro(true)}
    />
  );

  if (!plate) return img;

  return (
    <span className="inline-flex items-center justify-center rounded-lg bg-white px-2.5 py-1.5 shadow-card ring-1 ring-black/10">
      {img}
    </span>
  );
}
