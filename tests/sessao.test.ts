import { describe, it, expect, vi, afterEach } from "vitest";
import { criarTokenSessao, verificarTokenSessao } from "@/lib/sessao";
import { mensagemErro } from "@/lib/resultado";

const SEGREDO = "segredo-de-teste-1234567890";

afterEach(() => vi.useRealTimers());

describe("sessão (login/logout via cookie assinado)", () => {
  it("token criado é aceito com o mesmo segredo", async () => {
    const token = await criarTokenSessao(SEGREDO);
    expect(await verificarTokenSessao(SEGREDO, token)).toBe(true);
  });

  it("rejeita com segredo diferente", async () => {
    const token = await criarTokenSessao(SEGREDO);
    expect(await verificarTokenSessao("outro-segredo", token)).toBe(false);
  });

  it("rejeita token adulterado", async () => {
    const token = await criarTokenSessao(SEGREDO);
    const adulterado = token.slice(0, -2) + "xx";
    expect(await verificarTokenSessao(SEGREDO, adulterado)).toBe(false);
  });

  it("rejeita vazio / ausente", async () => {
    expect(await verificarTokenSessao(SEGREDO, "")).toBe(false);
    expect(await verificarTokenSessao(SEGREDO, undefined)).toBe(false);
    expect(await verificarTokenSessao("", "abc.def")).toBe(false);
  });

  it("rejeita token expirado", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T10:00:00Z"));
    const token = await criarTokenSessao(SEGREDO);
    vi.setSystemTime(new Date("2026-07-15T10:00:00Z")); // +24h (TTL é 12h)
    expect(await verificarTokenSessao(SEGREDO, token)).toBe(false);
  });
});

describe("mensagemErro", () => {
  it("traduz sessão expirada", () => {
    expect(mensagemErro(new Error("NAO_AUTORIZADO"))).toMatch(/Sessão/);
  });
  it("mensagem genérica pro resto", () => {
    expect(mensagemErro(new Error("qualquer coisa"))).toMatch(/Não deu pra salvar/);
  });
});
