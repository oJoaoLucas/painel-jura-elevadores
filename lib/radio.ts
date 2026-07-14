// Estações de rádio gospel da TV. O índice é o que fica salvo em
// config.radio_estacao (recepção troca; TV toca). URLs pegas ao vivo na
// Radio Browser API — se alguma sair do ar, basta trocar a URL aqui.
export type Estacao = { nome: string; url: string };

export const ESTACOES: Estacao[] = [
  // — Gospel —
  { nome: "Rádio Super", url: "https://servidor32.brlogic.com:8200/live" },
  {
    nome: "Vida Melhor FM",
    url: "https://servidor32-4.brlogic.com:8480/live?source=site",
  },
  {
    nome: "BBN Gospel",
    url: "https://audio-edge-es6pf.mia.g.radiomast.io/ec065d59-f358-48c9-a288-4efc797e5860",
  },
  { nome: "PorDeus.fm", url: "https://stream.zenolive.com/92ptm8uua2zuv.aac" },

  // — Sertanejo —
  { nome: "Sertaneja 106", url: "https://sc4s.cdn.upx.com:8067/stream" },
  { nome: "Buteco Sertanejo", url: "https://stream.zeno.fm/6kumndewqbruv" },
  { nome: "Hunter Hits Brasil", url: "https://live.hunter.fm/hitsbrasil_normal" },

  // — Populares / variedades —
  {
    nome: "Mix FM",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/MIXFM_SAOPAULOAAC.aac",
  },
  {
    nome: "Alpha FM",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_ALPHAFM_ADP.aac",
  },
  {
    nome: "Kiss FM (Rock)",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/RADIO_KISSFMAAC.aac",
  },
  {
    nome: "Nova Brasil",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/NOVABRASIL_SPAAC.aac",
  },
  {
    nome: "Saudade FM",
    url: "https://playerservices.streamtheworld.com/api/livestream-redirect/SAUDADE_FMAAC.aac",
  },
];

// Garante um índice válido mesmo se a lista mudar de tamanho.
export function estacaoSegura(idx: number): number {
  return idx >= 0 && idx < ESTACOES.length ? idx : 0;
}
