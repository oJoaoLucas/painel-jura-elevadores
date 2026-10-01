// Skeletons de carregamento: blocos no formato do conteúdo que vai chegar.

export function Esqueleto({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`esqueleto ${className}`} />;
}

/** Envolve um skeleton e avisa o leitor de tela que está carregando. */
export function Carregando({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div role="status" aria-label="Carregando" className={className}>
      {children}
    </div>
  );
}

/** Linhas de lista (pedido, conversa pausada, preço…). */
export function EsqueletoLista({ linhas = 4, alto = "h-16" }: { linhas?: number; alto?: string }) {
  return (
    <Carregando className="space-y-2">
      {Array.from({ length: linhas }, (_, i) => (
        <Esqueleto key={i} className={alto} />
      ))}
    </Carregando>
  );
}

/** Aba Bot inteira: números, conexão do WhatsApp e as duas colunas. */
export function EsqueletoBot() {
  return (
    <Carregando className="space-y-5">
      <Esqueleto className="h-6 w-32" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Esqueleto key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
      <Esqueleto className="h-24 rounded-xl" />
      <div className="grid gap-6 xl:grid-cols-[3fr_2fr]">
        <div className="space-y-2 rounded-xl bg-jura-panel p-5">
          <Esqueleto className="mb-3 h-6 w-48" />
          {Array.from({ length: 4 }, (_, i) => (
            <Esqueleto key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-2 rounded-xl bg-jura-panel p-5">
          <Esqueleto className="mb-3 h-6 w-40" />
          <Esqueleto className="h-40" />
        </div>
      </div>
    </Carregando>
  );
}

/** Balões da conversa, alternando os lados. */
export function EsqueletoConversa() {
  return (
    <Carregando className="space-y-3">
      {["w-2/3", "ml-auto w-1/2", "w-3/5", "ml-auto w-2/3", "w-1/3"].map((c, i) => (
        <Esqueleto key={i} className={`h-12 rounded-2xl ${c}`} />
      ))}
    </Carregando>
  );
}
