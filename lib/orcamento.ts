// Cálculo e texto do orçamento de pneus pro WhatsApp. Usado na tela Orçamento
// e no mini orçamento da aba Bot — os dois geram exatamente o mesmo texto.

// Tabela de taxas do cartão (não existe 11x)
export const TAXAS: Record<number, number> = {
  1: 0.04,
  2: 0.05,
  3: 0.055,
  4: 0.065,
  5: 0.07,
  6: 0.075,
  7: 0.085,
  8: 0.09,
  9: 0.1,
  10: 0.11,
  12: 0.12,
};
export const PARCELAS_OPCOES = Object.keys(TAXAS)
  .map(Number)
  .sort((a, b) => a - b);

// Arredonda pra cima até terminar em ,90 (ex: 77,66 -> 77,90 ; 77,95 -> 78,90)
export function arredondarPara90(valor: number): number {
  const base = Math.floor(valor + 1e-9);
  const candidato = base + 0.9;
  return candidato >= valor - 1e-9 ? candidato : base + 1.9;
}

// Formata número como moeda brasileira sem o "R$" (ex: 1234.9 -> "1.234,90")
export function fmt(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Converte texto digitado ("1.234,56" ou "1234.56" ou "1234,56") em número
export function parseValor(texto: string): number {
  const limpo = texto
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = parseFloat(limpo);
  return isNaN(n) ? 0 : n;
}

export function valorParcela(valorAVista: number, parcelas: number): number {
  return arredondarPara90((valorAVista * (1 + (TAXAS[parcelas] ?? 0))) / parcelas);
}

/** Texto pronto pro WhatsApp. `opcoes` = modelos com o valor à vista TOTAL (todos os pneus). */
export function textoOrcamento(o: {
  medida: string;
  qtdPneus: number;
  parcelas: number;
  bicos: boolean;
  opcoes: { modelo: string; valorNum: number }[];
}): string {
  const linhas: string[] = [];
  linhas.push(
    `Valores referentes a ${o.qtdPneus} ${o.qtdPneus === 1 ? "pneu" : "pneus"} ${o.medida.trim()} e já incluso:`
  );
  linhas.push("✅ Alinhamento");
  linhas.push("✅ Balanceamento");
  if (o.bicos) linhas.push("✅ Bicos novos");
  linhas.push("");
  o.opcoes.forEach((op) => {
    linhas.push(op.modelo.trim());
    linhas.push(`À vista: R$ ${fmt(op.valorNum)}`);
    linhas.push(`Ou até ${o.parcelas}x de R$ ${fmt(valorParcela(op.valorNum, o.parcelas))}`);
    linhas.push("");
  });
  linhas.push(
    "Obs.: valor para pneus montados na loja e à base de troca e preço à vista válido para Pix, débito ou dinheiro."
  );
  return linhas.join("\n");
}

export async function copiarTexto(texto: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    // fallback p/ navegadores sem clipboard API
    const ta = document.createElement("textarea");
    ta.value = texto;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}
