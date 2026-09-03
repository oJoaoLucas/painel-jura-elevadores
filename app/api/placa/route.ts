// Consulta dados do veículo pela placa (API Brasil).
//
// Roda no SERVIDOR: os tokens nunca chegam ao navegador. Resultado fica em
// cache na tabela veiculos_cache (dado de placa não muda na prática), então
// a maioria das consultas do dia a dia nem chama a API externa de novo.

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function limparPlaca(v: string): string {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export async function POST(req: Request) {
  let placa = "";
  try {
    const body = await req.json();
    placa = limparPlaca(txt(body?.placa));
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (placa.length !== 7) {
    return NextResponse.json({ erro: "placa inválida" }, { status: 400 });
  }

  // 1) cache — dado de placa não muda, então nunca expira sozinho
  const { data: emCache } = await supabase
    .from("veiculos_cache")
    .select("*")
    .eq("placa", placa)
    .maybeSingle();

  if (emCache) {
    return NextResponse.json({ veiculo: emCache, fonte: "cache" });
  }

  // 2) API Brasil — precisa de conta grátis em app.apibrasil.io
  const deviceToken = process.env.APIBRASIL_DEVICE_TOKEN;
  const bearerToken = process.env.APIBRASIL_BEARER_TOKEN;
  if (!deviceToken || !bearerToken) {
    return NextResponse.json(
      { erro: "APIBRASIL_DEVICE_TOKEN / APIBRASIL_BEARER_TOKEN não configurados" },
      { status: 501 }
    );
  }

  let resposta: Response;
  try {
    resposta = await fetch("https://gateway.apibrasil.io/api/v2/vehicles/dados", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        DeviceToken: deviceToken,
        Authorization: `Bearer ${bearerToken}`,
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ placa }),
    });
  } catch {
    return NextResponse.json({ erro: "API de placa indisponível" }, { status: 502 });
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("[placa] API Brasil respondeu", resposta.status, detalhe.slice(0, 300));
    return NextResponse.json({ erro: `API de placa retornou ${resposta.status}` }, { status: 502 });
  }

  let bruto: unknown;
  try {
    bruto = await resposta.json();
  } catch {
    return NextResponse.json({ erro: "resposta ilegível da API de placa" }, { status: 502 });
  }

  const veiculo = extrairVeiculo(bruto, placa);
  if (!veiculo.marca || !veiculo.modelo) {
    // Guarda a resposta crua no log do servidor pra ajustar o mapeamento de
    // campos assim que testarmos com uma placa real — o formato exato da
    // API Brasil varia conforme o plano.
    console.error("[placa] não achei marca/modelo na resposta:", JSON.stringify(bruto).slice(0, 500));
    return NextResponse.json({ erro: "não achamos dados dessa placa" }, { status: 404 });
  }

  const { data: salvo, error } = await supabase
    .from("veiculos_cache")
    .upsert(veiculo, { onConflict: "placa" })
    .select()
    .single();

  if (error) {
    console.error("[placa] erro ao salvar cache:", error.message);
    return NextResponse.json({ veiculo, fonte: "api" });
  }

  return NextResponse.json({ veiculo: salvo, fonte: "api" });
}

// A API Brasil pode devolver os campos com nomes diferentes conforme o plano
// (maiúsculo/minúsculo, "marca_modelo" junto, etc). Tenta os formatos mais
// comuns e sempre guarda a resposta crua em "raw", pra nunca perder dado
// mesmo se o mapeamento abaixo precisar de ajuste depois de testar de verdade.
function extrairVeiculo(bruto: unknown, placa: string) {
  const obj = bruto as Record<string, unknown>;
  const nivel1 = (obj?.response ?? obj?.data ?? obj?.dados ?? obj ?? {}) as Record<string, unknown>;
  const v = (nivel1?.veiculo ?? nivel1) as Record<string, unknown>;

  const pega = (...chaves: string[]) => {
    for (const c of chaves) {
      const val = v?.[c];
      if (typeof val === "string" && val.trim()) return val.trim();
      if (typeof val === "number") return String(val);
    }
    return "";
  };

  const marcaModelo = pega("marcaModelo", "marca_modelo", "MARCA_MODELO");
  let marca = pega("marca", "MARCA", "brand");
  let modelo = pega("modelo", "MODELO", "model");
  if (!marca && marcaModelo.includes("/")) {
    const [m1, m2] = marcaModelo.split("/");
    marca = (m1 ?? "").trim();
    modelo = (m2 ?? "").trim();
  }

  const anoTexto = pega("ano", "anoModelo", "ano_modelo", "ANO", "ANO_MODELO");
  const anoMatch = anoTexto.match(/\d{4}/);
  const ano = anoMatch ? parseInt(anoMatch[0], 10) : null;

  return {
    placa,
    marca,
    modelo,
    ano,
    versao: pega("versao", "VERSAO", "version"),
    chassi: pega("chassi", "CHASSI"),
    combustivel: pega("combustivel", "COMBUSTIVEL", "fuel"),
    raw: bruto,
  };
}
