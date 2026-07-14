/* Ícones PNG da identidade visual (public/icons). São desenhos pretos,
   então a cor vem das classes .icon-white / .icon-muted / .icon-red / .icon-wa
   (filtros em globals.css). */

export type NomeIcone =
  | "alinhamento"
  | "amortecedor"
  | "balanceamento"
  | "carro"
  | "elevador"
  | "freio"
  | "injecao"
  | "oleo"
  | "pneu"
  | "suspensao"
  | "whatsapp";

export default function IconeJura({
  nome,
  className = "h-5 w-5",
  tom = "white",
}: {
  nome: NomeIcone;
  className?: string;
  tom?: "white" | "muted" | "red" | "wa";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${nome}.png`}
      alt=""
      aria-hidden
      className={`${className} icon-${tom} select-none`}
      draggable={false}
    />
  );
}
