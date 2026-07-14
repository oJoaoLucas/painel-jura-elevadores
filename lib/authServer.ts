import "server-only";
import { cookies } from "next/headers";
import { COOKIE_SESSAO, verificarTokenSessao } from "@/lib/sessao";

// Lê o cookie de sessão e valida a assinatura+expiração (lado servidor).
export async function estaAutenticado(): Promise<boolean> {
  const token = cookies().get(COOKIE_SESSAO)?.value;
  return verificarTokenSessao(process.env.SESSION_SECRET || "", token);
}

// Barreira usada por toda Server Action que grava: lança se não há sessão.
export async function exigirSessao(): Promise<void> {
  if (!(await estaAutenticado())) {
    throw new Error("NAO_AUTORIZADO");
  }
}
