import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, verificarTokenSessao } from "@/lib/sessao";

// Protege as telas de gestão: sem sessão válida, redireciona pro /login.
// A TV (/painel) e a home (/) continuam públicas.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE_SESSAO)?.value;
  const ok = await verificarTokenSessao(
    process.env.SESSION_SECRET || "",
    token
  );
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("de", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/orcamento/:path*",
    "/precos/:path*",
    "/relatorio/:path*",
    "/configuracoes/:path*",
  ],
};
