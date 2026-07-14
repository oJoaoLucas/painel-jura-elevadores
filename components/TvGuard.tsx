"use client";

import { Component, type ReactNode } from "react";

// Guarda da TV (Raspberry): se algo quebrar a renderização, em vez de deixar a
// tela travada/branca lá no fundo, mostra um aviso e recarrega sozinha.
export default class TvGuard extends Component<
  { children: ReactNode },
  { quebrou: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { quebrou: false };
  }

  static getDerivedStateFromError() {
    return { quebrou: true };
  }

  componentDidCatch() {
    // Recarrega em 5s pra tentar se recuperar sem ninguém ir até a TV.
    setTimeout(() => window.location.reload(), 5000);
  }

  render() {
    if (this.state.quebrou) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-jura-bg text-center">
          <p className="font-display text-3xl font-bold text-jura-ink">
            Reconectando o painel…
          </p>
          <p className="text-jura-muted">A TV volta sozinha em instantes.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
