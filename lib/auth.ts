"use client";

// Trava simples de acesso (rede local, sem backend de login).
// A senha é fixa e o estado fica no localStorage do PC da recepção.
export const SENHA_RECEPCAO = "200903";
const CHAVE = "jura_auth";
const EVENTO = "jura-auth";

export function estaLogado(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CHAVE) === "1";
}

export function login(senha: string): boolean {
  if (senha.trim() === SENHA_RECEPCAO) {
    localStorage.setItem(CHAVE, "1");
    window.dispatchEvent(new Event(EVENTO));
    return true;
  }
  return false;
}

export function logout() {
  localStorage.removeItem(CHAVE);
  window.dispatchEvent(new Event(EVENTO));
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
