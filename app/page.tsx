import Link from "next/link";
import Logo from "@/components/Logo";
import IconeJura, { type NomeIcone } from "@/components/IconeJura";
import { IconChart, IconScreen, IconSettings } from "@/components/Icon";

type Atalho = {
  href: string;
  titulo: string;
  desc: string;
  cor: string;
  png?: NomeIcone;
  Svg?: (p: { className?: string }) => JSX.Element;
};

const ATALHOS: Atalho[] = [
  {
    href: "/admin",
    titulo: "Recepção",
    desc: "Elevadores, fila e lembretes",
    cor: "#C8102E",
    png: "elevador",
  },
  {
    href: "/orcamento",
    titulo: "Orçamento",
    desc: "Orçamento de pneus pro WhatsApp",
    cor: "#25D366",
    png: "whatsapp",
  },
  {
    href: "/precos",
    titulo: "Preços",
    desc: "Tabela de preços de pneus",
    cor: "#FFC400",
    png: "pneu",
  },
  {
    href: "/relatorio",
    titulo: "Relatório",
    desc: "Histórico e métricas",
    cor: "#3b82f6",
    Svg: IconChart,
  },
  {
    href: "/configuracoes",
    titulo: "Config",
    desc: "Som, equipe e ajustes",
    cor: "#9aa3ad",
    Svg: IconSettings,
  },
  {
    href: "/painel",
    titulo: "Painel da TV",
    desc: "Quadro de boxes (sem senha)",
    cor: "#2ea043",
    Svg: IconScreen,
  },
];

export default function Home() {
  return (
    <main className="font-body flex min-h-dvh flex-col items-center justify-center gap-10 p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo imgClassName="h-20 w-auto" textClassName="text-4xl" />
        <h1 className="font-anton text-3xl uppercase tracking-wide text-jura-ink sm:text-4xl">
          Vem pro <span className="text-jura-red">Jura</span>
        </h1>
        <p className="font-btn text-xs font-bold uppercase tracking-[0.2em] text-jura-muted">
          Auto Center · Araras-SP
        </p>
      </div>

      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ATALHOS.map(({ href, titulo, desc, cor, png, Svg }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center gap-4 rounded-xl border border-jura-border bg-jura-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-jura-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-jura-red/60"
          >
            <span
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${cor}1f` }}
            >
              {png ? (
                <IconeJura nome={png} className="h-7 w-7" tom="white" />
              ) : Svg ? (
                <span style={{ color: cor }}>
                  <Svg className="h-7 w-7" />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="font-title block text-2xl leading-none tracking-wide text-jura-ink">
                {titulo}
              </span>
              <span className="mt-1 block truncate text-sm text-jura-muted">
                {desc}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
