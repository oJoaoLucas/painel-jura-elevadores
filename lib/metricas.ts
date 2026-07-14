// Métricas do relatório — funções puras e testáveis.
import type { Historico } from "@/lib/supabase";

// Formata uma duração em ms como "1h20" ou "45min".
export function formatarDuracao(ms: number): string {
  if (ms <= 0) return "—";
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h > 0) return `${h}h${min.toString().padStart(2, "0")}`;
  return `${min}min`;
}

// Conta cada serviço INDIVIDUALMENTE. O campo `servico` pode ter vários
// serviços separados por quebra de linha (ex.: "Alinhamento\nBalanceamento");
// cada linha conta como um serviço. Normaliza caixa pra agrupar, mas mostra
// um nome legível (a primeira forma vista). Ordena do mais feito ao menos.
export function agregarServicos(historico: Historico[]): [string, number][] {
  const mapa = new Map<string, { nome: string; qtd: number }>();
  for (const h of historico) {
    const linhas = (h.servico || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const linha of linhas) {
      const chave = linha.toLowerCase();
      const atual = mapa.get(chave);
      if (atual) atual.qtd += 1;
      else mapa.set(chave, { nome: linha, qtd: 1 });
    }
  }
  return [...mapa.values()]
    .map((v): [string, number] => [v.nome, v.qtd])
    .sort((a, b) => b[1] - a[1]);
}

// Conta carros por mecânico (uma entrada de histórico = um carro).
export function agregarPorMecanico(historico: Historico[]): [string, number][] {
  const mapa = new Map<string, number>();
  for (const h of historico) {
    const m = (h.mecanico || "—").trim() || "—";
    mapa.set(m, (mapa.get(m) || 0) + 1);
  }
  return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
}

// Tempo médio (ms) entre entrada e saída dos carros com ambos os horários.
export function tempoMedioMs(historico: Historico[]): number {
  const duracoes = historico
    .filter((h) => h.entrada && h.saida)
    .map((h) => new Date(h.saida!).getTime() - new Date(h.entrada!).getTime())
    .filter((ms) => ms > 0);
  if (duracoes.length === 0) return 0;
  return duracoes.reduce((a, b) => a + b, 0) / duracoes.length;
}
