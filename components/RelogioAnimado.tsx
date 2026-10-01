// Relógio analógico da TV: os ponteiros giram enquanto o tempo corre e
// congelam quando o elevador está pausado. Feito com divs + transform
// (animação CSS na GPU, leve pro Raspberry). Tamanho em "em": herda a
// fonte do pai, então escala junto com o AutoFitBox.

export default function RelogioAnimado({
  parado = false,
  className = "",
}: {
  parado?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`relogio ${parado ? "relogio-parado" : ""} ${className}`}
    >
      <span className="relogio-marca" style={{ transform: "rotate(0deg)" }} />
      <span className="relogio-marca" style={{ transform: "rotate(90deg)" }} />
      <span className="relogio-marca" style={{ transform: "rotate(180deg)" }} />
      <span className="relogio-marca" style={{ transform: "rotate(270deg)" }} />
      <span className="relogio-hora" />
      <span className="relogio-minuto" />
      <span className="relogio-centro" />
    </span>
  );
}
