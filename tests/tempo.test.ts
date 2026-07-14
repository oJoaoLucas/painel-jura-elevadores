import { describe, it, expect } from "vitest";
import { inicioDiaSP, periodoDesde } from "@/lib/tempo";

describe("inicioDiaSP (fuso America/Sao_Paulo, UTC-3)", () => {
  it("meia-noite do dia SP como instante UTC (03:00Z)", () => {
    const agora = new Date("2026-07-14T10:00:00Z"); // 07:00 em SP
    expect(inicioDiaSP(agora).toISOString()).toBe("2026-07-14T03:00:00.000Z");
  });

  it("respeita a virada do dia de SP (antes da meia-noite SP = dia anterior)", () => {
    // 02:00Z = 23:00 do dia 13 em SP -> início do dia SP é 13/07
    const agora = new Date("2026-07-14T02:00:00Z");
    expect(inicioDiaSP(agora).toISOString()).toBe("2026-07-13T03:00:00.000Z");
  });
});

describe("periodoDesde", () => {
  const agora = new Date("2026-07-14T10:00:00Z");
  it("'hoje' = início do dia SP", () => {
    expect(periodoDesde("hoje", agora).toISOString()).toBe(
      "2026-07-14T03:00:00.000Z"
    );
  });
  it("'7dias' = início do dia SP menos 6 dias", () => {
    expect(periodoDesde("7dias", agora).toISOString()).toBe(
      "2026-07-08T03:00:00.000Z"
    );
  });
  it("'30dias' = início do dia SP menos 29 dias", () => {
    expect(periodoDesde("30dias", agora).toISOString()).toBe(
      "2026-06-15T03:00:00.000Z"
    );
  });
});
