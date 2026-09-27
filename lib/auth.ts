"use client";

// Trava de acesso da Recepção/Orçamento/Relatório/Bot.
// A senha é conferida no SERVIDOR (/api/login, contra ADMIN_PIN): ela não vai
// mais dentro do código do site. O estado fica no localStorage do PC da recepção,
// junto com a senha digitada, que as rotas de servidor (ex.: /api/bot) conferem de novo.
const CHAVE = "jura_auth";
const CHAVE_SENHA = "jura_senha";
const EVENTO = "jura-auth";

export function estaLogado(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CHAVE) === "1" && !!localStorage.getItem(CHAVE_SENHA);
}

/** Faz login. Devolve null se entrou, ou a mensagem de erro para mostrar. */
export async function login(senha: string): Promise<string | null> {
  const valor = senha.trim();
  if (!valor) return "Digite a senha.";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ senha: valor }),
    });
    if (res.status === 401) return "Senha incorreta. Tente novamente.";
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return j.erro ?? "Não deu pra conferir a senha agora.";
    }
  } catch {
    return "Sem conexão. Confira a internet.";
  }
  localStorage.setItem(CHAVE, "1");
  localStorage.setItem(CHAVE_SENHA, valor);
  window.dispatchEvent(new Event(EVENTO));
  return null;
}

export function logout() {
  localStorage.removeItem(CHAVE);
  localStorage.removeItem(CHAVE_SENHA);
  window.dispatchEvent(new Event(EVENTO));
}

/** Senha digitada no login (enviada às rotas de servidor no header x-jura-senha). */
export function senhaSalva(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CHAVE_SENHA) ?? "";
}

// Permite componentes reagirem ao login/logout (mesma aba e entre abas)
export function ouvirAuth(cb: () => void): () => void {
  window.addEventListener(EVENTO, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENTO, cb);
    window.removeEventListener("storage", cb);
  };
}
