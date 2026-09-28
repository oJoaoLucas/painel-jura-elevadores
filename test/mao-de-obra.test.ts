import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { lerRelatorio, paraCentavos, SEM_TECNICO } from "../lib/mao-de-obra/parser";
import { calcular } from "../lib/mao-de-obra/calcular";
import { periodoCurto, reais, textoWhatsApp } from "../lib/mao-de-obra/formatar";
import { REGRAS_INICIAIS } from "../lib/mao-de-obra/regras";
import { extrairTextoPdf } from "../lib/mao-de-obra/pdf";

// Exemplo fictício no formato do SisMaster (nomes e valores inventados).
const EXEMPLO = `Relação de Comissões- Analítico SisMaster - Sistemas Inteligentes
Por data de Venda entre 01/09/2026 até 05/09/2026
Serviço: Todos
NºVenda Nota F. CodCli Nome do Cliente Valor Serviço / M.O. Desc. Serv.
10001 1 CONSUMIDOR R$ 499,90 R$ 359,90
Serviço: Qnt: Unit.: Vlr: Técnico:1 MAO DE OBRA 1 R$ 280,00 R$ 280,00 TECNICO A Pago: 0
Serviço: Qnt: Unit.: Vlr: Técnico:4 ALINHAMENTO E
BALANCEAMENTO
1 R$ 80,00 R$ 79,90 TECNICO B Pago: 0
10002 000003276 4046 Fulana de Tal R$ 1.919,50 R$ 1.739,90
Serviço: Qnt: Unit.: Vlr: Técnico:54 MAO DE OBRA
AMORTECEDORES
2 R$ 20,00 R$ 40,00 Pago: 0Serviço: Qnt: Unit.: Vlr: Técnico:1 MAO DE OBRA 1 R$ 1.500,00 R$ 1.500,00 TECNICO B Pago: 010004 4048 CICLANO R$ 99,00 R$ 99,00
Serviço: Qnt: Unit.: Vlr: Técnico:99 SERVICO NOVO 1 R$ 99,00 R$ 99,00 TECNICO A Pago: 0
10005 3727 BELTRANO R$ 179,90 R$ 0,00
Vendas Geral
Total Geral das Vendas:
R$ 104.908,50`;

test("centavos no formato brasileiro", () => {
  assert.equal(paraCentavos("1.234,56"), 123456);
  assert.equal(paraCentavos("79,90"), 7990);
  assert.equal(paraCentavos("0,00"), 0);
});

test("parser: período, nome quebrado, NF no meio, Pago colado, sem técnico, 2º R$", () => {
  const { periodo, linhas } = lerRelatorio(EXEMPLO);
  assert.deepEqual(periodo, { inicio: "2026-09-01", fim: "2026-09-05" });
  assert.deepEqual(
    linhas.map((l) => [l.numeroVenda, l.codigo, l.nome, l.tecnico, l.valorCentavos]),
    [
      [10001, 1, "MAO DE OBRA", "TECNICO A", 28000],
      [10001, 4, "ALINHAMENTO E BALANCEAMENTO", "TECNICO B", 7990],
      [10002, 54, "MAO DE OBRA AMORTECEDORES", SEM_TECNICO, 4000],
      [10002, 1, "MAO DE OBRA", "TECNICO B", 150000],
      [10004, 99, "SERVICO NOVO", "TECNICO A", 9900],
    ],
  );
});

test("cálculo: só incluídos somam; excluído vai pra observação; código novo fica pendente", () => {
  const r = calcular(lerRelatorio(EXEMPLO).linhas, REGRAS_INICIAIS);
  assert.equal(r.totalCentavos, 28000 + 4000 + 150000);
  assert.deepEqual(r.porTecnico, [
    { nome: "TECNICO B", centavos: 150000 },
    { nome: "TECNICO A", centavos: 28000 },
    { nome: SEM_TECNICO, centavos: 4000 },
  ]);
  assert.deepEqual(r.excluidos, [{ nome: "ALINHAMENTO E BALANCEAMENTO", centavos: 7990 }]);
  assert.deepEqual(r.pendentes, [{ codigo: 99, nome: "SERVICO NOVO", centavos: 9900, vezes: 1 }]);

  // decidiu que entra → recalcula
  const r2 = calcular(lerRelatorio(EXEMPLO).linhas, [...REGRAS_INICIAIS, { codigo: 99, nome: "SERVICO NOVO", status: "incluido" }]);
  assert.equal(r2.totalCentavos, 28000 + 4000 + 150000 + 9900);
  assert.equal(r2.pendentes.length, 0);
});

test("texto do WhatsApp: formato, período e soma do mês", () => {
  const relatorio = calcular(lerRelatorio(EXEMPLO).linhas, REGRAS_INICIAIS);
  const texto = textoWhatsApp({
    periodo: { inicio: "2026-09-01", fim: "2026-09-05" },
    relatorio,
    mesReferencia: "2026-09-01",
    semanasDoMes: [100000, relatorio.totalCentavos],
  });
  assert.equal(
    texto,
    [
      "RELATÓRIO SEMANAL - MÃO DE OBRA",
      "01/09 a 05/09/2026",
      "",
      "POR TÉCNICO",
      "TECNICO B: R$ 1.500,00",
      "TECNICO A: R$ 280,00",
      "SEM TÉCNICO: R$ 40,00",
      "",
      "POR TIPO DE SERVIÇO",
      "MAO DE OBRA: R$ 1.780,00",
      "MAO DE OBRA AMORTECEDORES: R$ 40,00",
      "",
      "TOTAL GERAL: R$ 1.820,00",
      "",
      "TOTAL MÊS DE SETEMBRO: R$ 2.820,00",
      "(R$ 1.000,00 + R$ 1.820,00)",
    ].join("\n"),
  );
  assert.equal(periodoCurto({ inicio: "2025-12-29", fim: "2026-01-03" }), "29/12/2025 a 03/01/2026");
  assert.equal(reais(2060700), "R$ 20.607,00");
});

// ---- PDFs reais (fora do Git): fixtures/mo/AAAA-MM-DD.pdf + esperado.json ----
const ESPERADO = "fixtures/mo/esperado.json";
const esperado = existsSync(ESPERADO) ? JSON.parse(readFileSync(ESPERADO, "utf8")) : { semanas: {}, totalMes: {} };
const cent = (v: string) => paraCentavos(v);

for (const [inicio, e] of Object.entries<any>(esperado.semanas)) {
  const arquivo = `fixtures/mo/${inicio}.pdf`;
  test(`PDF real ${inicio} bate com o conferido à mão`, { skip: !existsSync(arquivo) && "PDF não está em fixtures/mo" }, async () => {
    const { periodo, linhas } = lerRelatorio(await extrairTextoPdf(readFileSync(arquivo)));
    assert.equal(periodo?.inicio, inicio);
    const r = calcular(linhas, REGRAS_INICIAIS);
    assert.equal(reais(r.totalCentavos), reais(cent(e.total)));
    assert.deepEqual(
      Object.fromEntries(r.porTecnico.map((t) => [t.nome, reais(t.centavos)])),
      Object.fromEntries(Object.entries<string>(e.tecnicos).map(([k, v]) => [k, reais(cent(v))])),
    );
    if (e.servicos) {
      assert.deepEqual(
        Object.fromEntries(r.porServico.map((s) => [s.nome, reais(s.centavos)])),
        Object.fromEntries(Object.entries<string>(e.servicos).map(([k, v]) => [k, reais(cent(v))])),
      );
    }
  });
}

test("total do mês com as semanas conferidas", () => {
  for (const [mes, total] of Object.entries<string>(esperado.totalMes)) {
    const semanas = Object.entries<any>(esperado.semanas).filter(([i]) => i.slice(0, 7) === mes.slice(0, 7)).map(([, e]) => cent(e.total));
    assert.equal(reais(semanas.reduce((a, b) => a + b, 0)), reais(cent(total)));
  }
});
