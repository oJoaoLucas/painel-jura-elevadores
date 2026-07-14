"use client";

import { useState } from "react";
import type { Config } from "@/lib/supabase";
import { IconScreen } from "@/components/Icon";

// Botão da recepção que manda a TV (Raspberry) recarregar — sem SSH, sem senha.
// Bumpa config.tv_reload; a TV observa esse valor e recarrega ao mudar.
export default function AtualizarTV({
  onSalvar,
}: {
  onSalvar: (patch: Partial<Config>) => void;
}) {
  const [enviado, setEnviado] = useState(false);

  const atualizar = () => {
    onSalvar({ tv_reload: Date.now() });
    setEnviado(true);
    setTimeout(() => setEnviado(false), 4000);
  };

  return (
    <button
      onClick={atualizar}
      className="flex items-center gap-2 rounded-md border border-jura-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red"
      title="Faz a TV lá no fundo recarregar a versão mais nova"
    >
      <IconScreen className="h-4 w-4" />
      {enviado ? "TV atualizando…" : "Atualizar TV"}
    </button>
  );
}
