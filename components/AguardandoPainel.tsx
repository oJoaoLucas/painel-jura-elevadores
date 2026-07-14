"use client";

import type { Aguardando as AguardandoItem } from "@/lib/supabase";
import AutoFitBox from "@/components/AutoFitBox";
import { IconCar } from "@/components/Icon";

// Bloco da TV — só o nome dos carros aguardando (sem placa/serviço), azul.
export default function AguardandoPainel({
  itens,
}: {
  itens: AguardandoItem[];
}) {
  return (
    <div
      className="flex h-full items-center gap-4 rounded-lg border border-jura-border bg-jura-card px-4"
      style={{ borderLeft: "5px solid #3b82f6" }}
    >
      <h2 className="section-title flex shrink-0 items-center gap-2 text-lg">
        <IconCar className="h-[1.1em] w-[1.1em] shrink-0 text-jura-blue" />
        Carros Aguardando
        {itens.length > 0 && (
          <span className="rounded bg-jura-blue/15 px-2 py-0.5 font-mono text-sm font-bold text-jura-blue">
            {itens.length}
          </span>
        )}
      </h2>
      {/* Nomes na MESMA linha do título, preenchendo o espaço à direita */}
      <div className="min-w-0 flex-1 self-stretch py-2">
        {itens.length === 0 ? (
          <p className="flex h-full items-center text-jura-muted/60">
            Nenhum carro aguardando no momento.
          </p>
        ) : (
          <AutoFitBox
            className="items-center justify-start"
            max={34}
            dep={itens.map((i) => i.id + (i.carro || i.placa || "")).join()}
          >
            <div className="flex w-full items-center gap-x-[0.6em] whitespace-nowrap">
              {itens.map((item, i) => (
                <span key={item.id} className="flex items-center gap-x-[0.6em]">
                  {i > 0 && (
                    <span className="text-jura-blue/70" aria-hidden>
                      •
                    </span>
                  )}
                  <span className="font-display font-bold uppercase tracking-wide text-jura-ink">
                    {item.carro || item.placa || "—"}
                  </span>
                </span>
              ))}
            </div>
          </AutoFitBox>
        )}
      </div>
    </div>
  );
}
