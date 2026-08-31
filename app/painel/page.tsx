"use client";

import { useEffect, useRef, useState } from "react";
import {
  supabase,
  CONFIG_PADRAO,
  type Elevador,
  type FilaItem,
  type Lembrete,
  type Config,
  type Aguardando,
} from "@/lib/supabase";
import {
  beepElevador,
  beepFila,
  beepAviso,
  destravarSom,
  somPronto,
} from "@/lib/som";
import { slotsElevador } from "@/lib/status";
import ElevadorCard from "@/components/ElevadorCard";
import FilaAlinhamento from "@/components/FilaAlinhamento";
import Lembretes from "@/components/Lembretes";
import AguardandoPainel from "@/components/AguardandoPainel";
import RadioPlayer from "@/components/RadioPlayer";
import ClimaTempo from "@/components/ClimaTempo";
import Aniversariante from "@/components/Aniversariante";
import TvGuard from "@/components/TvGuard";
import Logo from "@/components/Logo";
import { IconMute, IconWifiOff } from "@/components/Icon";

export default function PainelPage() {
  const [elevadores, setElevadores] = useState<Elevador[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [aguardando, setAguardando] = useState<Aguardando[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [agora, setAgora] = useState<Date | null>(null);
  const [conectado, setConectado] = useState(true);
  const [audioPronto, setAudioPronto] = useState(false);

  // refs pra usar valores atuais dentro dos callbacks de realtime
  const elevadoresRef = useRef<Elevador[]>([]);
  const configRef = useRef<Config>(CONFIG_PADRAO);
  const recarregouRef = useRef(false);
  const tvReloadRef = useRef<number | null>(null);
  elevadoresRef.current = elevadores;
  configRef.current = config;

  // ----- "Atualizar TV": recepção bumpa config.tv_reload, a TV recarrega -----
  // O valor de referência é semeado em carregar() com o config REAL do banco
  // (não com o padrão), senão a 1ª carga real conta como "mudança" e vira loop.
  useEffect(() => {
    if (tvReloadRef.current === null) return; // ainda não carregou o real
    if (config.tv_reload !== tvReloadRef.current) {
      tvReloadRef.current = config.tv_reload;
      window.location.reload();
    }
  }, [config.tv_reload]);

  // ----- Relógio + auto-reload da TV às 04:00 (evita travar no Raspberry) -----
  // A TV só mostra HH:MM e tempos em minutos — não precisa tick de 1s.
  // Tick de 20s mantém tudo atualizado e reduz ~20x o re-render (importante no Pi 3).
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => {
      const d = new Date();
      setAgora(d);
      // Recarrega uma vez por dia às 04:00. Marca o dia no sessionStorage (persiste
      // pelo reload) pra não entrar em loop de reload durante o minuto 0.
      if (d.getHours() === 4 && d.getMinutes() === 0 && !recarregouRef.current) {
        const hoje = d.toDateString();
        try {
          if (sessionStorage.getItem("jura-reload-04") !== hoje) {
            sessionStorage.setItem("jura-reload-04", hoje);
            recarregouRef.current = true;
            window.location.reload();
          }
        } catch {
          recarregouRef.current = true;
          window.location.reload();
        }
      }
    }, 20000);
    return () => clearInterval(t);
  }, []);

  // ----- Destrava o som no primeiro gesto (clique/toque/tecla) -----
  useEffect(() => {
    const destravar = () => {
      destravarSom();
      // dá um instante pro contexto sair de "suspended"
      setTimeout(() => setAudioPronto(somPronto()), 50);
    };
    // tenta já (funciona no Chromium kiosk com --autoplay-policy=no-user-gesture-required)
    destravar();
    window.addEventListener("pointerdown", destravar);
    window.addEventListener("keydown", destravar);
    window.addEventListener("touchstart", destravar);
    return () => {
      window.removeEventListener("pointerdown", destravar);
      window.removeEventListener("keydown", destravar);
      window.removeEventListener("touchstart", destravar);
    };
  }, []);

  // ----- Detecta on/offline do navegador -----
  useEffect(() => {
    const on = () => setConectado(true);
    const off = () => setConectado(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setConectado(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  // ----- Carga inicial -----
  const carregar = async () => {
    const [e, f, l, a, c] = await Promise.all([
      supabase.from("elevadores").select("*").order("id"),
      supabase.from("fila_alinhamento").select("*").order("ordem"),
      supabase.from("lembretes").select("*").order("created_at", { ascending: false }),
      supabase.from("aguardando").select("*").order("created_at"),
      supabase.from("config").select("*").eq("id", 1).single(),
    ]);
    if (e.data) setElevadores(e.data as Elevador[]);
    if (f.data) setFila(f.data as FilaItem[]);
    if (l.data) setLembretes(l.data as Lembrete[]);
    if (a.data) setAguardando(a.data as Aguardando[]);
    if (c.data) {
      const cfg = c.data as Config;
      // 1ª carga: memoriza o tv_reload real ANTES de qualquer comparação.
      if (tvReloadRef.current === null) tvReloadRef.current = cfg.tv_reload;
      setConfig(cfg);
    }
  };

  // ----- Realtime nas tabelas -----
  useEffect(() => {
    carregar();

    const channel = supabase
      .channel("painel-jura")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "elevadores" },
        (payload) => {
          const novo = payload.new as Elevador;
          if (novo && novo.id) {
            // Beep em QUALQUER atualização do elevador (status, serviço, etc.)
            if (configRef.current.som_ativo) {
              beepElevador(novo.id, novo.status, configRef.current.volume);
            }
          }
          supabase
            .from("elevadores")
            .select("*")
            .order("id")
            .then(({ data }) => data && setElevadores(data as Elevador[]));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "fila_alinhamento" },
        (payload) => {
          // Novo carro entrou na fila de alinhamento -> beep
          if (payload.eventType === "INSERT" && configRef.current.som_ativo) {
            beepFila(configRef.current.volume);
          }
          supabase
            .from("fila_alinhamento")
            .select("*")
            .order("ordem")
            .then(({ data }) => data && setFila(data as FilaItem[]));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lembretes" },
        (payload) => {
          // Novo recado da recepção -> beep
          if (payload.eventType === "INSERT" && configRef.current.som_ativo) {
            beepAviso(configRef.current.volume);
          }
          supabase
            .from("lembretes")
            .select("*")
            .order("created_at", { ascending: false })
            .then(({ data }) => data && setLembretes(data as Lembrete[]));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "aguardando" },
        () => {
          supabase
            .from("aguardando")
            .select("*")
            .order("created_at")
            .then(({ data }) => data && setAguardando(data as Aguardando[]));
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "config" },
        () => {
          supabase
            .from("config")
            .select("*")
            .eq("id", 1)
            .single()
            .then(({ data }) => data && setConfig(data as Config));
        }
      )
      .subscribe((status) => {
        setConectado(status === "SUBSCRIBED" && navigator.onLine);
      });

    // Rede de segurança: se o realtime perder um evento (queda silenciosa de
    // conexão), um re-fetch periódico corrige a tela em no máximo 1 minuto.
    const poll = setInterval(carregar, 60000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Garante 4 slots de elevador
  const slots = slotsElevador(elevadores);

  const hora = agora?.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const data = agora?.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

  return (
    <TvGuard>
    <main className="no-scroll relative flex h-screen flex-col gap-3 bg-jura-bg p-3">
      {/* Aviso: som bloqueado pelo navegador (toque pra liberar) */}
      {config.som_ativo && !audioPronto && (
        <button
          onClick={() => {
            destravarSom();
            setTimeout(() => setAudioPronto(somPronto()), 50);
          }}
          className="eyebrow absolute inset-x-0 bottom-0 z-50 flex animate-pulse items-center justify-center gap-2 bg-jura-amber py-3 text-center text-xl text-black"
        >
          <IconMute className="h-5 w-5" />
          Toque na tela para ativar o som
        </button>
      )}

      {/* Cabeçalho compacto — logo + clima/data à esquerda, hora à direita */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo imgClassName="h-9 w-auto" textClassName="text-2xl" />
          <span className="hidden h-9 w-px bg-jura-line sm:block" />
          <ClimaTempo />
          <span className="hidden font-mono text-lg font-extrabold capitalize text-jura-ink sm:block">
            {data || ""}
          </span>
        </div>
        <RadioPlayer config={config} />
        <div className="flex items-center gap-3 text-jura-muted">
          {!conectado && (
            <span className="eyebrow flex animate-pulse items-center gap-1 rounded border border-jura-amber px-2 py-0.5 text-sm text-jura-amber">
              <IconWifiOff className="h-4 w-4" />
              Sem conexão
            </span>
          )}
          {!config.som_ativo && (
            <span className="text-jura-muted/60" title="Som desligado">
              <IconMute className="h-5 w-5" />
            </span>
          )}
          <span className="font-mono text-4xl font-bold tabular-nums text-jura-ink">
            {hora || "--:--"}
          </span>
        </div>
      </header>

      {/* Faixa de aniversário — só aparece no dia de alguém da equipe */}
      <Aniversariante />

      {/* Elevadores — ocupam a maior parte da tela, preenchendo o quadrado */}
      <section className="grid min-h-0 flex-[3.3] grid-cols-4 gap-3">
        {slots.map((el) => (
          <ElevadorCard
            key={el.id}
            elevador={el}
            mode="painel"
            agora={agora}
            alertaHoras={config.alerta_horas}
          />
        ))}
      </section>

      {/* Fila + Lembretes (linha 1) e Carros aguardando (linha 2) */}
      <section className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid min-h-0 flex-[2.2] grid-cols-5 gap-3">
          <div className="col-span-3 min-h-0">
            <FilaAlinhamento itens={fila} mode="painel" />
          </div>
          <div className="col-span-2 min-h-0">
            <Lembretes lembretes={lembretes} mode="painel" />
          </div>
        </div>
        <div className="min-h-0 flex-1">
          <AguardandoPainel itens={aguardando} />
        </div>
      </section>
    </main>
    </TvGuard>
  );
}
