// Interpreta o comando falado da Recepção usando a API da OpenAI.
//
// Roda no SERVIDOR: a chave (OPENAI_API_KEY) nunca chega ao navegador.
// Se a chave não estiver configurada, ou a OpenAI falhar, devolve erro e o
// cliente (lib/voz-comando.ts) cai sozinho no parser local — o botão nunca
// deixa a recepção na mão.
//
// O resultado NÃO executa nada: vai pra tela de confirmação da Recepção.

import { NextResponse } from "next/server";
import { SERVICOS_PADRAO } from "@/lib/constantes";

export const runtime = "nodejs";
// Sempre dinâmico: cada comando é diferente, não faz sentido cachear.
export const dynamic = "force-dynamic";

const MODELO_OPENAI = "gpt-4o-mini";

// Formato fixo da resposta (mesmo shape pras duas IAs). Um objeto plano (em
// vez de união de tipos) porque o modo "strict"/schema exige todas as
// chaves presentes; o cliente é quem monta o Comando final a partir daqui.
const CAMPOS = [
  "acao",
  "elevador",
  "placa",
  "carro",
  "servico",
  "mecanico",
  "previsto_min",
  "texto",
  "destinatario",
  "prioridade",
  "motivo",
] as const;

const ACOES = [
  "ocupar",
  "aguardando",
  "fila",
  "lembrete",
  "liberar",
  "pronto",
  "pausar",
  "retomar",
  "limpar",
  "nada",
] as const;

// Schema fixo da resposta (JSON Schema / draft-7). Um objeto plano (em vez
// de união de tipos) porque o modo "strict" da OpenAI exige todas as chaves
// presentes; o cliente é quem monta o Comando final a partir daqui.
const SCHEMA_OPENAI = {
  type: "object",
  additionalProperties: false,
  required: CAMPOS,
  properties: {
    acao: { type: "string", enum: ACOES },
    elevador: { type: ["integer", "null"], description: "1 a 4, ou null" },
    placa: { type: "string", description: "Placa em maiúsculas, ou vazio" },
    carro: { type: "string", description: "Só o modelo do carro" },
    servico: { type: "string", description: "Serviços, um por linha" },
    mecanico: { type: "string" },
    previsto_min: { type: ["integer", "null"] },
    texto: { type: "string", description: "Conteúdo do lembrete" },
    destinatario: { type: "string" },
    prioridade: { type: "string", enum: ["normal", "urgente"] },
    motivo: { type: "string", description: "Por que não entendeu (acao=nada)" },
  },
} as const;

function instrucoes(mecanicos: string[]): string {
  return `Você transforma a fala da recepção de uma oficina mecânica em um comando estruturado.
A oficina tem 4 elevadores (1 a 4).

AÇÕES:
- "ocupar": pôr um carro num elevador, OU acrescentar mais serviço a um carro
  que já está lá (a recepção repete o carro nem sempre). Ex: "elevador 2
  Corolla troca de óleo" (carro novo) ou "elevador 2 troca também o filtro"
  (só acrescenta — pode deixar "carro" e "placa" vazios, o sistema mantém o
  que já estava).
- "aguardando": carro chegou e espera vaga, sem elevador definido.
- "fila": mandar pra fila de alinhamento. Só quando falarem "fila" ou "pra alinhar".
- "lembrete": recado/aviso. Ex: "recado pro João comprar filtro".
- "liberar": carro saiu, libera o elevador inteiro (carro/placa/serviço somem
  e vai pro histórico). Ex: "liberar elevador 3".
- "pronto": serviço terminou. Ex: "elevador 2 pronto".
- "pausar" / "retomar": pausa ou retoma o cronômetro (almoço).
- "limpar": apaga só o SERVIÇO escrito de um elevador, mantendo carro, placa
  e mecânico como estão (o carro continua lá, só o texto do serviço some).
  Ex: "limpar o elevador 3", "apaga o que tá escrito no elevador 2". NÃO usar
  "liberar" pra isso — "liberar" tira o carro inteiro do elevador.
- "nada": a fala não é um comando. Explique em "motivo".

REGRAS IMPORTANTES:
- CARRO x SERVIÇO: "carro" é SÓ o modelo (Gol, Corolla, HB20, Strada 1.4).
  Marca de peça NÃO é carro. "pneu Goodyear" e "amortecedor Monroe" são SERVIÇO.
  Em "elevador 1 Palio pneu Goodyear": carro="Palio", servico="Pneu Goodyear".
- SERVIÇO é texto livre, um por linha. Escreva do jeito natural, mantendo marca
  e detalhe que a pessoa falou. Quando o serviço for exatamente um destes,
  use a grafia idêntica pra casar com os botões da tela:
  ${SERVICOS_PADRAO.map((s) => `"${s}"`).join(", ")}.
  Se a pessoa usar "+" pra separar itens (ex: "amortecedor + kit + pivô"),
  cada item vira uma linha separada.
  Palavras como "acrescentar", "adicionar", "também" e "mais" só indicam que é uma
  ATUALIZAÇÃO — nunca são carro nem serviço. Em "elevador 3 acrescentar
  amortecedor": servico="Amortecedor" (SEM a palavra "acrescentar" em lugar
  nenhum).
- PLACA: normalmente NÃO é falada. Só preencha se ouvir claramente uma placa
  (3 letras + 4 caracteres, ex: ABC1D23). Caso contrário deixe vazio.
- MECÂNICO: use exatamente um destes nomes, ou vazio se não citarem:
  ${mecanicos.length ? mecanicos.map((m) => `"${m}"`).join(", ") : "(nenhum cadastrado)"}.
  Em "lembrete" o nome vai no campo "destinatario" (não em "mecanico").
  Nos demais tipos de ação o nome vai no campo "mecanico" (não em "destinatario").
- previsto_min: total em MINUTOS. "1 hora e 30" = 90. null se não falarem.
- Campos que não se aplicam à ação: string vazia ou null.
- Nunca invente placa, mecânico ou serviço que não foi falado.`;
}

export async function POST(req: Request) {
  const chave = process.env.OPENAI_API_KEY;
  if (!chave) {
    return NextResponse.json(
      { erro: "OPENAI_API_KEY não configurada" },
      { status: 501 }
    );
  }

  let texto = "";
  let mecanicos: string[] = [];
  try {
    const body = await req.json();
    texto = typeof body?.texto === "string" ? body.texto.slice(0, 500) : "";
    mecanicos = Array.isArray(body?.mecanicos)
      ? body.mecanicos.filter((m: unknown) => typeof m === "string").slice(0, 40)
      : [];
  } catch {
    return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  }

  if (!texto.trim()) {
    return NextResponse.json({ erro: "texto vazio" }, { status: 400 });
  }

  let resposta: Response;
  try {
    resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${chave}`,
      },
      // Se a OpenAI demorar demais, desiste: o parser local resolve na hora.
      signal: AbortSignal.timeout(12000),
      body: JSON.stringify({
        model: MODELO_OPENAI,
        temperature: 0,
        messages: [
          { role: "system", content: instrucoes(mecanicos) },
          { role: "user", content: texto },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "comando", strict: true, schema: SCHEMA_OPENAI },
        },
      }),
    });
  } catch {
    return NextResponse.json({ erro: "OpenAI indisponível" }, { status: 502 });
  }

  if (!resposta.ok) {
    const detalhe = await resposta.text().catch(() => "");
    console.error("[voz] OpenAI respondeu", resposta.status, detalhe.slice(0, 300));
    return NextResponse.json(
      { erro: `OpenAI ${resposta.status}` },
      { status: 502 }
    );
  }

  let cru: Record<string, unknown>;
  try {
    const json = await resposta.json();
    cru = JSON.parse(json.choices[0].message.content);
  } catch {
    return NextResponse.json({ erro: "resposta ilegível" }, { status: 502 });
  }

  const comando = montarComando(cru, mecanicos);
  if (!comando) {
    return NextResponse.json({ erro: "comando inválido" }, { status: 502 });
  }

  return NextResponse.json({ comando });
}

// Confere o que o modelo devolveu antes de mandar pra tela. O modelo erra
// menos com schema, mas elevador fora de 1..4 ou mecânico inventado quebraria
// a gravação — melhor limpar aqui.
function montarComando(c: Record<string, unknown>, mecanicos: string[]) {
  const txt = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
  // A OpenAI pode devolver "João" numa forma Unicode diferente da que
  // mandamos (acento como caractere combinado x pré-composto) — normaliza
  // os dois lados antes de comparar, senão o nome bate mas o match falha.
  const norm = (s: string) => s.normalize("NFC").toLowerCase();

  const elevador = num(c.elevador);
  const elevadorOk = elevador !== null && elevador >= 1 && elevador <= 4;
  // Só aceita mecânico que exista de verdade no cadastro
  const mecanico = mecanicos.find((m) => norm(m) === norm(txt(c.mecanico)))
    ? txt(c.mecanico)
    : "";
  const placa = txt(c.placa).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const carro = txt(c.carro);
  const servico = txt(c.servico);

  switch (c.acao) {
    case "liberar":
    case "pronto":
    case "pausar":
    case "retomar":
    case "limpar":
      if (!elevadorOk) return null;
      return { acao: c.acao, elevador };

    case "lembrete": {
      const texto = txt(c.texto);
      if (!texto) return null;
      // Lembrete usa "destinatario" (não "mecanico") — mesma validação:
      // só aceita quem está de fato cadastrado.
      const destinatario = mecanicos.find(
        (m) => norm(m) === norm(txt(c.destinatario))
      )
        ? txt(c.destinatario)
        : "";
      return {
        acao: "lembrete",
        texto,
        destinatario,
        prioridade: c.prioridade === "urgente" ? "urgente" : "normal",
      };
    }

    case "fila":
      if (!placa && !carro) return null;
      return { acao: "fila", placa, carro };

    case "aguardando":
      if (!placa && !carro) return null;
      return { acao: "aguardando", placa, carro, servico, mecanico };

    case "ocupar": {
      // Sem carro/placa só é válido se for uma ATUALIZAÇÃO (elevador +
      // serviço, acrescentando ao que já está lá — decidido na confirmação).
      if (!placa && !carro && !(elevadorOk && servico)) return null;
      // Falou serviço mas esqueceu o elevador: vira "aguardando"
      if (!elevadorOk)
        return { acao: "aguardando", placa, carro, servico, mecanico };
      const previsto = num(c.previsto_min);
      return {
        acao: "ocupar",
        elevador,
        placa,
        carro,
        servico,
        mecanico,
        previsto_min: previsto && previsto > 0 ? previsto : null,
      };
    }

    default:
      return { acao: "nada", motivo: txt(c.motivo) || "Não entendi." };
  }
}
