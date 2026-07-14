"use server";

import { cookies } from "next/headers";
import { COOKIE_SESSAO, criarTokenSessao } from "@/lib/sessao";

// Verifica o PIN NO SERVIDOR (nunca vai pro bundle) e, se bater, cria a
// sessão em cookie httpOnly assinado. Retorna só ok/erro pro cliente.
export async function entrar(pin: string): Promise<{ ok: boolean }> {
  const esperado = (process.env.ADMIN_PIN || "").trim();
  if (!esperado || (pin || "").trim() !== esperado) return { ok: false };

  const token = await criarTokenSessao(process.env.SESSION_SECRET || "");
  cookies().set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true };
}

export async function sair(): Promise<void> {
  cookies().delete(COOKIE_SESSAO);
}
