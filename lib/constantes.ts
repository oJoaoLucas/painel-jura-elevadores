// Serviços padrão (caixas de seleção). O resto vai no campo livre.
export const SERVICOS_PADRAO = [
  "Alinhamento",
  "Balanceamento",
  "Rodízio",
  "Troca de óleo",
];

// Junta os serviços marcados + o texto livre num único campo (uma linha cada)
export function montarServico(selecionados: string[], extra: string): string {
  const linhas = [...selecionados];
  const ex = (extra || "").trim();
  if (ex) {
    linhas.push(
      ...ex
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
    );
  }
  return linhas.join("\n");
}

// Separa de volta em serviços marcados + texto livre (pra editar)
export function separarServico(servico: string | null): {
  selecionados: string[];
  extra: string;
} {
  if (!servico) return { selecionados: [], extra: "" };
  const linhas = servico
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const selecionados: string[] = [];
  const extra: string[] = [];
  for (const l of linhas) {
    const padrao = SERVICOS_PADRAO.find(
      (s) => s.toLowerCase() === l.toLowerCase()
    );
    if (padrao && !selecionados.includes(padrao)) selecionados.push(padrao);
    else extra.push(l);
  }
  return { selecionados, extra: extra.join("\n") };
}
