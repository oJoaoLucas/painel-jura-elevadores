import { describe, it, expect } from "vitest";
import {
  agregarServicos,
  agregarPorMecanico,
  tempoMedioMs,
  formatarDuracao,
} from "@/lib/metricas";
import type { Historico } from "@/lib/supabase";

function h(over: Partial<Historico>): Historico {
  return {
    id: crypto.randomUUID(),
    elevador_id: 1,
    placa: null,
    carro: null,
    servico: null,
    mecanico: null,
    entrada: null,
    saida: null,
    ...over,
  };
}

describe("agregarServicos", () => {
  it("conta cada serviço individualmente quando estão em linhas separadas", () => {
    const hist = [h({ servico: "Alinhamento\nBalanceamento" })];
    const r = Object.fromEntries(agregarServicos(hist));
    expect(r["Alinhamento"]).toBe(1);
    expect(r["Balanceamento"]).toBe(1);
  });

  it("soma o mesmo serviço vindo de carros diferentes", () => {
    const hist = [
      h({ servico: "Alinhamento\nBalanceamento" }),
      h({ servico: "Alinhamento" }),
    ];
    const r = Object.fromEntries(agregarServicos(hist));
    expect(r["Alinhamento"]).toBe(2);
    expect(r["Balanceamento"]).toBe(1);
  });

  it("ignora linhas vazias e espaços", () => {
    const hist = [h({ servico: "  Rodízio  \n\n   \nRodízio" })];
    const r = agregarServicos(hist);
    expect(r).toEqual([["Rodízio", 2]]);
  });

  it("agrupa ignorando maiúsculas/minúsculas mas mantém nome legível", () => {
    const hist = [h({ servico: "alinhamento" }), h({ servico: "Alinhamento" })];
    const r = agregarServicos(hist);
    expect(r).toHaveLength(1);
    expect(r[0][1]).toBe(2);
    expect(r[0][0]).toBe("alinhamento"); // primeira forma vista
  });

  it("ordena do mais feito ao menos", () => {
    const hist = [
      h({ servico: "A\nB" }),
      h({ servico: "B" }),
      h({ servico: "B" }),
    ];
    expect(agregarServicos(hist)[0]).toEqual(["B", 3]);
  });

  it("serviço vazio não gera categoria", () => {
    expect(agregarServicos([h({ servico: null }), h({ servico: "" })])).toEqual(
      []
    );
  });
});

describe("agregarPorMecanico", () => {
  it("conta um carro por entrada e agrupa por mecânico", () => {
    const hist = [
      h({ mecanico: "Wagner" }),
      h({ mecanico: "Wagner" }),
      h({ mecanico: "Fabio" }),
      h({ mecanico: null }),
    ];
    const r = Object.fromEntries(agregarPorMecanico(hist));
    expect(r["Wagner"]).toBe(2);
    expect(r["Fabio"]).toBe(1);
    expect(r["—"]).toBe(1);
  });
});

describe("tempoMedioMs", () => {
  it("média das durações válidas", () => {
    const base = new Date("2026-07-14T10:00:00Z").getTime();
    const hist = [
      h({
        entrada: new Date(base).toISOString(),
        saida: new Date(base + 30 * 60000).toISOString(),
      }),
      h({
        entrada: new Date(base).toISOString(),
        saida: new Date(base + 90 * 60000).toISOString(),
      }),
    ];
    expect(tempoMedioMs(hist)).toBe(60 * 60000);
  });

  it("ignora durações negativas ou sem horário", () => {
    expect(tempoMedioMs([h({ entrada: null, saida: null })])).toBe(0);
  });
});

describe("formatarDuracao", () => {
  it("formata horas e minutos", () => {
    expect(formatarDuracao(80 * 60000)).toBe("1h20");
    expect(formatarDuracao(45 * 60000)).toBe("45min");
    expect(formatarDuracao(0)).toBe("—");
    expect(formatarDuracao(-5)).toBe("—");
  });
});
