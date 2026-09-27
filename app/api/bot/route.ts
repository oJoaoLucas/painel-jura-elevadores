// Dados do Jurinha (bot do WhatsApp) para a Recepção e a aba "Bot".
//
// GET  /api/bot?dias=30  → pedidos, pausados, números, config, dias fechados e números sem bot
// POST /api/bot          → { acao, ... }:
//   retomar {telefone} · ativo {valor} · compareceu {id, valor} · nunca_bot {telefone, valor}
//   fechado_add {data, motivo} · fechado_del {data} · arquivar {id, valor} · retorno_feito {telefone}
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

const TEL = /^\d{8,15}$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    const dias = Math.min(365, Math.max(1, Number(new URL(req.url).searchParams.get("dias")) || 30));
    const [pedidos, pausados, numeros, config, dias_fechados, ignorados, retorno] = await Promise.all([
      rpc("painel_atendimentos", { p_limite: 50 }),
      rpc("painel_pausados"),
      rpc("painel_numeros", { p_dias: dias }),
      rpc("painel_config"),
      rpc("painel_dias_fechados"),
      rpc("painel_ignorados"),
      rpc("painel_retorno", { p_dias: 30 }),
    ]);
    return NextResponse.json({ pedidos, pausados, numeros, config, dias_fechados, ignorados, retorno });
  } catch (e) {
    return erro(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const ok = () => NextResponse.json({ ok: true });

    switch (b.acao) {
      case "retomar":
        if (typeof b.telefone !== "string" || !TEL.test(b.telefone)) break;
        await rpc("retomar", { p_telefone: b.telefone });
        return ok();
      case "ativo":
        if (typeof b.valor !== "boolean") break;
        return NextResponse.json({ ok: true, bot_ativo: await rpc<boolean>("definir_ativo", { p_ativo: b.valor }) });
      case "compareceu":
        if (typeof b.id !== "number" || !(typeof b.valor === "boolean" || b.valor === null)) break;
        await rpc("marcar_compareceu", { p_id: b.id, p_valor: b.valor });
        return ok();
      case "nunca_bot":
        if (typeof b.telefone !== "string" || !TEL.test(b.telefone) || typeof b.valor !== "boolean") break;
        await rpc("definir_nunca_bot", { p_telefone: b.telefone, p_valor: b.valor });
        return ok();
      case "fechado_add":
        if (typeof b.data !== "string" || !DATA.test(b.data)) break;
        await rpc("salvar_dia_fechado", { p_data: b.data, p_motivo: typeof b.motivo === "string" ? b.motivo.slice(0, 80) : "" });
        return ok();
      case "arquivar":
        if (typeof b.id !== "number" || typeof b.valor !== "boolean") break;
        await rpc("arquivar_atendimento", { p_id: b.id, p_arquivar: b.valor });
        return ok();
      case "retorno_feito":
        if (typeof b.telefone !== "string" || !TEL.test(b.telefone)) break;
        await rpc("marcar_retorno", { p_telefone: b.telefone });
        return ok();
      case "fechado_del":
        if (typeof b.data !== "string" || !DATA.test(b.data)) break;
        await rpc("remover_dia_fechado", { p_data: b.data });
        return ok();
    }
    return NextResponse.json({ erro: "Ação inválida" }, { status: 400 });
  } catch (e) {
    return erro(e);
  }
}
