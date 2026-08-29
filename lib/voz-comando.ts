// Interpreta um comando falado (ou ditado pelo teclado do celular) e devolve
// uma AÇÃO estruturada para a Recepção confirmar antes de executar.
//
// Nada aqui executa nada: o parser só ADIVINHA. Quem decide é a tela de
// confirmação — placa reconhecida por voz erra demais pra rodar às cegas.
//
// Hoje roda 100% local (custo zero). A função `interpretar()` já está
// preparada pra, no futuro, consultar uma IA: se a rota /api/voz existir e
// responder, o resultado dela ganha; senão cai no parser local.

import { SERVICOS_PADRAO } from "@/lib/constantes";

export type Comando =
  | {
      acao: "ocupar";
      elevador: number;
      placa: string;
      carro: string;
      servico: string;
      mecanico: string;
      previsto_min: number | null;
    }
  | {
      acao: "aguardando";
      placa: string;
      carro: string;
      servico: string;
      mecanico: string;
    }
  | { acao: "fila"; placa: string; carro: string }
  | {
      acao: "lembrete";
      texto: string;
      destinatario: string;
      prioridade: "normal" | "urgente";
    }
  | { acao: "liberar" | "pronto" | "pausar" | "retomar" | "limpar"; elevador: number }
  | { acao: "nada"; motivo: string };

// ---------------------------------------------------------------- utilidades

export function semAcento(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const chave = (s: string) =>
  semAcento(s.toLowerCase()).replace(/\s+/g, " ").trim();

// Números por extenso que a fala costuma devolver
const NUMEROS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  meia: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

// Letras ditadas ("a bê cê") — só aplicado dentro do trecho da placa
const LETRAS: Record<string, string> = {
  a: "A",
  be: "B",
  ce: "C",
  de: "D",
  e: "E",
  efe: "F",
  ge: "G",
  aga: "H",
  i: "I",
  jota: "J",
  ka: "K",
  ele: "L",
  eme: "M",
  ene: "N",
  o: "O",
  pe: "P",
  que: "Q",
  erre: "R",
  esse: "S",
  te: "T",
  u: "U",
  ve: "V",
  xis: "X",
  ipsilon: "Y",
  ze: "Z",
};

function numeroDe(palavra: string): number | null {
  const p = chave(palavra);
  if (/^\d+$/.test(p)) return parseInt(p, 10);
  return p in NUMEROS ? NUMEROS[p] : null;
}

// -------------------------------------------------------------------- placa
// Placa Mercosul (ABC1D23) e antiga (ABC1234) casam no mesmo formato:
// 3 letras + dígito + letra-ou-dígito + 2 dígitos.
const FORMATO_PLACA = /[A-Z]{3}\d[A-Z\d]\d{2}/;
// Mesma coisa, tolerando espaço/hífen entre os pedaços ("ABC 1 D 23")
const PLACA_SOLTA = /[A-Z]{3}[\s-]*\d[\s-]*[A-Z\d][\s-]*\d{2}/;

// Devolve a placa encontrada E o texto sem ela, pra quem for montar o campo
// "carro" não herdar os pedaços da placa.
export function extrairPlaca(texto: string): { placa: string; resto: string } {
  // 1) Placa escrita/falada de forma reconhecível no próprio texto
  const direto = semAcento(texto).toUpperCase().match(PLACA_SOLTA);
  if (direto) {
    return {
      placa: direto[0].replace(/[\s-]/g, ""),
      resto:
        texto.slice(0, direto.index!) +
        " " +
        texto.slice(direto.index! + direto[0].length),
    };
  }

  // 2) Placa ditada letra por letra ("a bê cê um dê dois três"): converte
  // cada palavra num caractere, cola tudo e procura o formato.
  const tokens = chave(texto).split(/[\s\-.]+/).filter(Boolean);
  let colado = "";
  const faixas: { ini: number; fim: number; token: number }[] = [];
  tokens.forEach((t, i) => {
    let out = " ";
    if (/^\d+$/.test(t)) out = t;
    else if (t in NUMEROS) out = String(NUMEROS[t]);
    else if (t in LETRAS) out = LETRAS[t];
    faixas.push({ ini: colado.length, fim: colado.length + out.length, token: i });
    colado += out;
  });

  const m = colado.match(FORMATO_PLACA);
  if (!m) return { placa: "", resto: texto };

  // Tira do texto as palavras que viraram a placa
  const ini = m.index!;
  const fim = ini + m[0].length;
  const usados = new Set(
    faixas.filter((f) => f.fim > ini && f.ini < fim).map((f) => f.token)
  );
  const resto = tokens.filter((_, i) => !usados.has(i)).join(" ");
  return { placa: m[0], resto };
}

export function acharPlaca(texto: string): string {
  return extrairPlaca(texto).placa;
}

// ----------------------------------------------------------------- elevador
function acharElevador(t: string): number | null {
  const m =
    t.match(/\belevador(?:\s+(?:numero|n))?\s+([a-z0-9]+)/) ||
    t.match(/\b(?:no|box)\s+([a-z0-9]+)\b/);
  if (!m) return null;
  const n = numeroDe(m[1]);
  return n !== null && n >= 1 && n <= 4 ? n : null;
}

// ------------------------------------------------------------- tempo previsto
function acharPrevisto(t: string): number | null {
  let total = 0;
  const h = t.match(/([a-z0-9]+)\s*(?:h\b|horas?\b)/);
  const min = t.match(/([a-z0-9]+)\s*(?:min\b|minutos?\b)/);
  if (h) total += (numeroDe(h[1]) ?? 0) * 60;
  if (min) total += numeroDe(min[1]) ?? 0;
  return total > 0 ? total : null;
}

// ----------------------------------------------------------------- serviços
// Tira acento preservando o tamanho da string, pra dar pra recortar o texto
// ORIGINAL (com acento) pelos índices achados na versão sem acento.
function semAcentoIso(s: string): string {
  return s
    .split("")
    .map((c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "") || c)
    .join("");
}

// Vocabulário de oficina. Não precisa ser exaustivo: o que não cair aqui vira
// texto livre no campo de serviço, que a recepção ajusta na confirmação.
const TERMOS_SERVICO = [
  "correia dentada", "caixa de direcao", "ar condicionado", "motor de partida",
  "alinhamento", "balanceamento", "cambagem", "geometria", "rodizio",
  "amortecedor", "amortecedores", "escapamento", "catalisador", "alternador",
  "embreagem", "suspensao", "diagnostico", "injecao", "radiador", "retentor",
  "pastilha", "pastilhas", "bieleta", "bandeja", "revisao", "bateria",
  "correia", "mangueira", "terminal", "scanner", "direcao", "lampada",
  "eletrica", "eletrico", "sangria", "filtro", "cambio", "freio", "freios",
  "disco", "discos", "junta", "coxim", "bomba", "motor", "mola", "molas",
  "vela", "velas", "farol", "pneu", "pneus", "roda", "rodas", "pivo",
  "lona", "lonas", "oleo", "luz",
];

// Verbos que costumam vir grudados ("troca de correia", "arrumar o freio")
const PREFIXO_SERVICO =
  "(?:troca(?:r| de)?|trocar|revisar|revisao de|arrumar|consertar|verificar|olhar|regular|sangrar|ver)\\s+(?:o |a |os |as |do |da |de )?";

// Complemento do serviço ("revisão DE FREIO", "pastilha DE FREIO"). Só engole
// a palavra seguinte se ela também for termo de oficina — senão "alinhamento
// do Gol" comeria o carro.
const SUFIXO_SERVICO = `(?:\\s+(?:de|do|da)\\s+(?:${[...TERMOS_SERVICO]
  .sort((a, b) => b.length - a.length)
  .join("|")})s?)?`;

// Alguns termos viram os chips oficiais da tela, pra continuarem marcáveis
const CANONICO: Record<string, string> = {
  alinhamento: "Alinhamento",
  balanceamento: "Balanceamento",
  rodizio: "Rodízio",
  oleo: "Troca de óleo",
  "troca de oleo": "Troca de óleo",
  "trocar oleo": "Troca de óleo",
  "troca oleo": "Troca de óleo",
};

// Devolve os serviços encontrados e o texto sem eles (o resto vira o carro).
//
// Faz em duas etapas — acha TODOS os jeitos possíveis de casar um termo
// antes de decidir qualquer coisa, depois escolhe os que não se sobrepõem
// dando prioridade ao trecho mais LONGO. Isso importa porque "disco de
// freio" bate tanto com o termo "disco" (virando "disco de freio" via
// sufixo) quanto sozinho com o termo "freio" — se "freio" fosse aceito
// primeiro (e apagado do texto), "disco" perderia o sufixo e sobrariam dois
// serviços soltos em vez de um só.
function extrairServicos(texto: string): { servicos: string[]; resto: string } {
  const restoIso = semAcentoIso(texto).toLowerCase();
  const ordenados = [...TERMOS_SERVICO].sort((a, b) => b.length - a.length);

  type Candidato = { ini: number; fim: number; nome: string };
  const candidatos: Candidato[] = [];

  for (const termo of ordenados) {
    const re = new RegExp(
      `\\b(?:${PREFIXO_SERVICO})?${termo}s?${SUFIXO_SERVICO}\\b`,
      "gi"
    );
    let m: RegExpExecArray | null;
    while ((m = re.exec(restoIso))) {
      let fim = m.index + m[0].length;
      let achado = texto.slice(m.index, fim).trim();

      // Marca colada em seguida ("pneu Goodyear", "amortecedor Monroe"): pega
      // a palavra logo depois se vier com inicial maiúscula (nome próprio) —
      // sem precisar de uma lista fechada de marcas.
      const seguinte = texto.slice(fim).match(/^\s+([A-ZÀ-Ý][\wÀ-ÿ]*)/);
      let marca = "";
      if (seguinte && !/^(o|a|os|as|do|da|de|no|na|com)$/i.test(seguinte[1])) {
        marca = seguinte[1];
        achado += " " + marca;
        fim += seguinte[0].length;
      }

      // Serviço "de menu" (chip da tela) mantém o nome padrão pra continuar
      // marcável — mas sem perder a marca ditada junto ("Troca de óleo Mobil").
      const canon =
        CANONICO[semAcentoIso(achado).toLowerCase()] || CANONICO[termo];
      const nome = canon
        ? marca
          ? `${canon} ${marca}`
          : canon
        : achado.charAt(0).toUpperCase() + achado.slice(1);

      candidatos.push({ ini: m.index, fim, nome });
      if (re.lastIndex === m.index) re.lastIndex++; // segurança: match vazio
    }
  }

  // Mais longo primeiro; em empate, o que aparece antes no texto
  candidatos.sort((a, b) => b.fim - b.ini - (a.fim - a.ini) || a.ini - b.ini);

  const usados: { ini: number; fim: number }[] = [];
  const servicos: string[] = [];
  for (const c of candidatos) {
    if (usados.some((u) => c.ini < u.fim && u.ini < c.fim)) continue; // sobrepõe
    usados.push({ ini: c.ini, fim: c.fim });
    if (!servicos.includes(c.nome)) servicos.push(c.nome);
  }

  // Monta o "resto": tira do texto original os trechos usados
  usados.sort((a, b) => a.ini - b.ini);
  let resto = "";
  let cursor = 0;
  for (const u of usados) {
    resto += texto.slice(cursor, u.ini) + " ".repeat(u.fim - u.ini);
    cursor = u.fim;
  }
  resto += texto.slice(cursor);

  // Verbos soltos sem substantivo ("pra alinhar", "balancear")
  const t = chave(resto);
  if (!servicos.some((s) => s.includes("Alinha")) && /\balinha/.test(t))
    servicos.push("Alinhamento");
  if (!servicos.some((s) => s.includes("Balance")) && /\bbalance/.test(t))
    servicos.push("Balanceamento");

  // Garante os chips oficiais que possam ter escapado (usa o que SOBROU, não
  // o texto original — senão duplica o que já foi capturado com marca junto,
  // tipo "Troca de óleo Mobil" virando também um "Troca de óleo" solto)
  for (const s of SERVICOS_PADRAO)
    if (
      chave(resto).includes(chave(s)) &&
      !servicos.some((x) => x === s || x.startsWith(s + " "))
    )
      servicos.push(s);

  return { servicos, resto };
}

// "+" separa itens de serviço em linhas ("amortecedor + kit + pivô").
// O primeiro pedaço pode vir grudado com o carro ("C3 amortecedor + kit"),
// então só ele passa pelo reconhecedor de vocabulário; os pedaços seguintes
// são um item por "+" — reconhecidos se baterem o vocabulário (ganham nome
// canônico/marca), senão viram a linha exatamente como foi dita.
// Palavras que só sinalizam "isso é um acréscimo" na fala ("acrescentar
// amortecedor", "também trocar o kit") — nunca são carro nem serviço.
// Tiradas ANTES de qualquer reconhecimento pra não vazarem pra lugar nenhum
// (nem como carro, nem como linha solta de serviço no fallback do "+").
const CONECTIVOS_ACRESCIMO = /\b(acrescenta|acrescentar|adicionar|tambem|mais)\b/gi;

function extrairServicosComLista(texto: string): { servicos: string[]; resto: string } {
  const limpo = texto.replace(CONECTIVOS_ACRESCIMO, " ");
  if (!limpo.includes("+")) return extrairServicos(limpo);

  const pedacos = limpo.split("+").map((s) => s.trim()).filter(Boolean);
  const [primeiro, ...seguintes] = pedacos;

  const { servicos, resto } = extrairServicos(primeiro ?? "");

  for (const pedaco of seguintes) {
    const achado = extrairServicos(pedaco);
    if (achado.servicos.length) {
      for (const s of achado.servicos) if (!servicos.includes(s)) servicos.push(s);
    } else if (pedaco.trim()) {
      const nome = pedaco.charAt(0).toUpperCase() + pedaco.slice(1);
      if (!servicos.includes(nome)) servicos.push(nome);
    }
  }

  return { servicos, resto };
}

// ----------------------------------------------------------------- mecânico
function acharMecanico(t: string, mecanicos: string[]): string {
  // Nome mais longo primeiro, pra "João Paulo" ganhar de "João"
  const ordenados = [...mecanicos].sort((a, b) => b.length - a.length);
  return ordenados.find((m) => t.includes(chave(m))) || "";
}

// -------------------------------------------------------------------- carro
// Pega o modelo do carro tirando do texto tudo que já foi reconhecido
// (comando, elevador, placa, serviços, mecânico, tempo) e limpando conectivos.
const RUIDO =
  /\b(elevador|numero|placa|carro|servico|servicos|mecanico|com|o|a|os|as|do|da|de|no|na|pro|pra|para|e|mais|tambem|um|uma|poe|bota|coloca|manda|acrescenta|acrescentar|adicionar|entra|entrou|chegou|adiciona|aguardando|espera|fila|alinhar|tempo|previsto|leva|demora|min|minutos|hora|horas|h)\b/g;

function limparCarro(
  trecho: string,
  placa: string,
  servicos: string[],
  mecanico: string
): string {
  let t = trecho;
  // Remove o que já foi identificado
  for (const s of [...servicos, mecanico].filter(Boolean)) {
    t = t.replace(new RegExp(s, "gi"), " ");
  }
  t = t.replace(/\belevador\s+\S+/gi, " ");
  if (placa) {
    // tira a placa escrita de qualquer jeito (com espaço ou hífen no meio)
    t = t.replace(new RegExp(placa.split("").join("[\\s-]*"), "gi"), " ");
  }
  t = semAcento(t.toLowerCase()).replace(/[^a-z0-9.\s]/g, " ");
  t = t.replace(/\b[a-z]\b/g, " "); // letras soltas (sobra da placa ditada)
  t = t.replace(RUIDO, " ");
  // "2" (nº do elevador) some, mas motorização como "1.0" / "2.0" fica
  t = t.replace(/\b\d+(?:\.\d+)?\b/g, (d) =>
    d.includes(".") || d.length > 2 ? d : " "
  );
  t = t.replace(/(^|\s)\.(\s|$)/g, " "); // ponto órfão que sobrou
  t = t.replace(/\s+/g, " ").trim();
  if (!t) return "";

  // Devolve a grafia original de cada palavra (acento e caixa): assim "HB20"
  // não vira "Hb20" e "Ká" não perde o acento.
  const originais = new Map<string, string>();
  for (const w of trecho.split(/\s+/)) {
    const limpa = w.replace(/[^0-9A-Za-zÀ-ÿ.]/g, "");
    const k = semAcento(limpa.toLowerCase());
    if (k && !originais.has(k)) originais.set(k, limpa);
  }

  return t
    .split(" ")
    .slice(0, 4)
    .map(
      (p) =>
        originais.get(p) ??
        (/^[a-z]/.test(p) ? p[0].toUpperCase() + p.slice(1) : p)
    )
    .join(" ");
}

function acharCarro(
  original: string,
  placa: string,
  servicos: string[],
  mecanico: string
): string {
  // Se a pessoa disse "carro X", confia nisso
  const dito = original.match(/\bcarro\s+([^,.;]+)/i);
  if (dito) {
    const c = limparCarro(dito[1], placa, servicos, mecanico);
    if (c) return c;
  }
  return limparCarro(original, placa, servicos, mecanico);
}

// ------------------------------------------------------------------- parser

export function interpretarLocal(texto: string, mecanicos: string[]): Comando {
  const bruto = (texto || "").trim();
  if (!bruto) return { acao: "nada", motivo: "Não entendi nada." };
  const t = chave(bruto);

  const elevador = acharElevador(t);
  const mecanico = acharMecanico(t, mecanicos);

  // ---- comandos de status (não precisam de dados do carro) ----
  if (/\b(pausa|pausar|almoco)\b/.test(t) && elevador)
    return { acao: "pausar", elevador };

  if (/\b(retoma|retomar|despausa)\b/.test(t) && elevador)
    return { acao: "retomar", elevador };

  // "Limpar" só apaga o SERVIÇO escrito (mantém carro/placa/mecânico) —
  // diferente de "liberar", que esvazia tudo e manda pro histórico.
  if (/\b(limpa|limpar|apaga|apagar|zera|zerar)\b/.test(t)) {
    if (!elevador)
      return { acao: "nada", motivo: "Diga qual elevador limpar." };
    return { acao: "limpar", elevador };
  }

  if (/\b(libera|liberar|liberou|desocupa|saiu|entregue)\b/.test(t)) {
    if (!elevador) return { acao: "nada", motivo: "Diga qual elevador liberar." };
    return { acao: "liberar", elevador };
  }

  if (/\b(pronto|terminou|acabou|finalizou)\b/.test(t) && elevador)
    return { acao: "pronto", elevador };

  // ---- lembrete / recado ----
  const mLembrete = bruto.match(
    /\b(?:lembrete|recado|anota(?:r)?|lembrar(?:\s+de)?|avisa(?:r)?)\b[:,]?\s*(.+)/i
  );
  if (mLembrete) {
    const urgente = /\b(urgente|importante|corre|prioridade)\b/.test(t);
    // Tira do recado o "urgente" e o "pro Fulano" que já viraram campo próprio
    let recado = mLembrete[1].trim();
    recado = recado.replace(/^\s*(urgente|importante)\b[:,]?\s*/i, "");
    if (mecanico)
      recado = recado.replace(
        new RegExp(`^\\s*(pro|pra|para|ao|a)\\s+${mecanico}\\b[:,]?\\s*`, "i"),
        ""
      );
    return {
      acao: "lembrete",
      texto: recado.trim() || mLembrete[1].trim(),
      destinatario: mecanico,
      prioridade: urgente ? "urgente" : "normal",
    };
  }

  // ---- dados de carro (ocupar / aguardando / fila) ----
  // Ordem importa: tira a placa, depois os serviços; o que sobrar é o carro.
  const { placa, resto: semPlaca } = extrairPlaca(bruto);
  const { servicos, resto: semServico } = extrairServicosComLista(semPlaca);
  const carro = acharCarro(semServico, placa, servicos, mecanico);
  const servico = servicos.join("\n");

  // Sem placa, só aceita um "carro" se houver algum outro sinal de que a
  // pessoa estava mesmo mandando um carro pra algum lugar. Senão é ruído.
  const temPista =
    elevador !== null ||
    servicos.length > 0 ||
    /\b(carro|chegou|entrou|aguardando|esperando|espera|fila|alinhar|poe|bota|coloca|manda)\b/.test(
      t
    );

  // "Elevador 3 amortecedor" (sem carro/placa) = atualização de um elevador
  // já ocupado, só acrescentando serviço — a tela de confirmação decide se
  // acrescenta ou substitui, comparando com o que já está no elevador.
  const atualizacao = elevador !== null && servicos.length > 0;

  if (!placa && !(carro && temPista) && !atualizacao)
    return {
      acao: "nada",
      motivo: "Não achei placa nem carro no que você falou.",
    };

  // Fila de alinhamento: só quando a pessoa fala "fila" ou "pra alinhar"
  if (/\bfila\b/.test(t) || /\b(pra|para) alinhar\b/.test(t))
    return { acao: "fila", placa, carro };

  if (/\b(aguardando|esperando|espera)\b/.test(t) || !elevador)
    return { acao: "aguardando", placa, carro, servico, mecanico };

  return {
    acao: "ocupar",
    elevador,
    placa,
    carro,
    servico,
    mecanico,
    previsto_min: acharPrevisto(t),
  };
}

// Ponto único de entrada. Tenta a rota /api/voz (OpenAI, no servidor — a
// chave nunca chega ao navegador) e cai no parser local em qualquer falha:
// sem OPENAI_API_KEY configurada, sem internet, ou timeout. Assim o botão
// nunca deixa a recepção na mão.
export async function interpretar(
  texto: string,
  mecanicos: string[]
): Promise<{ comando: Comando; fonte: "ia" | "local" }> {
  try {
    const r = await fetch("/api/voz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto, mecanicos }),
      signal: AbortSignal.timeout(12000),
    });
    if (r.ok) {
      const j = await r.json();
      if (j?.comando?.acao) return { comando: j.comando as Comando, fonte: "ia" };
    }
  } catch {
    // sem internet / rota desligada: segue no local
  }
  return { comando: interpretarLocal(texto, mecanicos), fonte: "local" };
}

// Resumo em português do que vai acontecer (mostrado na confirmação)
export function descrever(c: Comando): string {
  switch (c.acao) {
    case "ocupar":
      return `Colocar no Elevador ${c.elevador}`;
    case "aguardando":
      return "Adicionar em Carros aguardando";
    case "fila":
      return "Adicionar na Fila de alinhamento";
    case "lembrete":
      return c.prioridade === "urgente"
        ? "Novo lembrete URGENTE"
        : "Novo lembrete";
    case "liberar":
      return `Liberar o Elevador ${c.elevador} (vai pro histórico)`;
    case "pronto":
      return `Marcar Elevador ${c.elevador} como Pronto`;
    case "pausar":
      return `Pausar o tempo do Elevador ${c.elevador}`;
    case "retomar":
      return `Retomar o tempo do Elevador ${c.elevador}`;
    case "limpar":
      return `Limpar o serviço escrito do Elevador ${c.elevador}`;
    default:
      return "Não entendi";
  }
}
