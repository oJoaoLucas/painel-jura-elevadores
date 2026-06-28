"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

type Tom = "normal" | "perigo" | "ok";

type ConfirmarOpts = {
  titulo?: string;
  mensagem: string;
  confirmar?: string; // texto do botão de confirmar
  cancelar?: string; // texto do botão de cancelar
  tom?: Tom;
};

type Estado =
  | (ConfirmarOpts & {
      tipo: "confirmar" | "avisar";
      resolve: (v: boolean) => void;
    })
  | null;

type API = {
  confirmar: (opts: ConfirmarOpts) => Promise<boolean>;
  avisar: (mensagem: string, titulo?: string) => Promise<void>;
};

const Ctx = createContext<API | null>(null);

export function useDialog(): API {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDialog precisa do <DialogProvider>");
  return ctx;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<Estado>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback((opts: ConfirmarOpts) => {
    return new Promise<boolean>((resolve) => {
      setEstado({ ...opts, tipo: "confirmar", resolve });
    });
  }, []);

  const avisar = useCallback((mensagem: string, titulo?: string) => {
    return new Promise<void>((resolve) => {
      setEstado({
        mensagem,
        titulo,
        tipo: "avisar",
        resolve: () => resolve(),
      });
    });
  }, []);

  const fechar = (valor: boolean) => {
    estado?.resolve(valor);
    setEstado(null);
  };

  // Foca o botão principal ao abrir; Esc cancela, Enter confirma
  useEffect(() => {
    if (!estado) return;
    okRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar(estado.tipo === "avisar");
      if (e.key === "Enter") fechar(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  const corBotao =
    estado?.tom === "perigo"
      ? "bg-jura-red"
      : estado?.tom === "ok"
      ? "bg-jura-green"
      : "bg-jura-red";

  return (
    <Ctx.Provider value={{ confirmar, avisar }}>
      {children}

      {estado && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => fechar(estado.tipo === "avisar")}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-jura-border bg-jura-card p-6 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            {estado.titulo && (
              <h2 className="eyebrow mb-2 text-lg text-jura-ink">
                {estado.titulo}
              </h2>
            )}
            <p className="text-jura-ink/90">{estado.mensagem}</p>

            <div className="mt-6 flex justify-end gap-2">
              {estado.tipo === "confirmar" && (
                <button
                  onClick={() => fechar(false)}
                  className="rounded-lg border border-jura-border px-4 py-2 font-semibold uppercase tracking-wide text-jura-muted transition-colors hover:text-jura-ink"
                >
                  {estado.cancelar || "Cancelar"}
                </button>
              )}
              <button
                ref={okRef}
                onClick={() => fechar(true)}
                className={`rounded-lg px-4 py-2 font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 ${corBotao}`}
              >
                {estado.tipo === "avisar"
                  ? "OK"
                  : estado.confirmar || "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
