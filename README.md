# Jura Painel — Jura Auto Center

Sistema de painel para a oficina **Jura Auto Center** (Araras-SP).

Duas telas:

- **`/painel`** — TV no fundo da oficina (Raspberry Pi 3 em modo kiosk). Só visualização.
- **`/admin`** — PC da recepção. A atendente gerencia elevadores, fila de alinhamento e lembretes.

Tudo atualiza **em tempo real** via Supabase Realtime — sem dar refresh. Cada elevador tem um **som próprio**, então dá pra reconhecer de ouvido qual mudou.

**Stack:** Next.js 14 (App Router) · Tailwind CSS · Supabase · Vercel.

### Funcionalidades

- **Elevadores grandes na TV** preenchendo o quadrado, com 4 status: **Livre**, **Ocupado**, **Aguardando peça** e **Pronto** (pulsa verde).
- **Tempo no elevador** ao vivo em cada carro; passa do limite (config) → card **pisca âmbar** ("carro parado").
- **Som por elevador** (tom diferente pra cada um) + beep triplo quando um carro fica **Pronto** e beep quando um carro **sai da fila**. Som ligável/desligável e com volume pela recepção.
- **Mecânico responsável** aparece no card.
- **Fila** destaca o **PRÓXIMO** em vermelho grande.
- **Lembretes** com destinatário e prioridade (normal/urgente); na TV somem sozinhos depois de 12h.
- **Histórico** automático ao liberar um elevador, com página **`/relatorio`**: carros atendidos, tempo médio, serviços mais feitos e ranking por mecânico (hoje / 7 / 30 dias).
- **Indicador de conexão** na TV e **auto-reload às 04:00** (robustez no Raspberry).
- **PIN opcional** no `/admin` (trava simples pra rede local).

> Configurações (som, volume, alerta de carro parado, PIN) ficam na seção **⚙️ Configurações** do `/admin` e valem pra TV em tempo real.

---

## 1. Configurar o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie (ou abra) um projeto.
2. Vá em **SQL Editor → New query**, cole todo o conteúdo de [`supabase.sql`](./supabase.sql) e clique em **Run**.
   - Isso cria as tabelas `elevadores`, `fila_alinhamento`, `lembretes`, insere os 4 elevadores, ativa o Realtime e libera o acesso público.
3. (Conferir) Em **Database → Replication / Publications**, confirme que as 3 tabelas estão na publicação `supabase_realtime`. O SQL já faz isso, mas vale checar.
4. Pegue as credenciais em **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. Configurar o `.env.local`

Copie o exemplo e preencha com os dados do passo anterior:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-publica
```

> A `anon key` é pública por natureza — pode ir pro front. O sistema não tem login (roda na rede local da oficina).

## 3. Rodar localmente

```bash
npm install
npm run dev
```

- Recepção: <http://localhost:3000/admin>
- TV: <http://localhost:3000/painel>

Abra as duas em abas/telas diferentes e veja a sincronização em tempo real.

## 4. Deploy na Vercel

1. Suba o projeto pro GitHub (ou use `vercel` CLI).
2. Em [vercel.com](https://vercel.com), **New Project → importe o repositório**.
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy**. A Vercel detecta Next.js automaticamente.

Pela CLI:

```bash
npm i -g vercel
vercel            # primeiro deploy (responda as perguntas)
vercel --prod     # deploy de produção
```

Sua URL ficará tipo `https://jura-painel.vercel.app`.
A TV usa `https://jura-painel.vercel.app/painel` e a recepção `.../admin`.

## 5. Raspberry Pi 3 — modo kiosk na TV

No Raspberry Pi OS (com desktop), abra o Chromium em tela cheia apontando pro painel.

**Teste rápido** (terminal do Pi):

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars \
  --autoplay-policy=no-user-gesture-required \
  https://SEU-PROJETO.vercel.app/painel
```

> `--autoplay-policy=no-user-gesture-required` é importante: libera o **beep** sem precisar de clique.

**Iniciar automaticamente ao ligar** — crie o autostart:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/jura-painel.desktop
```

Cole:

```ini
[Desktop Entry]
Type=Application
Name=Jura Painel
Exec=chromium-browser --kiosk --noerrdialogs --disable-infobars --autoplay-policy=no-user-gesture-required https://SEU-PROJETO.vercel.app/painel
X-GNOME-Autostart-enabled=true
```

**Evitar que a tela apague** — instale e configure:

```bash
sudo apt install x11-xserver-utils unclutter -y
```

Adicione no fim de `~/.config/lxsession/LXDE-pi/autostart`:

```
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0
```

Reinicie o Pi. A TV abre direto no painel, em tela cheia, sem cursor e sem apagar.

> **Beep no Pi:** se mesmo com a flag o som não tocar de primeira (política de autoplay), basta tocar a tela/dar um clique uma vez — depois disso os beeps funcionam pelo resto da sessão.

---

## Estrutura

```
.
├── app/
│   ├── painel/page.tsx     ← tela da TV (realtime, som por elevador, relógio, conexão)
│   ├── admin/page.tsx      ← tela da recepção (CRUD + configurações + PIN)
│   ├── relatorio/page.tsx  ← visão do dono (histórico, métricas)
│   ├── page.tsx            ← atalhos para /painel e /admin
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── ElevadorCard.tsx    ← card do elevador (painel + admin)
│   ├── FilaAlinhamento.tsx ← fila (painel + admin)
│   └── Lembretes.tsx       ← lembretes (painel + admin)
├── lib/
│   ├── supabase.ts         ← client + tipos
│   ├── som.ts              ← beeps via Web Audio (tom por elevador)
│   └── status.ts           ← status dos elevadores + tempo/alerta
├── supabase.sql            ← schema + realtime + RLS
├── .env.local.example
└── README.md
```

## Identidade visual

| Uso | Cor |
|-----|-----|
| Fundo | `#0a0a0a` |
| Card | `#111111` / borda `#222222` |
| Vermelho Jura / ocupado | `#cc0000` |
| Verde / livre | `#1a6b1a` |
| Âmbar / lembretes | `#cc8800` |

Fonte: **Inter** (Google Fonts).
