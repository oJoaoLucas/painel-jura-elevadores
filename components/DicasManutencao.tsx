"use client";

import { useEffect, useState } from "react";

// Lembretes fixos de checagem, revezando na TV a cada ~1min.
// Lista simples, sem banco — se precisar editar, é só mexer aqui.
const DICAS = [
  "Conferir estepe",
  "Calibrar pneus",
  "Apertar rodas",
  "Verificar pressão dos pneus",
  "Checar desgaste da banda de rodagem",
  "Medir profundidade dos sulcos (TWI)",
  "Verificar desgaste irregular dos pneus",
  "Conferir válvula de ar",
  "Trocar bicos dos pneus",
  "Verificar bolhas ou deformações no pneu",
  "Conferir calibragem do estepe",
  "Inspecionar parafusos da roda",
  "Verificar travas da roda (se houver)",
  "Checar empeno da roda",
  "Verificar rodízio de pneus",
  "Fazer alinhamento da direção",
  "Verificar convergência",
  "Verificar cambagem",
  "Verificar caster",
  "Conferir alinhamento do volante",
  "Checar desgaste irregular causado por desalinhamento",
  "Verificar terminais de direção",
  "Conferir barra de direção",
  "Inspecionar caixa de direção",
  "Verificar folga na direção",
  "Checar bomba de direção hidráulica",
  "Conferir nível do fluido de direção hidráulica",
  "Verificar coifas da caixa de direção",
  "Fazer balanceamento das 4 rodas",
  "Verificar contrapesos das rodas",
  "Checar vibração no volante",
  "Conferir trepidação em alta velocidade",
  "Apertar bucha morcego",
  "Verificar coifas da suspensão",
  "Conferir amortecedores dianteiros",
  "Conferir amortecedores traseiros",
  "Verificar vazamento nos amortecedores",
  "Checar batentes de suspensão",
  "Verificar coxins do amortecedor",
  "Conferir molas da suspensão",
  "Verificar trincas nas molas",
  "Checar buchas da bandeja",
  "Verificar bandeja dianteira",
  "Conferir pivôs de suspensão",
  "Verificar folga nos pivôs",
  "Checar barra estabilizadora",
  "Verificar buchas da barra estabilizadora",
  "Conferir bieletas da suspensão",
  "Verificar ruídos na suspensão",
  "Checar altura do veículo (nivelamento)",
  "Inspecionar kit suspensão completo",
  "Conferir pastilhas de freio dianteiras",
  "Conferir pastilhas de freio traseiras",
  "Verificar discos de freio",
  "Checar espessura dos discos",
  "Verificar empeno dos discos",
  "Conferir tambores de freio",
  "Verificar lonas de freio",
  "Checar nível do fluido de freio",
  "Verificar vazamento no sistema de freios",
  "Conferir mangueiras de freio",
  "Verificar cilindro mestre",
  "Checar pedal de freio (curso e firmeza)",
  "Verificar freio de mão",
  "Conferir cabos do freio de mão",
  "Verificar servo freio",
  "Checar ruído ao frear",
  "Conferir ABS (se houver)",
  "Verificar sensores de freio ABS",
  "Trocar óleo do motor",
  "Trocar filtro de óleo",
  "Conferir nível do óleo",
  "Verificar vazamento de óleo",
  "Trocar filtro de ar",
  "Trocar filtro de cabine (ar condicionado)",
  "Trocar filtro de combustível",
  "Lubrificar pontos de suspensão",
  "Lubrificar dobradiças e trincos",
  "Verificar óleo do câmbio",
  "Conferir óleo da direção hidráulica",
  "Verificar óleo do diferencial",
  "Conferir palhetas do limpador",
  "Verificar nível da água do parabrisa",
  "Checar funcionamento dos faróis",
  "Verificar lanternas traseiras",
  "Conferir setas",
  "Verificar luz de freio",
  "Checar regulagem do farol",
  "Verificar buzina",
  "Conferir cinto de segurança",
  "Verificar estado do pneu reserva",
  "Checar macaco e chave de roda",
  "Conferir triângulo de sinalização",
  "Verificar extintor de incêndio",
  "Checar vedação das portas",
  "Verificar retrovisores",
  "Conferir folga no câmbio",
  "Verificar ponto de pegada da embreagem",
  "Fazer teste de rota final (test drive)",
];

const INTERVALO_MS = 60000;
const FADE_MS = 300;

// Texto inline "Dica: ..." no cabeçalho da TV, revezando a lista acima.
export default function DicasManutencao() {
  const [indice, setIndice] = useState(0);
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const t = setInterval(() => {
      setVisivel(false);
      setTimeout(() => {
        setIndice((i) => (i + 1) % DICAS.length);
        setVisivel(true);
      }, FADE_MS);
    }, INTERVALO_MS);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-2">
      <span className="shrink-0 font-display text-xl font-bold uppercase tracking-wide text-jura-amber/80">
        Dica:
      </span>
      <span
        className={`truncate font-display text-2xl font-extrabold uppercase tracking-wide text-jura-amber transition-opacity motion-reduce:transition-none ${
          visivel ? "opacity-100" : "opacity-0"
        }`}
        style={{ transitionDuration: `${FADE_MS}ms` }}
      >
        {DICAS[indice]}
      </span>
    </span>
  );
}
