# Segurança, schema e deploy — Jura Painel

## Raiz real do projeto
O app fica em **`painel jura/painel jura`** (pasta aninhada). Os `.bat` de TV
ficam em `painel jura/` (pai). **Não mover** — scripts externos dependem do caminho.

## Como a autenticação funciona agora
- **Não há mais senha fixa no bundle** nem confiança em `localStorage`.
- O PIN é verificado **no servidor** (`ADMIN_PIN`) por uma Server Action, que
  cria uma **sessão em cookie httpOnly assinado** (`SESSION_SECRET`, HMAC + expiração 12h).
- `middleware.ts` protege `/admin`, `/orcamento`, `/precos`, `/relatorio`,
  `/configuracoes` (sem sessão → `/login`). `/painel` e `/` são públicas.
- **Todas as escritas** passam por Server Actions (`app/actions/*`) que usam o
  cliente `service_role` (só no servidor). O RLS bloqueia escrita anônima.
- Operações compostas (liberar, mover, trocar ordem…) são **funções PostgreSQL
  atômicas** chamadas via `supabase.rpc()` — tudo-ou-nada, sem perda de dados.

## Variáveis de ambiente (dev em `.env.local`, prod na Vercel)
| Nome | Onde | Segredo? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | cliente+servidor | não |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente+servidor | não (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | **só servidor** | **sim** |
| `SUPABASE_URL` (opcional) | servidor | não |
| `ADMIN_PIN` | **só servidor** | **sim** |
| `SESSION_SECRET` | **só servidor** | **sim** |

Gerar o segredo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Passos no Supabase (nesta ordem)
1. **Aplicar a migração** `supabase/migrations/20260714120000_corrigir_schema_seguranca.sql`
   no SQL Editor. Ela é incremental e segura (sem `DROP TABLE`, sem apagar dados).
2. Conferir em *Project Settings > API* a `service_role key` e configurar as envs.
3. **Só depois** que o app novo estiver no ar (escritas via servidor), o RLS
   fechado passa a valer sem quebrar nada — a migração já faz isso.

## Testar localmente
```
npm install
# preencher .env.local com as 4 variáveis privadas + as 2 públicas
npm run test      # 35 testes (métricas, fuso SP, pausa, sessão)
npx tsc --noEmit  # tipos
npm run lint      # eslint
npm run build     # build de produção
npm run dev       # http://localhost:3000  (login em /login com o ADMIN_PIN)
```

## Checklist de deploy na Vercel
- [ ] Configurar as 6 variáveis de ambiente (as privadas SEM `NEXT_PUBLIC`).
- [ ] Aplicar a migração no Supabase **antes** ou junto do deploy.
- [ ] Deploy. Testar: login, logout, escrita no admin, `/painel` público, relatório.
- [ ] Recarregar a TV do Raspberry (`TV-reiniciar.bat`) pra pegar a versão nova.

## Rollback (preservando dados)
- **App:** a Vercel guarda deploys anteriores — *Promote* o deploy antigo.
- **Banco:** a migração **não apaga dados**; o que muda é a RLS e as funções.
  Para reverter a RLS ao estado antigo (anon com escrita), recrie as políticas
  antigas — mas isso **reabre o furo de segurança**; preferir corrigir adiante.
  Nenhuma coluna/tabela é removida, então não há perda por reverter o app.
