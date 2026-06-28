"use client";

import { useEffect, useRef, useState } from "react";
import {
  supabase,
  CONFIG_PADRAO,
  type Elevador,
  type FilaItem,
  type Lembrete,
  type Config,
} from "@/lib/supabase";
import {
  beepElevador,
  beepFila,
  destravarSom,
  somPronto,
  tocarVoz,
  falar,
  prepararVoz,
} from "@/lib/som";
import ElevadorCard from "@/components/ElevadorCard";
import FilaAlinhamento from "@/components/FilaAlinhamento";
import Lembretes from "@/components/Lembretes";
import Logo from "@/components/Logo";
import { IconMute, IconWifiOff } from "@/components/Icon";

export default function PainelPage() {
  const [elevadores, setElevadores] = useState<Elevador[]>([]);
  const [fila, setFila] = useState<FilaItem[]>([]);
  const [lembretes, setLembretes] = useState<Lembrete[]>([]);
  const [config, setConfig] = useState<Config>(CONFIG_PADRAO);
  const [agora, setAgora] = useState<Date | null>(null);
  const [conectado, setConectado] = useState(true);
  const [audioPronto, setAudioPronto] = useState(false);

  // refs pra usar valores atuais dentro dos callbacks de realtime
  const elevadoresRef = useRef<Elevador[]>([]);
  const configRef = useRef<Config>(CONFIG_PADRAO);
  const recarregouRef = useRef(false);
  elevadoresRef.current = elevadores;
  configRef.current = config;

  // ----- Relógio + auto-reload da TV às 04:00 (evita travar no Raspberry) -----
  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => {
      const d = new Date();
      setAgora(d);
      if (
        d.getHours() === 4 &&
        d.getMinutes() === 0 &&
        d.getSeconds() === 0 &&
        !recarregouRef.current
      ) {
        recarregouRef.current = true;
        window.location.reload();
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ----- Destrava o som no primeiro gesto (clique/toque/tecla) -----
  useEffect(() => {
    const destravar = () => {
      destravarSom();
      prepararVoz();
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
    const [e, f, l, c] = await Promise.all([
      supabase.from("elevadores").select("*").order("id"),
      supabase.from("fila_alinhamento").select("*").order("ordem"),
      supabase.from("lembretes").select("*").order("created_at", { ascending: false }),
      supabase.from("config").select("*").eq("id", 1).single(),
    ]);
    if (e.data) setElevadores(e.data as Elevador[]);
    if (f.data) setFila(f.data as FilaItem[]);
    if (l.data) setLembretes(l.data as Lembrete[]);
    if (c.data) setConfig(c.data as Config);
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
            const antigo = elevadoresRef.current.find((x) => x.id === novo.id);
            // Toca som só quando o status muda de fato
            if (
              antigo &&
              antigo.status !== novo.status &&
              configRef.current.som_ativo
            ) {
              const vol = configRef.current.volume;
              // Frase falada + chave do arquivo conforme o novo status
              let chave: string;
              let texto: string;
              if (novo.status === "ocupado") {
                chave = "ocupado";
                texto = `Elevador ${novo.id} ocupado`;
              } else if (novo.status === "livre") {
                chave = "livre";
                texto = `Elevador ${novo.id} livre`;
              } else {
                // aguardando peça / pronto
                chave = "atualizacao";
                texto = `Elevador ${novo.id} teve atualização`;
              }
              // Com voz ligada: 1) MP3 -> 2) voz do navegador -> 3) beep.
              // Com voz desligada: só beep.
              if (configRef.current.voz_ativa) {
                tocarVoz(`elevador-${novo.id}-${chave}`, vol).then((tocou) => {
                  if (tocou) return;
                  if (!falar(texto, vol) && novo.status !== "livre") {
                    beepElevador(novo.id, novo.status, vol);
                  }
                });
              } else if (novo.status !== "livre") {
                beepElevador(novo.id, novo.status, vol);
              }
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
          // Novo carro entrou na fila de alinhamento
          if (payload.eventType === "INSERT" && configRef.current.som_ativo) {
            const vol = configRef.current.volume;
            if (configRef.current.voz_ativa) {
              tocarVoz("fila", vol).then((tocou) => {
                if (!tocou && !falar("Novo carro para alinhar", vol)) beepFila(vol);
              });
            } else {
              beepFila(vol);
            }
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
          // Novo recado da recepção -> anuncia em voz (se voz ligada)
          if (
            payload.eventType === "INSERT" &&
            configRef.current.som_ativo &&
            configRef.current.voz_ativa
          ) {
            const vol = configRef.current.volume;
            tocarVoz("recado", vol).then((tocou) => {
              if (!tocou) falar("Novo recado da recepção", vol);
            });
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

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Garante 4 slots de elevador
  const slots: Elevador[] = [1, 2, 3, 4].map(
    (id) =>
      elevadores.find((e) => e.id === id) || {
        id,
        status: "livre",
        placa: null,
        carro: null,
        servico: null,
        mecanico: null,
        ocupado_em: null,
        updated_at: "",
      }
  );

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

      {/* Cabeçalho compacto — logo + uma linha pequena com data e hora */}
      <header className="flex items-center justify-between">
        <Logo imgClassName="h-9 w-auto" textClassName="text-2xl" />
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
          <span className="font-mono text-lg tabular-nums">
            <span className="capitalize text-jura-muted">{data || ""}</span>
            <span className="mx-2 text-jura-line">·</span>
            <span className="text-2xl font-bold text-jura-ink">
              {hora || "--:--"}
            </span>
          </span>
        </div>
      </header>

      {/* Elevadores — ocupam a maior parte da tela, preenchendo o quadrado */}
      <section className="grid min-h-0 flex-[3.6] grid-cols-4 gap-3">
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

      {/* Fila + Lembretes */}
      <section className="grid min-h-0 flex-1 grid-cols-5 gap-3">
        <div className="col-span-3 min-h-0">
          <FilaAlinhamento itens={fila} mode="painel" />
        </div>
        <div className="col-span-2 min-h-0">
          <Lembretes lembretes={lembretes} mode="painel" />
        </div>
      </section>
    </main>
  );
}
