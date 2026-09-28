// Lê o texto do PDF "Relação de Comissões - Analítico" do SisMaster e devolve
// cada linha de serviço. Função pura: texto → linhas (sem banco, sem PDF).
//
// Armadilhas tratadas:
// - nome do serviço quebra linha ("ALINHAMENTO E\nBALANCEAMENTO"): todo espaço
//   em branco vira um espaço só antes do regex;
// - "Pago: 0" colado no próximo item ("Pago: 017714 ..."): o Pago é 1 dígito;
// - técnico ausente → "SEM TÉCNICO";
// - o valor que conta é o 2º R$ (Vlr total), em centavos;
// - vendas sem serviço e o rodapé ("Vendas Geral"...) não casam com o regex.

export type LinhaServico = {
  numeroVenda: number | null;
  codigo: number;
  nome: string;
  tecnico: string;
  valorCentavos: number;
};

export type Periodo = { inicio: string; fim: string }; // AAAA-MM-DD

export type ResultadoParser = {
  periodo: Periodo | null;
  linhas: LinhaServico[];
};

export const SEM_TECNICO = "SEM TÉCNICO";

const SERVICO =
  /Serviço:\s*Qnt:\s*Unit\.:\s*Vlr:\s*Técnico:\s*(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+R\$\s*([\d.]+,\d{2})\s+R\$\s*([\d.]+,\d{2})\s*(.*?)\s*Pago:\s*\d/g;

// Cabeçalho de venda: "17839 1 CONSUMIDOR R$" ou "17711 000003276 4046 NOME R$"
const VENDA = /(?:^|\s)(\d{4,6})\s+(?:\d{9}\s+)?\d{1,6}\s+[^\s\d]/g;

const PERIODO = /entre\s+(\d{2})\/(\d{2})\/(\d{4})\s+at[ée]\s+(\d{2})\/(\d{2})\/(\d{4})/i;

/** "1.234,56" → 123456 (centavos, inteiro: sem erro de float). */
export function paraCentavos(valor: string): number {
  const [reais, cent = "00"] = valor.replace(/\./g, "").split(",");
  return Number(reais) * 100 + Number(cent.padEnd(2, "0").slice(0, 2));
}

function ultimaVenda(trecho: string): number | null {
  let achado: number | null = null;
  for (const m of trecho.matchAll(VENDA)) achado = Number(m[1]);
  return achado;
}

export function lerRelatorio(textoPdf: string): ResultadoParser {
  const texto = textoPdf.replace(/\s+/g, " ");

  const p = texto.match(PERIODO);
  const periodo = p ? { inicio: `${p[3]}-${p[2]}-${p[1]}`, fim: `${p[6]}-${p[5]}-${p[4]}` } : null;

  const linhas: LinhaServico[] = [];
  let venda: number | null = null;
  let fimAnterior = 0;
  for (const m of texto.matchAll(SERVICO)) {
    // entre o serviço anterior e este pode ter começado outra venda
    const nova = ultimaVenda(texto.slice(fimAnterior, m.index));
    if (nova !== null) venda = nova;
    fimAnterior = m.index! + m[0].length;

    const tecnico = m[6].trim().toUpperCase();
    linhas.push({
      numeroVenda: venda,
      codigo: Number(m[1]),
      nome: m[2].trim(),
      tecnico: tecnico || SEM_TECNICO,
      valorCentavos: paraCentavos(m[5]),
    });
  }
  return { periodo, linhas };
}
