// Conversa inteira de um cliente com o Jurinha (texto, transcrição do áudio,
// descrição e link temporário da foto/PDF). Só servidor + senha da recepção.
//
// GET /api/bot/conversa?tel=5519999999999

import { NextResponse } from "next/server";
import { ConfigFaltando, botDb, rpc, senhaValida } from "@/lib/botServidor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Mensagem = { midia_path: string | null; [k: string]: unknown };

export async function GET(req: Request) {
  try {
    if (!senhaValida(req)) return NextResponse.json({ erro: "Senha da recepção inválida" }, { status: 401 });
    const tel = new URL(req.url).searchParams.get("tel") ?? "";
    if (!/^\d{8,15}$/.test(tel)) return NextResponse.json({ erro: "Telefone inválido" }, { status: 400 });

    const dados = await rpc<{ cliente: unknown; mensagens: Mensagem[] }>("painel_conversa", { p_telefone: tel, p_limite: 80 });

    // Mídias ficam no bucket privado bot-media: gera link que expira em 1 h.
    const paths = dados.mensagens.map((m) => m.midia_path).filter((p): p is string => !!p);
    const links = new Map<string, string>();
    if (paths.length) {
      const { data } = await botDb().storage.from("bot-media").createSignedUrls(paths, 3600);
      for (const s of data ?? []) if (s.path && s.signedUrl) links.set(s.path, s.signedUrl);
    }
    return NextResponse.json({
      cliente: dados.cliente,
      mensagens: dados.mensagens.map((m) => ({ ...m, midia_url: m.midia_path ? links.get(m.midia_path) ?? null : null })),
    });
  } catch (e) {
    if (e instanceof ConfigFaltando) return NextResponse.json({ erro: e.message }, { status: 503 });
    console.error("[api/bot/conversa]", e);
    return NextResponse.json({ erro: "Falha ao carregar a conversa" }, { status: 500 });
  }
}
