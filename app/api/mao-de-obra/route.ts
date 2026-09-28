// Relatório semanal de mão de obra (PDF do SisMaster).
//
// GET  /api/mao-de-obra            → { regras, semanas: [{ ..., linhas }] }
// POST multipart { arquivo, mes?, substituir? } → lê o PDF e grava a semana
//      409 { tipo: "ja_existe" }                 → mesmo período já salvo (mande substituir=1)
//      409 { tipo: "escolher_mes", opcoes }      → semana cruza dois meses (mande mes=AAAA-MM-01)
// POST json { acao: "regra", codigo, status } · { acao: "excluir", id } · { acao: "reprocessar", id }
//
// Servidor com a chave de serviço; exige a senha da recepção (x-jura-senha).

import { NextResponse } from "next/server";
import { ConfigFaltando, senhaValida } from "@/lib/botServidor";
import { checar, gravarLinhas, moDb, registrarCodigosNovos } from "@/lib/mao-de-obra/servidor";
import { lerRelatorio } from "@/lib/mao-de-obra/parser";
import { extrairTextoPdf } from "@/lib/mao-de-obra/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_PDF = 4 * 1024 * 1024; // a Vercel recusa corpo acima de ~4,5 MB

function erro(e: unknown) {
  if (e instanceof ConfigFaltando) return NextResponse.json({ erro: e.message }, { status: 503 });
  console.error("[api/mao-de-obra]", e);
  return NextResponse.json({ erro: "Falha ao falar com o banco" }, { status: 500 });
}
const naoAutorizado = () => NextResponse.json({ erro: "Senha da recepção inválida" }, { status: 401 });
const invalido = (msg: string) => NextResponse.json({ erro: msg }, { status: 400 });
const primeiroDoMes = (data: string) => `${data.slice(0, 7)}-01`;

export async function GET(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    const db = moDb();
    const [regras, semanas] = await Promise.all([
      db.from("mo_servicos_regra").select("codigo, nome, status").order("codigo"),
      db
        .from("mo_relatorios")
        .select(
          "id, periodo_inicio, periodo_fim, mes_referencia, origem, nome_arquivo, criado_em, servicos_manual, linhas:mo_relatorio_linhas(codigo_servico, nome_servico, tecnico, valor_centavos)",
        )
        .order("periodo_inicio", { ascending: false }),
    ]);
    return NextResponse.json({
      regras: checar(regras, "regras"),
      semanas: checar(semanas, "semanas"),
    });
  } catch (e) {
    return erro(e);
  }
}

export async function POST(req: Request) {
  try {
    if (!senhaValida(req)) return naoAutorizado();
    if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) return enviarPdf(req);

    const corpo = await req.json().catch(() => ({}));
    const db = moDb();
    switch (corpo.acao) {
      case "regra": {
        const codigo = Number(corpo.codigo);
        if (!Number.isInteger(codigo) || !["incluido", "excluido", "pendente"].includes(corpo.status)) {
          return invalido("Regra inválida");
        }
        checar(
          await db.from("mo_servicos_regra").update({ status: corpo.status, updated_at: new Date().toISOString() }).eq("codigo", codigo),
          "regra",
        );
        return NextResponse.json({ ok: true });
      }
      case "excluir": {
        if (typeof corpo.id !== "string") return invalido("Semana inválida");
        checar(await db.from("mo_relatorios").delete().eq("id", corpo.id), "excluir");
        return NextResponse.json({ ok: true });
      }
      case "reprocessar": {
        if (typeof corpo.id !== "string") return invalido("Semana inválida");
        const rel = checar(await db.from("mo_relatorios").select("id, texto_pdf").eq("id", corpo.id).single(), "semana");
        if (!rel.texto_pdf) return invalido("Semana lançada à mão: não tem PDF para reprocessar");
        const { linhas } = lerRelatorio(rel.texto_pdf);
        await registrarCodigosNovos(linhas);
        await gravarLinhas(rel.id, linhas);
        return NextResponse.json({ ok: true, linhas: linhas.length });
      }
      default:
        return invalido("Ação desconhecida");
    }
  } catch (e) {
    return erro(e);
  }
}

async function enviarPdf(req: Request) {
  const form = await req.formData();
  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File)) return invalido("Envie o PDF");
  if (arquivo.size > MAX_PDF) return invalido("PDF grande demais (máx. 4 MB)");

  let texto: string;
  try {
    texto = await extrairTextoPdf(await arquivo.arrayBuffer());
  } catch {
    return invalido("Não deu pra ler esse arquivo. É o PDF do SisMaster?");
  }
  const { periodo, linhas } = lerRelatorio(texto);
  if (!periodo) return invalido("Não achei o período (\"Por data de Venda entre ... até ...\"). É o relatório de comissões?");
  if (!linhas.length) return invalido("Não achei nenhum serviço nesse PDF.");

  // Mês de referência: o da data inicial; se a semana cruza dois meses, a loja escolhe.
  const mesInicio = primeiroDoMes(periodo.inicio);
  const mesFim = primeiroDoMes(periodo.fim);
  const pedido = String(form.get("mes") ?? "");
  let mes = mesInicio;
  if (mesInicio !== mesFim) {
    if (pedido !== mesInicio && pedido !== mesFim) {
      return NextResponse.json({ tipo: "escolher_mes", periodo, opcoes: [mesInicio, mesFim] }, { status: 409 });
    }
    mes = pedido;
  }

  const db = moDb();
  const existente: { id: string; origem: string } | null = checar(
    await db.from("mo_relatorios").select("id, origem").eq("periodo_inicio", periodo.inicio).eq("periodo_fim", periodo.fim).maybeSingle(),
    "procurar semana",
  );
  if (existente && form.get("substituir") !== "1") {
    return NextResponse.json({ tipo: "ja_existe", periodo, origem: existente.origem }, { status: 409 });
  }
  if (existente) checar(await db.from("mo_relatorios").delete().eq("id", existente.id), "substituir");

  const rel = checar(
    await db
      .from("mo_relatorios")
      .insert({
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        mes_referencia: mes,
        origem: "pdf",
        texto_pdf: texto,
        nome_arquivo: arquivo.name,
      })
      .select("id")
      .single(),
    "gravar semana",
  );
  await registrarCodigosNovos(linhas);
  await gravarLinhas(rel.id, linhas);
  return NextResponse.json({ ok: true, id: rel.id, periodo, linhas: linhas.length });
}
