// Dados do Jurinha (bot do WhatsApp) para a Recepção e a aba "Bot".
//
// GET  /api/bot?dias=30  → pedidos, conversas pausadas, números e liga/desliga
// POST /api/bot          → { acao: "retomar", telefone } | { acao: "ativo", valor }
//
// Roda no SERVIDOR com a chave de serviço; exige a senha da recepção no
// header x-jura-senha (conferida contra ADMIN_PIN).

import { NextResponse } from "next/server";
import { ConfigFaltando, rpc, senhaValida } from "@/lib/botServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function erro(e: unknown) {
  if (e instanceof ConfigFaltando) {
    return NextResponse.json({ erro: e.message }, { status: 503 });
  }
  console.error("[api/bot]", e);
  return NextResponse.json({ erro: "Falha ao falar com o banco do bot" }, { status: 500 });
}

function naoAutorizado() {
  return NextResponse.json({ erro: "Senha da recepção inválida" }, { status: 401 });
}

export async function GET(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    const dias = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 30));
    const [pedidos, pausados, numeros, config] = await Promise.all([
      rpc("painel_atendimentos", { p_limite: 50 }),
      rpc("painel_pausados"),
      rpc("painel_numeros", { p_dias: dias }),
      rpc("painel_config"),
    ]);
    return NextResponse.json({ pedidos, pausados, numeros, config });
  } catch (e) {
    return erro(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    const body = (await req.json().catch(() => ({}))) as {
      acao?: string;
      telefone?: string;
      valor?: boolean;
    };

    if (body.acao === "retomar" && typeof body.telefone === "string" && /^\d{8,15}$/.test(body.telefone)) {
      await rpc("retomar", { p_telefone: body.telefone });
      return NextResponse.json({ ok: true });
    }
    if (body.acao === "ativo" && typeof body.valor === "boolean") {
      const ativo = await rpc<boolean>("definir_ativo", { p_ativo: body.valor });
      return NextResponse.json({ ok: true, bot_ativo: ativo });
    }
    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (e) {
    return erro(e);
  }
}
