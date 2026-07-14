"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Logo from "@/components/Logo";
import { sair } from "@/app/actions/sessao";
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

export default function NavMenu({ titulo }: { titulo?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const fazerLogout = async () => {
    await sair();
    router.replace("/login");
  };

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
              className="font-btn rounded-md border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60"
              style={{
                borderColor: ativo ? "#C8102E" : "#353c46",
                backgroundColor: ativo ? "#C8102E" : "transparent",
                color: ativo ? "#fff" : "rgba(255,255,255,0.72)",
              }}
            >
              {label}
            </Link>
          );
        })}

        <button
          onClick={fazerLogout}
          className="font-btn ml-1 flex items-center gap-1.5 rounded-md border border-jura-border px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-jura-muted transition-colors hover:border-jura-red hover:text-jura-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60"
          title="Sair"
        >
          <IconLogout className="h-4 w-4" />
          Sair
        </button>
      </nav>
    </header>
  );
}
