"use client";

import { useEffect, useState } from "react";

// Clima de Araras-SP via open-meteo (grátis, sem chave). Atualiza a cada 15min.
const LAT = -22.3572;
const LON = -47.3842;
const URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=America%2FSao_Paulo`;

// Códigos WMO -> ícone + descrição curta
function classificar(code: number): { icone: string; texto: string } {
  if (code === 0) return { icone: "☀️", texto: "Céu limpo" };
  if (code <= 2) return { icone: "🌤️", texto: "Sol entre nuvens" };
  if (code === 3) return { icone: "☁️", texto: "Nublado" };
  if (code <= 48) return { icone: "🌫️", texto: "Neblina" };
  if (code <= 57) return { icone: "🌦️", texto: "Garoa" };
  if (code <= 67) return { icone: "🌧️", texto: "Chuva" };
  if (code <= 77) return { icone: "🌨️", texto: "Neve" };
  if (code <= 82) return { icone: "🌧️", texto: "Pancadas" };
  if (code <= 86) return { icone: "🌨️", texto: "Neve" };
  return { icone: "⛈️", texto: "Trovoada" };
}

export default function ClimaTempo() {
  const [dado, setDado] = useState<{ temp: number; code: number } | null>(null);

  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const r = await fetch(URL);
        const j = await r.json();
        if (vivo && j?.current)
          setDado({
            temp: Math.round(j.current.temperature_2m),
            code: j.current.weather_code,
          });
      } catch {
        /* sem internet — some o clima, o resto da TV segue */
      }
    };
    buscar();
    const t = setInterval(buscar, 15 * 60 * 1000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, []);

  if (!dado) return null;
  const { icone, texto } = classificar(dado.code);

  return (
    <span
      className="flex items-center gap-2"
      title={`Araras-SP · ${texto}`}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {icone}
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-mono text-xl font-bold text-jura-ink">
          {dado.temp}°
        </span>
        <span className="text-[11px] text-jura-muted">{texto}</span>
      </span>
    </span>
  );
}
