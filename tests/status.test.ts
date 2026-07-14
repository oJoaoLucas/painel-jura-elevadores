import { describe, it, expect } from "vitest";
import {
  fimContagem,
  tempoDecorrido,
  carroParado,
  estimativaRestante,
  progressoPrevisto,
} from "@/lib/status";

describe("fimContagem (pausa)", () => {
  it("sem pausa usa 'agora'", () => {
    const agora = new Date("2026-07-14T11:00:00Z");
    expect(fimContagem(null, agora)).toEqual(agora);
  });
  it("com pausa congela no instante da pausa", () => {
    const agora = new Date("2026-07-14T11:00:00Z");
    const pausa = "2026-07-14T10:30:00Z";
    expect(fimContagem(pausa, agora).toISOString()).toBe(
      "2026-07-14T10:30:00.000Z"
    );
  });
});

describe("tempoDecorrido com pausa", () => {
  it("congela o cronômetro no ponto da pausa", () => {
    const ocupado = "2026-07-14T10:00:00Z";
    const pausadoEm = "2026-07-14T10:30:00Z";
    const agora = new Date("2026-07-14T11:00:00Z");
    // fim = pausadoEm (10:30) -> 30 min, ignora a meia hora pausada
    const fim = fimContagem(pausadoEm, agora);
    expect(tempoDecorrido(ocupado, fim)).toBe("30min");
  });
  it("formata horas", () => {
    const ocupado = "2026-07-14T10:00:00Z";
    const agora = new Date("2026-07-14T11:20:00Z");
    expect(tempoDecorrido(ocupado, agora)).toBe("1h20");
  });
});

describe("carroParado", () => {
  const desde = "2026-07-14T08:00:00Z";
  it("true quando passou do limite", () => {
    expect(carroParado(desde, new Date("2026-07-14T11:30:00Z"), 3)).toBe(true);
  });
  it("false quando ainda dentro do limite", () => {
    expect(carroParado(desde, new Date("2026-07-14T10:30:00Z"), 3)).toBe(false);
  });
});

describe("estimativaRestante", () => {
  const desde = "2026-07-14T10:00:00Z";
  it("mostra minutos restantes", () => {
    const r = estimativaRestante(desde, new Date("2026-07-14T10:20:00Z"), 60);
    expect(r).toEqual({ texto: "~40min restantes", atrasado: false });
  });
  it("mostra horas restantes", () => {
    const r = estimativaRestante(desde, new Date("2026-07-14T10:10:00Z"), 90);
    expect(r).toEqual({ texto: "~1h20 restantes", atrasado: false });
  });
  it("passou do previsto", () => {
    const r = estimativaRestante(desde, new Date("2026-07-14T11:30:00Z"), 60);
    expect(r).toEqual({ texto: "passou do previsto", atrasado: true });
  });
  it("null quando não há previsão", () => {
    expect(estimativaRestante(desde, new Date(), 0)).toBeNull();
    expect(estimativaRestante(null, new Date(), 60)).toBeNull();
  });
});

describe("progressoPrevisto", () => {
  const desde = "2026-07-14T10:00:00Z";
  it("verde no começo", () => {
    const r = progressoPrevisto(desde, new Date("2026-07-14T10:15:00Z"), 60);
    expect(r?.fase).toBe("ok");
    expect(Math.round(r!.pct)).toBe(25);
  });
  it("âmbar perto do fim (>=85%)", () => {
    const r = progressoPrevisto(desde, new Date("2026-07-14T10:54:00Z"), 60);
    expect(r?.fase).toBe("perto");
  });
  it("vermelho quando estoura (pct trava em 100)", () => {
    const r = progressoPrevisto(desde, new Date("2026-07-14T11:30:00Z"), 60);
    expect(r?.fase).toBe("estourou");
    expect(r?.pct).toBe(100);
  });
});
