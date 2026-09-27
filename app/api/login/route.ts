// Confere a senha da recepção no servidor (ADMIN_PIN), para ela não precisar
// ir dentro do código do site.

import { NextResponse } from "next/server";
import { ConfigFaltando, senhaConfere } from "@/lib/botServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { senha } = (await req.json().catch(() => ({}))) as { senha?: unknown };
    if (typeof senha === "string" && senhaConfere(senha)) {
      return NextResponse.json({ ok: true });
    }
    // Atraso curto pra deixar tentativa em massa lenta.
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ erro: "Senha incorreta" }, { status: 401 });
  } catch (e) {
    if (e instanceof ConfigFaltando) return NextResponse.json({ erro: e.message }, { status: 503 });
    throw e;
  }
}
