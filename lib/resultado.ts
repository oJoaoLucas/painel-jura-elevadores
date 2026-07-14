// Tipo de retorno padrão das Server Actions de escrita.
// Mensagens simples, pensadas pra equipe da oficina (sem termos técnicos).
export type Resultado<T = void> =
  | { ok: true; dado: T }
  | { ok: false; erro: string };

export function sucesso<T>(dado: T): Resultado<T> {
  return { ok: true, dado };
}

export function falha(erro: string): Resultado<never> {
  return { ok: false, erro };
}

// Traduz erros comuns em mensagens amigáveis (sem vazar detalhes sensíveis).
export function mensagemErro(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e ?? "");
  if (m === "NAO_AUTORIZADO") return "Sessão expirada. Entre novamente.";
  return "Não deu pra salvar. Verifique a conexão e tente de novo.";
}
