"use client";

import { useEffect, useState } from "react";
import {
  supabase,
  CONFIG_PADRAO,
  type Elevador,
  type ElevadorStatus,
  type FilaItem,
  type Lembrete,
  type Config,
  type Retorno,
  type Aguardando as AguardandoItem,
} from "@/lib/supabase";
import { slotsElevador } from "@/lib/status";
import ElevadorCard from "@/components/ElevadorCard";
import FilaAlinhamento from "@/components/FilaAlinhamento";
import Lembretes from "@/components/Lembretes";
import Aguardando from "@/components/Aguardando";
import Retornos from "@/components/Retornos";
import RadioControle from "@/components/RadioControle";
import AtualizarTV from "@/components/AtualizarTV";
import ComandoVoz from "@/components/ComandoVoz";
import type { Comando } from "@/lib/voz-comando";
import NavMenu from "@/components/NavMenu";
import AuthGate from "@/components/AuthGate";
import { useDialog } from "@/components/Dialog";

export default function AdminPage() {
  const [elevadores, setElevadores] = useState<Elevador[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [aguardando, setAguardando] = useState<AguardandoItem[]>([]);
  const [retornos, setRetornos] = useState<Retorno[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [agora, setAgora] = useState(new Date());
  const { avisar } = useDialog();

  // Roda uma gravação no banco e avisa a recepção se falhar (internet/servidor),
  // em vez de falhar em silêncio e dar impressão de que salvou.
  const gravar = async (
    op: PromiseLike<{ error: { message: string } | null }>
  ): Promise<boolean> => {
    const { error } = await op;
    if (error) {
      await avisar("Não deu pra salvar. Confira a internet e tente de novo.");
      return false;
    }
    return true;
  };

  // ----- Recarregadores -----
  const recarregarElevadores = () =>
    supabase
      .from("elevadores")
      .select("*")
      .order("id")
      .then(({ data }) => data && setElevadores(data as Elevador[]));

  const recarregarFila = () =>
    supabase
      .from("fila_alinhamento")
      .select("*")
      .order("ordem")
      .then(({ data }) => data && setFila(data as FilaItem[]));

  const recarregarLembretes = () =>
    supabase
      .from("lembretes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setLembretes(data as Lembrete[]));

  const recarregarConfig = () =>
    supabase
      .from("config")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => data && setConfig(data as Config));

  const recarregarAguardando = () =>
    supabase
      .from("aguardando")
      .select("*")
      .order("created_at")
      .then(({ data }) => data && setAguardando(data as AguardandoItem[]));

  const recarregarRetornos = () =>
    supabase
      .from("retornos")
      .select("*")
      .order("data", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setRetornos(data as Retorno[]));

  // Atualiza a config na hora (otimista) e grava; se falhar, reverte e avisa.
  const atualizarConfig = async (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    const ok = await gravar(supabase.from("config").update(patch).eq("id", 1));
    if (!ok) recarregarConfig();
  };

  // Relógio (pra mostrar tempo no elevador atualizando)
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    recarregarElevadores();
    recarregarFila();
    recarregarLembretes();
    recarregarConfig();
    recarregarAguardando();
    recarregarRetornos();

    const channel = supabase
      .channel("admin-jura")
      .on("postgres_changes", { event: "*", schema: "public", table: "elevadores" }, recarregarElevadores)
      .on("postgres_changes", { event: "*", schema: "public", table: "fila_alinhamento" }, recarregarFila)
      .on("postgres_changes", { event: "*", schema: "public", table: "lembretes" }, recarregarLembretes)
      .on("postgres_changes", { event: "*", schema: "public", table: "config" }, recarregarConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "aguardando" }, recarregarAguardando)
      .on("postgres_changes", { event: "*", schema: "public", table: "retornos" }, recarregarRetornos)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ----- Elevadores -----
  const ocuparElevador = async (
    id: number,
    dados: {
      placa: string;
      carro: string;
      servico: string;
      mecanico: string;
      previsto_min: number | null;
    }
  ) => {
    const atual = elevadores.find((e) => e.id === id);
    const eraLivre = !atual || atual.status === "livre";
    const ok = await gravar(
      supabase
        .from("elevadores")
        .update({
          status: atual && atual.status !== "livre" ? atual.status : "ocupado",
          placa: dados.placa || null,
          carro: dados.carro || null,
          servico: dados.servico || null,
          mecanico: dados.mecanico || null,
          previsto_min: dados.previsto_min,
          // só reseta o cronômetro quando o carro ENTRA (estava livre)
          ocupado_em: eraLivre ? new Date().toISOString() : atual?.ocupado_em,
          pausado_em: eraLivre ? null : atual?.pausado_em,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
    );
    if (ok) recarregarElevadores();
  };

  const mudarStatus = async (id: number, status: ElevadorStatus) => {
    const ok = await gravar(
      supabase
        .from("elevadores")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    if (ok) recarregarElevadores();
  };

  // Pausa/retoma o cronômetro (almoço/fechado). Ao retomar, o tempo que
  // ficou pausado é descontado empurrando ocupado_em pra frente.
  const pausarElevador = async (id: number, pausar: boolean) => {
    const el = elevadores.find((e) => e.id === id);
    if (!el) return;
    let dados: Partial<Elevador>;
    if (pausar) {
      dados = { pausado_em: new Date().toISOString() };
    } else {
      const pausadoMs = el.pausado_em
        ? Date.now() - new Date(el.pausado_em).getTime()
        : 0;
      dados = {
        pausado_em: null,
        ocupado_em: el.ocupado_em
          ? new Date(
              new Date(el.ocupado_em).getTime() + Math.max(0, pausadoMs)
            ).toISOString()
          : el.ocupado_em,
      };
    }
    const ok = await gravar(
      supabase
        .from("elevadores")
        .update({ ...dados, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    if (ok) recarregarElevadores();
  };

  // Apaga só o texto do serviço, mantendo carro/placa/mecânico/cronômetro —
  // diferente de "liberar", que esvazia tudo e manda pro histórico.
  const limparServicoElevador = async (id: number) => {
    const ok = await gravar(
      supabase
        .from("elevadores")
        .update({ servico: null, updated_at: new Date().toISOString() })
        .eq("id", id)
    );
    if (ok) recarregarElevadores();
  };

  const liberarElevador = async (id: number) => {
    const el = elevadores.find((e) => e.id === id);
    // Salva no histórico antes de limpar
    if (el && (el.carro || el.placa)) {
      // Se liberou sem "Retomar", desconta a pausa pendente da duração
      const pausaPendenteMs = el.pausado_em
        ? Math.max(0, Date.now() - new Date(el.pausado_em).getTime())
        : 0;
      const entrada =
        el.ocupado_em && pausaPendenteMs > 0
          ? new Date(
              new Date(el.ocupado_em).getTime() + pausaPendenteMs
            ).toISOString()
          : el.ocupado_em;
      await supabase.from("historico").insert({
        elevador_id: id,
        placa: el.placa,
        carro: el.carro,
        servico: el.servico,
        mecanico: el.mecanico,
        entrada,
        saida: new Date().toISOString(),
      });
    }
    const ok = await gravar(
      supabase
        .from("elevadores")
        .update({
          status: "livre",
          placa: null,
          carro: null,
          servico: null,
          mecanico: null,
          ocupado_em: null,
          pausado_em: null,
          previsto_min: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
    );
    if (ok) recarregarElevadores();
  };

  // Carro pronto -> joga na fila de alinhamento e libera o elevador
  const moverParaAlinhamento = async (id: number) => {
    const el = elevadores.find((e) => e.id === id);
    if (el && (el.carro || el.placa)) {
      const maxOrdem = fila.reduce((m, i) => Math.max(m, i.ordem), 0);
      await supabase.from("fila_alinhamento").insert({
        placa: el.placa || "—",
        carro: el.carro || "—",
        ordem: maxOrdem + 1,
      });
    }
    await liberarElevador(id);
    recarregarFila();
  };

  // Tira o carro do elevador e devolve para "Carros aguardando" (sem ir pro histórico)
  const voltarParaAguardando = async (id: number) => {
    const el = elevadores.find((e) => e.id === id);
    if (el && (el.carro || el.placa)) {
      await supabase.from("aguardando").insert({
        placa: el.placa,
        carro: el.carro,
        servico: el.servico,
        mecanico: el.mecanico,
      });
    }
    await supabase
      .from("elevadores")
      .update({
        status: "livre",
        placa: null,
        carro: null,
        servico: null,
        mecanico: null,
        ocupado_em: null,
        pausado_em: null,
        previsto_min: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    recarregarElevadores();
    recarregarAguardando();
  };

  // ----- Carros aguardando -----
  const adicionarAguardando = async (dados: {
    placa: string;
    carro: string;
    servico: string;
    mecanico: string;
  }) => {
    await supabase.from("aguardando").insert({
      placa: dados.placa || null,
      carro: dados.carro || null,
      servico: dados.servico || null,
      mecanico: dados.mecanico || null,
    });
    recarregarAguardando();
  };

  const removerAguardando = async (id: string) => {
    await supabase.from("aguardando").delete().eq("id", id);
    recarregarAguardando();
  };

  // Joga um carro aguardando num elevador livre
  const moverParaElevador = async (item: AguardandoItem, elevadorId: number) => {
    await ocuparElevador(elevadorId, {
      placa: item.placa || "",
      carro: item.carro || "",
      servico: item.servico || "",
      mecanico: item.mecanico || "",
      previsto_min: null,
    });
    await supabase.from("aguardando").delete().eq("id", item.id);
    recarregarAguardando();
  };

  // Manda um carro aguardando direto pra fila de alinhamento
  const aguardandoParaAlinhamento = async (item: AguardandoItem) => {
    const maxOrdem = fila.reduce((m, i) => Math.max(m, i.ordem), 0);
    await supabase.from("fila_alinhamento").insert({
      placa: item.placa || "—",
      carro: item.carro || "—",
      ordem: maxOrdem + 1,
    });
    await supabase.from("aguardando").delete().eq("id", item.id);
    recarregarAguardando();
    recarregarFila();
  };

  // ----- Fila -----
  const adicionarFila = async (placa: string, carro: string) => {
    const maxOrdem = fila.reduce((m, i) => Math.max(m, i.ordem), 0);
    await supabase.from("fila_alinhamento").insert({ placa, carro, ordem: maxOrdem + 1 });
    recarregarFila();
  };

  const removerFila = async (id: string) => {
    await supabase.from("fila_alinhamento").delete().eq("id", id);
    recarregarFila();
  };

  const moverFila = async (id: string, dir: "up" | "down") => {
    const ordenados = [...fila].sort((a, b) => a.ordem - b.ordem);
    const idx = ordenados.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const alvo = dir === "up" ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= ordenados.length) return;
    const a = ordenados[idx];
    const b = ordenados[alvo];
    await Promise.all([
      supabase.from("fila_alinhamento").update({ ordem: b.ordem }).eq("id", a.id),
      supabase.from("fila_alinhamento").update({ ordem: a.ordem }).eq("id", b.id),
    ]);
    recarregarFila();
  };

  // ----- Lembretes -----
  const adicionarLembrete = async (
    texto: string,
    destinatario: string,
    prioridade: "normal" | "urgente"
  ) => {
    await supabase
      .from("lembretes")
      .insert({ texto, destinatario: destinatario || null, prioridade });
    recarregarLembretes();
  };

  const removerLembrete = async (id: string) => {
    await supabase.from("lembretes").delete().eq("id", id);
    recarregarLembretes();
  };

  // ----- Carros que voltaram (re-serviço) -----
  const adicionarRetorno = async (dados: {
    placa: string;
    carro: string;
    data: string;
    descricao: string;
  }) => {
    const ok = await gravar(
      supabase.from("retornos").insert({
        placa: dados.placa || null,
        carro: dados.carro || null,
        data: dados.data,
        descricao: dados.descricao || null,
      })
    );
    if (ok) recarregarRetornos();
  };

  // ----- Comando por voz -----
  // O componente já mostrou o que entendeu e a recepção confirmou; aqui só
  // despachamos pra mesma função que os botões da tela usam.
  const executarComando = async (c: Comando) => {
    switch (c.acao) {
      case "ocupar": {
        // Se o elevador já está ocupado e a fala não repetiu carro/placa
        // (ou repetiu o mesmo carro), é uma ATUALIZAÇÃO: acrescenta o
        // serviço novo ao que já estava lá, sem apagar nada — isso é o que
        // permite falar só "elevador 3 mais o kit" sem redizer tudo de novo.
        const atual = elevadores.find((e) => e.id === c.elevador);
        const ocupado = !!(
          atual &&
          atual.status !== "livre" &&
          (atual.carro || atual.placa)
        );
        const carroBate =
          !c.carro ||
          !atual?.carro ||
          atual.carro.trim().toLowerCase() === c.carro.trim().toLowerCase();
        const placaBate =
          !c.placa ||
          !atual?.placa ||
          atual.placa.trim().toUpperCase() === c.placa.trim().toUpperCase();

        if (ocupado && carroBate && placaBate) {
          const linhasAtuais = (atual!.servico || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          const linhasNovas = c.servico
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          const combinadas = [...linhasAtuais];
          for (const l of linhasNovas)
            if (!combinadas.some((x) => x.toLowerCase() === l.toLowerCase()))
              combinadas.push(l);

          await ocuparElevador(c.elevador, {
            placa: c.placa || atual!.placa || "",
            carro: c.carro || atual!.carro || "",
            servico: combinadas.join("\n"),
            mecanico: c.mecanico || atual!.mecanico || "",
            previsto_min: c.previsto_min ?? atual!.previsto_min ?? null,
          });
        } else {
          await ocuparElevador(c.elevador, {
            placa: c.placa,
            carro: c.carro,
            servico: c.servico,
            mecanico: c.mecanico,
            previsto_min: c.previsto_min,
          });
        }
        break;
      }
      case "aguardando":
        await adicionarAguardando({
          placa: c.placa,
          carro: c.carro,
          servico: c.servico,
          mecanico: c.mecanico,
        });
        break;
      case "fila":
        await adicionarFila(c.placa || "—", c.carro || "—");
        break;
      case "lembrete":
        await adicionarLembrete(c.texto, c.destinatario, c.prioridade);
        break;
      case "liberar":
        await liberarElevador(c.elevador);
        break;
      case "pronto":
        await mudarStatus(c.elevador, "pronto");
        break;
      case "pausar":
        await pausarElevador(c.elevador, true);
        break;
      case "retomar":
        await pausarElevador(c.elevador, false);
        break;
      case "limpar":
        await limparServicoElevador(c.elevador);
        break;
    }
  };

  // 4 slots garantidos
  const slots = slotsElevador(elevadores);

  const elevadoresLivres = slots
    .filter((s) => s.status === "livre")
    .map((s) => s.id);

  return (
    <AuthGate>
    <main className="gestao space-y-6 px-4 pb-12 sm:px-6">
      <NavMenu titulo="Recepção" />

      <div className="flex justify-end">
        <AtualizarTV onSalvar={atualizarConfig} />
      </div>

      {/* Entrada por voz — evita digitar tudo no celular */}
      <ComandoVoz
        elevadores={slots}
        elevadoresLivres={elevadoresLivres}
        onExecutar={executarComando}
      />

      {/* 1. Elevadores (esquerda) + Carros aguardando (bloco à direita) */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section>
          <div className="grid gap-4 sm:grid-cols-2">
            {slots.map((el) => (
              <ElevadorCard
                key={el.id}
                elevador={el}
                mode="admin"
                agora={agora}
                alertaHoras={config.alerta_horas}
                onOcupar={ocuparElevador}
                onStatus={mudarStatus}
                onPausar={pausarElevador}
                onLiberar={liberarElevador}
                onMoverAlinhamento={moverParaAlinhamento}
                onVoltarAguardando={voltarParaAguardando}
                onSoltarAguardando={(aguardandoId, elevId) => {
                  const item = aguardando.find((a) => a.id === aguardandoId);
                  if (item) moverParaElevador(item, elevId);
                }}
              />
            ))}
          </div>
        </section>

        {/* Carros aguardando — bloco lateral */}
        <Aguardando
          itens={aguardando}
          elevadoresLivres={elevadoresLivres}
          onAdd={adicionarAguardando}
          onRemove={removerAguardando}
          onMover={moverParaElevador}
          onMoverAlinhamento={aguardandoParaAlinhamento}
          vertical
        />
      </div>

      {/* Fila + Lembretes: empilhados na vertical, lado a lado só em tela larga */}
      <div className="grid gap-6 xl:grid-cols-2">
        <FilaAlinhamento
          itens={fila}
          mode="admin"
          onAdd={adicionarFila}
          onRemove={removerFila}
          onMove={moverFila}
          onSoltarAguardando={(aguardandoId) => {
            const item = aguardando.find((a) => a.id === aguardandoId);
            if (item) aguardandoParaAlinhamento(item);
          }}
          onSoltarElevador={(elevId) => moverParaAlinhamento(elevId)}
        />
        <Lembretes
          lembretes={lembretes}
          mode="admin"
          onAdd={adicionarLembrete}
          onRemove={removerLembrete}
        />
      </div>

      {/* Carros que voltaram + Rádio da TV: lado a lado em tela larga */}
      <div className="grid gap-6 xl:grid-cols-2">
        <Retornos itens={retornos} onAdd={adicionarRetorno} />
        <RadioControle config={config} onSalvar={atualizarConfig} />
      </div>
    </main>
    </AuthGate>
  );
}
