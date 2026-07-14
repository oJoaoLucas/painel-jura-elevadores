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
  type Aguardando as AguardandoItem,
} from "@/lib/supabase";
import { slotsElevador } from "@/lib/status";
import type { Resultado } from "@/lib/resultado";
import * as elevadorAcao from "@/app/actions/elevadores";
import * as aguardandoAcao from "@/app/actions/aguardando";
import * as filaAcao from "@/app/actions/fila";
import * as lembreteAcao from "@/app/actions/lembretes";
import { atualizarConfig as atualizarConfigAcao } from "@/app/actions/config";
import ElevadorCard from "@/components/ElevadorCard";
import FilaAlinhamento from "@/components/FilaAlinhamento";
import Lembretes from "@/components/Lembretes";
import Aguardando from "@/components/Aguardando";
import RadioControle from "@/components/RadioControle";
import AtualizarTV from "@/components/AtualizarTV";
import NavMenu from "@/components/NavMenu";
import { useDialog } from "@/components/Dialog";

export default function AdminPage() {
  const [elevadores, setElevadores] = useState<Elevador[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [aguardando, setAguardando] = useState<AguardandoItem[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [agora, setAgora] = useState(new Date());
  const { avisar } = useDialog();

  // Roda uma Server Action e avisa a recepção se ela falhar (em vez de
  // falhar em silêncio e dar impressão de que salvou).
  const rodar = async (p: Promise<Resultado>): Promise<boolean> => {
    const r = await p;
    if (!r.ok) await avisar(r.erro);
    return r.ok;
  };

  // ----- Recarregadores (leitura via anon; realtime dispara sozinho) -----
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

  // Atualiza a config na hora (otimista) e grava no servidor; reverte se falhar.
  const atualizarConfig = async (patch: Partial<Config>) => {
    setConfig((c) => ({ ...c, ...patch }));
    const ok = await rodar(atualizarConfigAcao(patch));
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

    const channel = supabase
      .channel("admin-jura")
      .on("postgres_changes", { event: "*", schema: "public", table: "elevadores" }, recarregarElevadores)
      .on("postgres_changes", { event: "*", schema: "public", table: "fila_alinhamento" }, recarregarFila)
      .on("postgres_changes", { event: "*", schema: "public", table: "lembretes" }, recarregarLembretes)
      .on("postgres_changes", { event: "*", schema: "public", table: "config" }, recarregarConfig)
      .on("postgres_changes", { event: "*", schema: "public", table: "aguardando" }, recarregarAguardando)
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
    if (await rodar(elevadorAcao.ocuparElevador(id, dados)))
      recarregarElevadores();
  };

  const mudarStatus = async (id: number, status: ElevadorStatus) => {
    if (await rodar(elevadorAcao.mudarStatus(id, status)))
      recarregarElevadores();
  };

  const pausarElevador = async (id: number, pausar: boolean) => {
    if (await rodar(elevadorAcao.pausarElevador(id, pausar)))
      recarregarElevadores();
  };

  const liberarElevador = async (id: number) => {
    if (await rodar(elevadorAcao.liberarElevador(id))) recarregarElevadores();
  };

  const moverParaAlinhamento = async (id: number) => {
    if (await rodar(elevadorAcao.moverParaAlinhamento(id))) {
      recarregarElevadores();
      recarregarFila();
    }
  };

  const voltarParaAguardando = async (id: number) => {
    if (await rodar(elevadorAcao.voltarParaAguardando(id))) {
      recarregarElevadores();
      recarregarAguardando();
    }
  };

  // ----- Carros aguardando -----
  const adicionarAguardando = async (dados: {
    placa: string;
    carro: string;
    servico: string;
    mecanico: string;
  }) => {
    if (await rodar(aguardandoAcao.adicionarAguardando(dados)))
      recarregarAguardando();
  };

  const removerAguardando = async (id: string) => {
    if (await rodar(aguardandoAcao.removerAguardando(id)))
      recarregarAguardando();
  };

  const moverParaElevador = async (item: AguardandoItem, elevadorId: number) => {
    if (await rodar(aguardandoAcao.aguardandoParaElevador(item.id, elevadorId))) {
      recarregarElevadores();
      recarregarAguardando();
    }
  };

  const aguardandoParaAlinhamento = async (item: AguardandoItem) => {
    if (await rodar(aguardandoAcao.aguardandoParaAlinhamento(item.id))) {
      recarregarAguardando();
      recarregarFila();
    }
  };

  // ----- Fila -----
  const adicionarFila = async (placa: string, carro: string) => {
    if (await rodar(filaAcao.adicionarFila(placa, carro))) recarregarFila();
  };

  const removerFila = async (id: string) => {
    if (await rodar(filaAcao.removerFila(id))) recarregarFila();
  };

  const moverFila = async (id: string, dir: "up" | "down") => {
    const ordenados = [...fila].sort((a, b) => a.ordem - b.ordem);
    const idx = ordenados.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const alvo = dir === "up" ? idx - 1 : idx + 1;
    if (alvo < 0 || alvo >= ordenados.length) return;
    if (
      await rodar(
        filaAcao.trocarOrdemFila(ordenados[idx].id, ordenados[alvo].id)
      )
    )
      recarregarFila();
  };

  // ----- Lembretes -----
  const adicionarLembrete = async (
    texto: string,
    destinatario: string,
    prioridade: "normal" | "urgente"
  ) => {
    if (await rodar(lembreteAcao.adicionarLembrete(texto, destinatario, prioridade)))
      recarregarLembretes();
  };

  const removerLembrete = async (id: string) => {
    if (await rodar(lembreteAcao.removerLembrete(id))) recarregarLembretes();
  };

  // 4 slots garantidos
  const slots = slotsElevador(elevadores);

  const elevadoresLivres = slots
    .filter((s) => s.status === "livre")
    .map((s) => s.id);

  return (
    <main className="gestao space-y-6 px-4 pb-12 sm:px-6">
      <NavMenu titulo="Recepção" />

      <div className="flex justify-end">
        <AtualizarTV onSalvar={atualizarConfig} />
      </div>

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

      {/* Rádio da TV */}
      <RadioControle config={config} onSalvar={atualizarConfig} />
    </main>
  );
}
