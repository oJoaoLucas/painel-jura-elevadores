// Confere a senha da recepção no servidor (ADMIN_PIN), para ela não precisar
// ir dentro do código do site.

import { NextResponse } from "next/server";
import { ConfigFaltando, limparEnv, senhaConfere } from "@/lib/botServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { senha } = (await req.json().catch(() => ({}))) as { senha?: unknown };
    if (typeof senha === "string" && senhaConfere(senha)) {
      return NextResponse.json({ ok: true });
    }
    // Diagnóstico sem expor a senha: só se a variável existe e os tamanhos.
    console.warn("[api/login] senha não confere", {
      ADMIN_PIN_definida: !!limparEnv(process.env.ADMIN_PIN),
      usando_reserva_NEXT_PUBLIC: !limparEnv(process.env.ADMIN_PIN) && !!limparEnv(process.env.NEXT_PUBLIC_ADMIN_PIN),
      tamanho_esperado: (limparEnv(process.env.ADMIN_PIN) || limparEnv(process.env.NEXT_PUBLIC_ADMIN_PIN)).length,
      tamanho_digitado: typeof senha === "string" ? limparEnv(senha).length : null,
    });
    // Atraso curto pra deixar tentativa em massa lenta.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  } catch (e) {
    if (e instanceof ConfigFaltando) return NextResponse.json({ erro: e.message }, { status: 503 });
    throw e;
  }
}
