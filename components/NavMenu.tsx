"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Logo from "@/components/Logo";
import { logout, estaLogado, ouvirAuth } from "@/lib/auth";
import { IconLogout } from "@/components/Icon";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Início" },
  { href: "/admin", label: "Recepção" },
  { href: "/orcamento", label: "Orçamento" },
  { href: "/precos", label: "Preços" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/configuracoes", label: "Config" },
  { href: "/painel", label: "TV" },
];

export default function NavMenu({
  titulo,
  acoes,
}: {
  titulo?: string;
  acoes?: ReactNode;
}) {
  const pathname = usePathname();
  const [logado, setLogado] = useState(false);

  useEffect(() => {
    setLogado(estaLogado());
    return ouvirAuth(() => setLogado(estaLogado()));
  }, []);

  return (
    <header className="z-40 mb-4 flex flex-col gap-2.5 border-b border-jura-border bg-jura-bg py-3 sm:mb-6 sm:gap-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between lg:sticky lg:top-0">
      <div className="flex items-center gap-3">
        <Logo imgClassName="h-8 w-auto sm:h-9" textClassName="text-xl sm:text-2xl" />
        {titulo && (
          <>
            <span className="hidden h-7 w-px bg-jura-line sm:block" />
            <span className="font-title text-2xl leading-none tracking-wide text-jura-muted sm:text-3xl">
              {titulo}
            </span>
          </>
        )}
      </div>

      <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {LINKS.map(({ href, label }) => {
          const ativo =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={ativo ? "page" : undefined}
              className={`font-btn rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60 ${
                ativo
                  ? "border-jura-red bg-jura-red text-white"
                  : "border-jura-border text-white/75 hover:border-jura-line hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}

        {acoes && <span className="ml-1 flex items-center">{acoes}</span>}

        {logado && (
          <button
            onClick={logout}
            className="font-btn ml-1 flex items-center gap-1.5 rounded-md border border-jura-border px-3 py-1.5 text-sm font-semibold text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60"
            title="Sair"
          >
            <IconLogout className="h-4 w-4" />
            Sair
          </button>
        )}
      </nav>
    </header>
  );
}
