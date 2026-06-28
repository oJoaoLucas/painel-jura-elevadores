# CONTEXTO — Jura Painel (handoff p/ continuar em outro PC / Claude Code)

> Leia este arquivo inteiro antes de mexer. Ele resume **o que é**, **o que já está pronto**,
> **o que falta**, **como rodar** e **as pegadinhas**. Atualize-o conforme o projeto evoluir.

---

## 1. O que é

Sistema web da **Jura Auto Center** (oficina mecânica em Araras-SP). Duas telas:

- **`/painel`** — TV no fundo da oficina (Raspberry Pi em modo kiosk). Só visualização, atualiza em tempo real, com som.
- **`/admin`** — PC da recepção. A atendente gerencia elevadores, fila de alinhamento, carros aguardando e lembretes.
- **`/relatorio`** — visão do dono (histórico, métricas).
- **`/`** — atalhos para `/painel` e `/admin`.

Tudo sincroniza **em tempo real** via Supabase Realtime (sem refresh). **Sem login** (roda na rede local).

---

## 2. Stack e versões

- **Next.js 14** (App Router) — `^14.2.35` (não subir pra 15/16 sem testar; 16 é breaking).
- **React 18**, **TypeScript 5**.
- **Tailwind CSS 3.4**.
- **@supabase/supabase-js 2**.
- **Node 18+** (foi desenvolvido no Node 24). npm 9+.
- Hospedagem pretendida: **Vercel** (ainda NÃO foi feito deploy — ver backlog).

---

## 3. Pré-requisitos (instalar no PC novo)

1. **Node.js 18 ou superior** — https://nodejs.org (vem com npm).
2. Um editor / **Claude Code**.
3. Acesso à internet (o banco é Supabase na nuvem).

Não precisa instalar Postgres nem Supabase local — o banco já existe na nuvem.

---

## 4. Como rodar (passo a passo)

```bash
# 1. dentro da pasta do projeto
npm install

# 2. rodar em desenvolvimento
npm run dev
```

Abrir:
- Recepção: http://localhost:3000/admin
- TV:       http://localhost:3000/painel

> O arquivo **`.env.local`** já está na pasta (vai junto na cópia) com as credenciais.
> Se você clonar via git em vez de copiar a pasta, recrie o `.env.local` (ver seção 5).

**Scripts:** `npm run dev` (desenvolvimento) · `npm run build` (produção) · `npm start` (servir build) · `npm run lint`.

---

## 5. Variáveis de ambiente (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://aastkhfbmyfaldfcfyrs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhc3RraGZibXlmYWxkZmNmeXJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjI0OTMsImV4cCI6MjA5NzEzODQ5M30.oJkmGxVOTaloQBXA0tsaGKv_tFve7-HVrCrMw3a-C0Y
```

A `anon key` é **pública por natureza** (pode ir pro front e pra Vercel). No deploy da Vercel,
cadastre essas duas variáveis em *Environment Variables*.

---

## 6. Banco de dados (Supabase)

- **Projeto:** `jura-painel` · ref **`aastkhfbmyfaldfcfyrs`** · região São Paulo (sa-east-1) · plano free ($0).
- **Dashboard:** https://supabase.com/dashboard/project/aastkhfbmyfaldfcfyrs
- O schema completo (tabelas + Realtime + RLS) está em **`supabase.sql`**. Para recriar do zero
  num projeto novo: SQL Editor → cole o `supabase.sql` → Run.

**Tabelas:**
- `elevadores` — 4 fixos (id 1–4). Campos: `status` (`livre`|`ocupado`|`aguardando`|`pronto`), `placa`, `carro`, `servico` (uma linha por serviço), `mecanico`, `ocupado_em` (início, p/ cronômetro), `updated_at`.
- `fila_alinhamento` — fila do alinhamento. `placa` (opcional), `carro`, `ordem`.
- `aguardando` — carros que chegaram e esperam um elevador livre. `placa`, `carro`, `servico`, `mecanico`.
- `lembretes` — recados pros mecânicos. `texto`, `destinatario` (opcional), `prioridade` (`normal`|`urgente`).
- `historico` — preenchido ao **Liberar** um elevador. `elevador_id`, `placa`, `carro`, `servico`, `mecanico`, `entrada`, `saida`. Base do `/relatorio`.
- `config` — linha única (id=1): `som_ativo`, `volume` (0–1), `pin` (trava do admin), `alerta_horas` (limite p/ "carro parado").

> **Realtime** está ativado nas tabelas e **RLS** está liberado pra acesso público (sem auth, rede local).
> **Estado atual: banco ZERADO** (4 elevadores livres, demais tabelas vazias, config no padrão).

---

## 7. Identidade visual (design system)

Conceito: **quadro de boxes de oficina / pit board de automobilismo** (industrial, aço + vermelho Jura). Feito de propósito pra **não ter cara de template/IA**.

- **Fontes** (Google Fonts, importadas no `app/globals.css`):
  - `Barlow Condensed` → títulos, labels, status, números (classe `font-display` / `.eyebrow` / `.section-title`).
  - `Inter` → corpo.
  - `Roboto Mono` → relógio, cronômetros, placas (classe `font-mono`).
- **Cores** (em `tailwind.config.ts`, prefixo `jura-`): `bg #181b20`, `panel`, `card`, `input`, `border`, `line`, `red #d11f1f` (marca), `green` (livre), `blue` (aguardando), `amber` (alerta/lembrete), `ink` (texto), `muted`.
- **Status dos elevadores** em `lib/status.ts` (`STATUS_META`): cor + fundo + label de cada status.
- **Assinaturas visuais:** número do box "pintado" no fundo do card (`.bay-ghost`); **placa renderizada como plaquinha** (`.plate`); marcadores em losango na cor do status; título de seção com etiqueta vermelha (`.section-title`).
- **Ícones:** SVG em `components/Icon.tsx` (sem emoji).
- **Logo:** `public/logo.png` (componente `components/Logo.tsx`, com fallback em texto se faltar).

---

## 8. Estrutura de arquivos

> ⚠️ Esta seção é a estrutura ORIGINAL. Veja a **seção 13** pro que mudou
> (login, /orcamento, /configuracoes, voz, modal, RLS, mecânicos no banco).

```
app/
  layout.tsx            raiz (fontes, metadata, DialogProvider + MecanicosProvider)
  globals.css           tema, fontes, classes (.plate, .eyebrow, .section-title, pulsos)
  page.tsx              home com atalhos (ícones SVG, 4 destinos)
  painel/page.tsx       TV: realtime, som+VOZ por evento, relógio, conexão, auto-reload 04h
  admin/page.tsx        recepção: CRUD elevadores/fila/aguardando/lembretes (config saiu daqui)
  orcamento/page.tsx    orçamento de pneus pro WhatsApp (NOVO)
  configuracoes/page.tsx som/voz/volume/alerta + CRUD de mecânicos (NOVO)
  relatorio/page.tsx    métricas e histórico
components/
  ElevadorCard.tsx      card do elevador (modo "painel" e "admin")
  FilaAlinhamento.tsx   fila (TV = pista horizontal; admin = lista editável)
  Aguardando.tsx        carros aguardando + mover pro elevador OU alinhamento (bloco lateral)
  Lembretes.tsx         lembretes (TV + admin)
  ServicoSelector.tsx   chips de serviço + select de mecânico (vem do MecanicosProvider)
  AutoFitBox.tsx        encolhe a fonte até caber (TV nunca corta) — IMPORTANTE
  Icon.tsx              ícones SVG
  Logo.tsx              logo sobre "placa" branca (NÃO some no fundo escuro)
  NavMenu.tsx           cabeçalho fixo + navegação + Sair (admin/orcamento/relatorio/config)
  AuthGate.tsx          tela de login (senha 200903) — protege tudo menos a TV
  Dialog.tsx            modal de confirmação/aviso do site (useDialog)
  MecanicosProvider.tsx carrega a lista de mecânicos do banco (realtime)
lib/
  supabase.ts           client + TIPOS (Config tem voz_ativa; tipo Mecanico)
  constantes.ts         SERVICOS_PADRAO (ainda hardcoded) + helpers de serviço
  auth.ts               senha fixa 200903 + helpers (localStorage)
  status.ts             STATUS_META + tempoDecorrido + carroParado
  som.ts                beeps + VOZ (falar() Web Speech, tocarVoz() MP3)
public/voz/             MP3 opcionais de voz humana (LEIA-ME.txt com os nomes)
supabase.sql            schema completo + RLS por operação + mecanicos (rodar p/ recriar)
.env.local              credenciais (vai junto na cópia da pasta)
```

---

## 9. Funcionalidades PRONTAS ✅

- 4 elevadores com status: Livre / Ocupado / Aguard. peça / Pronto (pulsa verde).
- **Cronômetro** de tempo no elevador + alerta "carro parado" (limite configurável, pisca âmbar).
- **Som por elevador** (tom diferente cada um) + beep triplo em "Pronto" + beep ao sair da fila. Liga/desliga e volume na recepção. (Áudio destrava no 1º toque — ver pegadinhas.)
- **Serviços em caixas de seleção** (Alinhamento/Balanceamento/Rodízio/Troca de óleo) + campo livre com quebra de linha. Na TV viram **lista** que se auto-ajusta pra nunca cortar.
- **Mecânico responsável** (select com a equipe).
- **Fila de alinhamento** como pista horizontal (PRÓXIMO em destaque + fichas numeradas). Placa **opcional**.
- **Carros aguardando**: pré-cadastra e move pro elevador livre com 1 clique. "Pronto" pergunta se move pra fila de alinhamento.
- **Lembretes** com destinatário e prioridade (urgente = vermelho); somem da TV após 12h.
- **Relatório** (`/relatorio`): carros atendidos, tempo médio, serviços mais feitos, ranking por mecânico (hoje/7/30 dias).
- **Config** (⚙️ na recepção): som, volume, horas de alerta, **PIN** opcional do admin.
- **Robustez da TV:** indicador "Sem conexão" e **auto-reload às 04:00**.
- **Visual** repaginado (seção 7).

---

## 10. O que FALTA / backlog (em ordem de prioridade sugerida)

1. **Deploy na Vercel** + configurar o Raspberry Pi em modo kiosk (instruções no `README.md`). *Ainda não feito — o usuário pediu pra adiar.*
2. **Editar equipe e serviços pela tela** — hoje `MECANICOS` e `SERVICOS_PADRAO` estão fixos em `lib/constantes.ts`. Ideal: mover pra tabelas no Supabase e editar nas Configurações.
3. **Busca por placa / histórico do cliente** — campo pra digitar placa e ver passagens anteriores (usa `historico`).
4. **Relatório: exportar (Excel/PDF)** + tempo médio por tipo de serviço + produtividade por mecânico.
5. **TV:** carrossel de avisos/promoções quando não há lembrete; modo "Fechado / Abrimos 8h" fora do horário.
6. **Confirmar antes de remover** lembrete e item da fila (hoje só o "Liberar" pergunta).
7. (Decartado por enquanto) Aviso ao cliente por WhatsApp.

---

## 11. Pegadinhas / regras importantes (NÃO esquecer)

- **Não rode `npm run build` com o `npm run dev` ligado** — o build sobrescreve a pasta `.next` e o dev passa a dar 404 em todos os assets (CSS "some"). Se acontecer: pare tudo, `rm -rf .next`, e rode `npm run dev` de novo.
- **Som (autoplay):** o navegador bloqueia áudio até o 1º gesto. Na TV aparece a barra "Toque na tela para ativar o som"; um toque libera. No Raspberry, abrir o Chromium com `--autoplay-policy=no-user-gesture-required` que o som toca sozinho.
- **AutoFitBox:** é o que garante que **nada corta na TV** (encolhe a fonte até caber). Para funcionar, o container precisa ter altura fixa — todos os pais devem ter `min-h-0` na cadeia flex. Se algo voltar a cortar, é quase sempre um `min-h-0` faltando.
- **`servico`** é uma string com **uma linha por serviço** (`\n`). `lib/constantes.ts` tem `montarServico`/`separarServico` pra converter de/para os chips + texto livre.
- **`ocupado_em`** só é definido quando o carro ENTRA (status passa a ocupado). Trocar pra "aguardando"/"pronto" NÃO reseta o cronômetro. "Liberar" salva no `historico` e limpa.
- A `anon key` é pública; pode versionar/compartilhar sem medo.

---

## 12. Como continuar com Claude Code no PC novo

1. Instale o **Node.js 18+** (https://nodejs.org) — vem com o npm.
2. Copie a pasta inteira. **Atenção à estrutura aninhada:** o app fica em
   `painel jura/painel jura/` (inclui `.env.local` e `public/logo.png`). Na raiz externa
   ficam os `.bat` e os guias (ver seção 13).
3. Dentro do app: `npm install` e depois suba pelo `iniciar.bat` (ou `npm run dev`).
4. **O banco já está aplicado na nuvem** (Supabase `aastkhfbmyfaldfcfyrs`) — NÃO precisa
   rodar migração; só `.env.local` + `npm install`. O `supabase.sql` é só pra recriar do zero.
5. Abra o Claude Code na pasta e mande ele **ler este `CONTEXTO.md` primeiro — inclusive a
   seção 13**, que tem TUDO que mudou (login, /orcamento, /configuracoes, voz, modal, RLS,
   mecânicos no banco).
6. Login do sistema: senha **200903** (Recepção/Orçamento/Relatório/Config). TV não pede.
7. Próximos passos sugeridos: **testar o fluxo**, depois **deploy na Vercel** + **Raspberry**
   (guia em `RASPBERRY-TV.md`).

---

## 13. Atualizações recentes (2026-06-23)

### Estrutura de pastas (IMPORTANTE)
O projeto está **aninhado**: a raiz é `C:\PROJETOS\painel jura\` e o **app Next fica em
`C:\PROJETOS\painel jura\painel jura\`**. Na raiz externa ficam só os arquivos operacionais:
- `iniciar.bat` — sobe o servidor (`npm run dev`) na pasta certa.
- `abrir-tv.bat` — abre o painel no Chrome em tela cheia **com o som já liberado**
  (flag `--autoplay-policy=no-user-gesture-required`).
- `RASPBERRY-TV.md` — guia de boot automático no Raspberry (kiosk).

### Login / senha (NOVO)
- Trava simples por **senha fixa `200903`** (sem cadastro). Código em `lib/auth.ts`
  (estado no `localStorage`) + componente `components/AuthGate.tsx`.
- **Recepção, Orçamento e Relatório exigem login.** A **TV (`/painel`) não pede nada.**
- Botão **Sair** no menu. O antigo "PIN" das Configurações foi removido (a senha agora é fixa).

### Navegação (NOVO)
- `components/NavMenu.tsx` — cabeçalho **fixo (sticky)** e **igual nas 3 telas**
  (Início · Recepção · Orçamento · Relatório · TV + Sair). Todas as telas usam **largura
  total** (`px-6`), pra ficarem consistentes.

### Orçamento de pneus (NOVO) — `/orcamento`
- Gera texto pronto pro WhatsApp (negrito com `*...*`). Campos: **medida**, **qtd de pneus**
  (padrão 4), **parcelas** (1–12x, **sem 11x**). Vários modelos por orçamento.
- Cálculo: `parcela = (à vista × (1 + taxa)) / nº`, **arredondado pra cima até terminar em ,90**.
- Tabela de taxas embutida no `app/orcamento/page.tsx`. Botão "Copiar texto".

### Som com VOZ (NOVO)
- A TV **fala** os eventos (voz do navegador, `lib/som.ts` → `falar()`):
  - Elevador → **"Elevador X ocupado / livre / teve atualização"**.
  - Novo lembrete → **"Novo recado da recepção"**.
  - Novo carro na fila → **"Novo carro para alinhar"**.
- Ordem de prioridade por evento: **MP3 em `public/voz/`** (voz humana, opcional) →
  **voz do navegador** → **beep**. Nomes dos MP3 em `public/voz/LEIA-ME.txt`.

### Recepção — mudanças de fluxo (NOVO)
- Botões do elevador ocupado: **Ocupado · Aguardando · Pronto**.
  - **"Aguardando"** agora **devolve o carro pra lista "Carros aguardando"** (não vai pro
    histórico) e libera o elevador. (Substituiu o status "Aguard. peça".)
- **"Carros aguardando"** virou **bloco lateral à direita** dos elevadores e cada carro tem,
  além de **→ Elev 1/2/3/4**, o botão **→ Alinhamento** (manda direto pra fila).
- **Fila + Lembretes** ficam **lado a lado (50/50)**. Cards de elevador mais compactos.

### Segurança do banco (RLS — "hardening leve")
- Trocadas as políticas `acesso_publico_* FOR ALL using(true)` por políticas **por operação**
  (ver `supabase.sql`). Travado o que é estrutural/irreversível:
  - `historico` → só SELECT + INSERT (não dá pra apagar/alterar registros).
  - `elevadores` → só SELECT + UPDATE (os 4 são fixos; sem insert/delete).
  - `config` → só SELECT + UPDATE (linha única; sem insert/delete).
  - `aguardando`/`fila_alinhamento`/`lembretes` → operações que o app usa.
- ⚠️ **Ainda não é "blindado":** sem backend, a `anon key` no navegador permite as escritas
  acima. Pra travar de verdade, mover as escritas pra um servidor (Route Handler +
  `service_role`) e deixar anon só com SELECT. *(Decisão do dono: ficou no "leve".)*

### Tela de Preços de Pneus (NOVO) — `/precos`
- Catálogo em **blocos**: cada bloco = uma **medida** (ex: 175/70/13) com uma obs
  (ex: IMPORTADO) e vários **modelos + valores** dentro. Tudo editável, salva no blur.
- Botões: + Adicionar medida (bloco), + modelo (item), remover medida/modelo.
- Banco: tabelas `tabela_medidas` (bloco) e `tabela_modelos` (itens, FK on delete cascade).
  Já populadas com as 27 medidas do PDF original **na ordem** + obs IMPORTADO + alguns modelos.
- É só catálogo de referência (separado do `/orcamento`, que gera o texto pro WhatsApp).

### Tela de Configurações (NOVO) — `/configuracoes`
- Rota dedicada (saiu de dentro do `/admin`). Tem: **Som na TV** (liga/desliga geral),
  **Voz falada** (liga/desliga — novo campo `config.voz_ativa`), **Volume**, **Testar voz**,
  **Alerta de carro parado** e **gestão de Equipe (mecânicos)**.
- **Mecânicos no banco:** tabela `mecanicos` (id, nome, ordem). Substitui o `MECANICOS`
  hardcoded. Editável na tela (add/renomear/remover). `components/MecanicosProvider.tsx`
  carrega a lista com realtime e alimenta os selects (`ServicoSelector`, `Lembretes`).
- **Voz x beep:** `som_ativo` liga/desliga TUDO; `voz_ativa` decide voz (MP3→navegador) ou
  só beep. Lógica no `app/painel/page.tsx`.
- Link **Config** no `NavMenu`.

### Modal de confirmação (NOVO)
- `components/Dialog.tsx` (`useDialog` → `confirmar()` / `avisar()`) substitui os
  `confirm()`/`alert()` do navegador. Registrado no `app/layout.tsx`. Há confirmação ao
  **remover** lembrete, item da fila e carro aguardando.

### Deploy (NO AR ✅)
- Publicado na **Vercel**: projeto `joao-jura/jura-painel` → **https://jura-painel.vercel.app**
  (TV: `/painel`, recepção: `/admin`).
- Feito via **Vercel CLI** rodando de dentro de `painel jura/painel jura`:
  `vercel deploy --prod --scope joao-jura --token <TOKEN>`. Pra re-deployar depois de
  mudanças, rode o mesmo comando. (Nome explícito `--project jura-painel` porque a pasta
  tem espaço no nome.)
- Env vars `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` setadas no projeto
  (Production) e também em `.env.production`.
- `abrir-tv.bat` e `RASPBERRY-TV.md` já apontam pra URL da Vercel.

### Infra / qualidade
- **ESLint** configurado (`.eslintrc.json` + deps). `npm run lint` limpo.
- **`next.config.js`**: `watchOptions.ignored` pra parar os erros "Watchpack EINVAL"
  (`C:\pagefile.sys`) que derrubavam o dev no Windows.
- **Verificado:** `tsc --noEmit` sem erros + `next build` de produção passou (8 páginas).

---

_Última atualização: 2026-06-23. App revisado (tipos + build OK), com login, orçamento, voz e layout repaginado._
