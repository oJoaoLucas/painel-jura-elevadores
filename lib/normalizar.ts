// Compara texto vindo de fontes diferentes (API de placa x Guia Ipiranga/Texaco)
// que não usam a mesma grafia de marca/modelo (ex: "VOLKSWAGEN" x "VOLKSWAGEM",
// "GOL 1.6" x "GOL").

export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Acha, numa lista de opções, a que mais se parece com o alvo:
// 1) igual normalizado; 2) uma contém a outra; 3) mais palavras em comum.
export function encontrarParecido(alvo: string, opcoes: string[]): string | null {
  if (!alvo || opcoes.length === 0) return null;
  const alvoNorm = normalizar(alvo);

  const exata = opcoes.find((o) => normalizar(o) === alvoNorm);
  if (exata) return exata;

  const contida = opcoes.find((o) => {
    const oNorm = normalizar(o);
    return alvoNorm.includes(oNorm) || oNorm.includes(alvoNorm);
  });
  if (contida) return contida;

  const palavrasAlvo = alvoNorm.split(" ").filter(Boolean);
  let melhor: { opcao: string; pontos: number } | null = null;
  for (const o of opcoes) {
    const palavrasOpcao = normalizar(o).split(" ").filter(Boolean);
    const pontos = palavrasOpcao.filter((p) => palavrasAlvo.includes(p)).length;
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) {
      melhor = { opcao: o, pontos };
    }
  }
  return melhor?.opcao ?? null;
}
