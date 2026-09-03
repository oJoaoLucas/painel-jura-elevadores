// Consulta óleo recomendado (marca/modelo/ano) usando o Guia de Aplicação
// Ipiranga/Texaco. É um endpoint aberto (sem chave), mas NÃO é uma API
// pública documentada — é o backend do site deles. Por isso:
//  - roda só no servidor (nunca é chamado direto do navegador)
//  - guarda tudo em cache (oleo_cache) assim que consulta uma vez — o que já
//    foi consultado continua funcionando mesmo se esse endpoint mudar/cair
//  - marca/modelo do guia têm grafia própria (ex: "VOLKSWAGEM" com M), por
//    isso o "casamento" com o que a API de placa devolve usa lib/normalizar

import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { encontrarParecido } from "@/lib/normalizar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://www.lubesipirangaetexaco.com.br";

async function chamar<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

type VersaoGuia = {
  versao: string;
  cilindrada?: string;
  combustivel?: string;
  capLitrosMotor?: string;
  produtosLubesMotorIpiranga?: string;
  produtosLubesMotorTexaco?: string;
  produtosFiltrosOleo?: string;
};

export async function POST(req: Request) {
  let marca = "";
  let modelo = "";
  let ano = 0;
  try {
    const body = await req.json();
    marca = typeof body?.marca === "string" ? body.marca.trim() : "";
    modelo = typeof body?.modelo === "string" ? body.modelo.trim() : "";
    ano = Number(body?.ano) || 0;
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (!marca || !modelo || !ano) {
    return NextResponse.json({ erro: "marca, modelo e ano são obrigatórios" }, { status: 400 });
  }

  // 1) cache — especificação de fabricante não muda, cache é permanente
  const { data: emCache } = await supabase
    .from("oleo_cache")
    .select("*")
    .ilike("marca", marca)
    .ilike("modelo", modelo)
    .eq("ano", ano);

  if (emCache && emCache.length > 0) {
    return NextResponse.json({ versoes: emCache, fonte: "cache" });
  }

  // 2) acha a marca/modelo com a grafia exata do guia
  const marcas = (await chamar<string[]>(`/guide/brands?type=CARROS`)) ?? [];
  const marcaGuia = encontrarParecido(marca, marcas);
  if (!marcaGuia) {
    return NextResponse.json({ erro: "marca não coberta pelo guia de óleo", versoes: [] }, { status: 404 });
  }

  const modelos =
    (await chamar<string[]>(`/guide/models?brand=${encodeURIComponent(marcaGuia)}&type=CARROS`)) ?? [];
  const modeloGuia = encontrarParecido(modelo, modelos);
  if (!modeloGuia) {
    return NextResponse.json({ erro: "modelo não coberto pelo guia de óleo", versoes: [] }, { status: 404 });
  }

  const anos =
    (await chamar<number[]>(
      `/guide/years?brand=${encodeURIComponent(marcaGuia)}&model=${encodeURIComponent(modeloGuia)}&type=CARROS`
    )) ?? [];
  // ano de fabricação x ano/modelo às vezes diferem em 1 — tenta o exato e
  // depois o mais próximo dentro de 1 ano de diferença
  const anoGuia =
    anos.find((a) => a === ano) ??
    anos.filter((a) => Math.abs(a - ano) <= 1).sort((a, b) => Math.abs(a - ano) - Math.abs(b - ano))[0];
  if (!anoGuia) {
    return NextResponse.json({ erro: "ano não coberto pelo guia de óleo", versoes: [] }, { status: 404 });
  }

  const versoesBrutas =
    (await chamar<VersaoGuia[]>(
      `/guide/versions?brand=${encodeURIComponent(marcaGuia)}&model=${encodeURIComponent(
        modeloGuia
      )}&year=${anoGuia}&type=CARROS`
    )) ?? [];

  if (versoesBrutas.length === 0) {
    return NextResponse.json({ erro: "sem dados de óleo pra esse veículo", versoes: [] }, { status: 404 });
  }

  // Guarda com a marca/modelo/ano tal como a placa devolveu (não a grafia do
  // guia), pra próxima consulta do mesmo carro bater direto no cache.
  const linhas = versoesBrutas.map((v) => ({
    marca,
    modelo,
    ano,
    versao: v.versao,
    cilindrada: v.cilindrada ?? "",
    combustivel: v.combustivel ?? "",
    capacidade_litros: v.capLitrosMotor ?? "",
    produto_oleo: v.produtosLubesMotorIpiranga || v.produtosLubesMotorTexaco || "",
    filtro_oleo: v.produtosFiltrosOleo ?? "",
    raw: v,
  }));

  const { data: salvos, error } = await supabase
    .from("oleo_cache")
    .upsert(linhas, { onConflict: "marca,modelo,ano,versao" })
    .select();

  if (error) {
    console.error("[oleo] erro ao salvar cache:", error.message);
    return NextResponse.json({ versoes: linhas, fonte: "api" });
  }

  return NextResponse.json({ versoes: salvos, fonte: "api" });
}
