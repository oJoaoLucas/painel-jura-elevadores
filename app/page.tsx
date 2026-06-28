import Link from "next/link";
import Logo from "@/components/Logo";
import {
  IconDesk,
  IconReceipt,
  IconChart,
  IconScreen,
} from "@/components/Icon";

const ATALHOS = [
  {
    href: "/admin",
    titulo: "Recepção",
    desc: "Gerenciar elevadores, fila e lembretes",
    rota: "/admin",
    cor: "#d11f1f",
    Icon: IconDesk,
  },
  {
    href: "/orcamento",
    titulo: "Orçamento",
    desc: "Gerar orçamento de pneus pro WhatsApp",
    rota: "/orcamento",
    cor: "#e0a106",
    Icon: IconReceipt,
  },
  {
    href: "/relatorio",
    titulo: "Relatório",
    desc: "Histórico e métricas da oficina",
    rota: "/relatorio",
    cor: "#3b82f6",
    Icon: IconChart,
  },
  {
    href: "/painel",
    titulo: "Painel da TV",
    desc: "Tela do quadro de boxes (sem senha)",
    rota: "/painel",
    cor: "#2ea043",
    Icon: IconScreen,
  },
];

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 p-6">
      <div className="flex flex-col items-center gap-4">
        <Logo imgClassName="h-20 w-auto" textClassName="text-4xl" />
        <p className="eyebrow text-sm text-jura-muted">
          Painel da Oficina · Araras-SP
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {ATALHOS.map(({ href, titulo, desc, rota, cor, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-xl border border-jura-border bg-jura-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-jura-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60"
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg transition-colors"
              style={{ backgroundColor: `${cor}1a`, color: cor }}
            >
              <Icon className="h-6 w-6" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-xl font-bold uppercase tracking-wide text-jura-ink">
                {titulo}
              </span>
              <span className="block truncate text-sm text-jura-muted">
                {desc}
              </span>
              <span className="mt-0.5 block font-mono text-xs text-jura-line">
                {rota}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
