"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Logo from "@/components/Logo";
import { IconLock, IconEye, IconEyeOff } from "@/components/Icon";
import { entrar } from "@/app/actions/sessao";

function TelaLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const destino = params.get("de") || "/admin";

  const [valor, setValor] = useState("");
  const [erro, setErro] = useState(false);
  const [ver, setVer] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const tentar = async () => {
    if (enviando) return;
    setEnviando(true);
    const { ok } = await entrar(valor);
    if (ok) {
      router.replace(destino);
    } else {
      setErro(true);
      setValor("");
      setEnviando(false);
      inputRef.current?.focus();
    }
  };

  return (
    <main className="gestao flex min-h-dvh flex-col items-center justify-center gap-7 bg-jura-bg p-6">
      <Logo imgClassName="h-16 w-auto" textClassName="text-3xl" />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          tentar();
        }}
        className="w-full max-w-xs rounded-2xl border border-jura-border bg-jura-card p-6 shadow-card"
      >
        <div className="mb-5 flex items-center gap-2 text-jura-muted">
          <IconLock className="h-5 w-5 text-jura-red" />
          <h1 className="section-title text-lg text-jura-ink">
            Acesso da Recepção
          </h1>
        </div>

        <label
          htmlFor="senha"
          className="eyebrow mb-1.5 block text-sm text-jura-muted"
        >
          Senha
        </label>
        <div className="relative">
          <input
            id="senha"
            ref={inputRef}
            type={ver ? "text" : "password"}
            inputMode="numeric"
            autoComplete="current-password"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setErro(false);
            }}
            aria-invalid={erro}
            className="w-full rounded-lg border bg-jura-input px-3 py-3 pr-11 text-center text-2xl tracking-[0.3em] outline-none transition-colors focus:border-jura-red"
            style={{ borderColor: erro ? "#d11f1f" : "#353c46" }}
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-jura-muted transition-colors hover:text-jura-ink"
          >
            {ver ? (
              <IconEyeOff className="h-5 w-5" />
            ) : (
              <IconEye className="h-5 w-5" />
            )}
          </button>
        </div>

        {erro && (
          <p role="alert" className="mt-2 text-sm text-jura-red">
            Senha incorreta. Tente novamente.
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="mt-5 w-full rounded-lg bg-jura-red py-3 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-jura-muted">
        A tela da TV (<span className="font-mono">/painel</span>) não precisa de
        senha.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <TelaLogin />
    </Suspense>
  );
}
