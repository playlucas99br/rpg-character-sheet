# Desenvolvimento e operação

Leia primeiro o [dicionário do banco](DATABASE.md) e a [matriz de permissões](AUTH_AND_PERMISSIONS.md). Este guia usa Supabase + Next.js/Vercel como caminho principal. A compatibilidade Sites/D1 está preservada para a origem legada; não copie dados entre os dois caminhos sem conferir o marco de importação.

## Preparar o projeto

Requisitos: Node.js 24, pnpm 11.25.0 e Supabase CLI. Docker é necessário apenas para executar o stack Supabase local completo. Os testes PostgreSQL embarcados não precisam de Docker.

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Preencha `.env.local` com os valores do **ambiente de desenvolvimento**, sem versioná-lo:

| Variável | Onde usa | Conteúdo |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Next.js, Auth, Storage e Realtime | URL pública do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Next.js e navegador | Publishable key; nunca `service_role` ou `sb_secret_*` |
| `NEXO_GAME_API_URL` | API Next.js | Exatamente `<NEXT_PUBLIC_SUPABASE_URL>/functions/v1/nexo-game` |

As três variáveis são identificadores públicos, não autorização administrativa. Produção e preview devem usar o ambiente Supabase correspondente. Uma preview apontada para o projeto de produção **altera os dados reais** quando o usuário interage; use projeto separado para desenvolvimento destrutivo. Não criar branches/projetos pagos sem combinar o custo.

```sh
pnpm run dev:vercel
```

Para o stack completo local, `supabase start` usa `supabase/config.toml`; mantenha confirmação de e-mail e política de senha alinhadas ao ambiente hospedado. O serviço local de e-mail captura as mensagens de teste. O adapter de persistência aceita somente HTTPS em domínio Supabase por padrão; o stack local exige um adapter de teste próprio, não relaxar essa validação em produção. Para rodar a aplicação completa sem esse ajuste, utilize um projeto Supabase remoto de desenvolvimento. `pnpm test` já exercita PostgreSQL sem depender de Auth/Storage locais.

## Migrações

Fontes de verdade: arquivos em `supabase/migrations/` e histórico remoto `supabase_migrations.schema_migrations`. Não editar uma migração já aplicada nem executar `db reset` contra produção.

```sh
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase migration list
supabase migration new descricao_da_mudanca
```

Edite o arquivo criado pela CLI. Para novas consultas `.prepare(...)`, gere o fragmento com `node scripts/supabase-query-registry.mjs` e revise-o dentro da nova migração. Não abra um endpoint de SQL arbitrário.

```sh
pnpm test
supabase db push --dry-run
supabase db push
supabase migration list
```

Use conexão autorizada de desenvolvimento primeiro. A aplicação de schema e a publicação de função são etapas distintas; um PR não as executa sozinho. O CI valida código e compilações, sem credenciais de produção.

A migração `consolidate_platform` é aditiva: cria `assets`, bucket privado, RPCs de mídia/readiness e Broadcast. Mantém as campanhas, contas, fichas, rolagens e marcos existentes. A função antiga continua compatível depois da migração. A nova função requer `nexo_schema_status().schemaVersion >= 2`; por isso aplique **migração → Edge Function → frontend** nessa ordem.

## Publicar a Edge Function

```sh
node scripts/build-supabase-game.mjs
```

O artefato é `dist/supabase-game/index.ts`. O build troca o adapter do domínio pelo adapter Supabase e reúne dependências. **Não publicar diretamente `supabase/functions/nexo-game/index.ts`**, que ainda depende do build para resolver o repositório compartilhado.

Envie o bundle como `index.ts` da função `nexo-game` pelo conector de deploy ou por staging separado da CLI. Com CLI:

```sh
mkdir -p /tmp/nexo-edge/supabase/functions/nexo-game
cp dist/supabase-game/index.ts /tmp/nexo-edge/supabase/functions/nexo-game/index.ts
supabase functions deploy nexo-game --workdir /tmp/nexo-edge --project-ref SEU_PROJECT_REF --no-verify-jwt
```

Não altere os arquivos de origem para fazer staging. A função valida o JWT em Auth a cada operação; a verificação legada do gateway fica desligada somente para esse mecanismo próprio. Mantenha a versão anterior disponível no histórico para rollback.

Credenciais administrativas são lidas apenas do ambiente gerenciado da função (`SUPABASE_SECRET_KEYS.default` ou `SUPABASE_SERVICE_ROLE_KEY`). URL e chave pública também vêm das variáveis gerenciadas. Não copie esses segredos para Vercel, `.env.example`, prints ou GitHub Actions. O gateway legado `nexo-database` usa um token servidor → servidor separado; não é o endpoint da Vercel e não deve ser chamado pelo navegador.

## Publicar o frontend

```sh
pnpm typecheck
pnpm run build:vercel
```

O GitHub está ligado à Vercel; branches/PRs produzem previews conforme a configuração do projeto. A produção acompanha `main`. Revise a preview e os checks antes de integrar. `vercel.json` escolhe o build Next.js. O comando `pnpm build` mantém o build Vinext/Sites e também é verificado no CI.

Não remova a proteção de preview para testar. Use o acesso autorizado/share da Vercel e URLs de callback explicitamente permitidas no Supabase. Cada domínio novo precisa de configuração de Auth; não usar wildcard amplo de domínio alheio.

## Configurar Auth e e-mail

No painel do projeto, confira:

1. Auth → Providers: e-mail/senha habilitado, confirmação de e-mail ativa, cadastro conforme a política do projeto.
2. Auth → URL Configuration: Site URL da produção e callbacks de produção/desenvolvimento autorizados. Callback: `/auth/callback`; recuperação: `/auth/callback?next=/auth/password`.
3. Auth → Password Security: mínimo de 10 caracteres, conforme a UI/API. Ativar a checagem de senhas vazadas quando disponível no plano.
4. Auth → SMTP: configurar remetente/domínio e credenciais do provedor para entregar confirmações e recuperações aos jogadores. O serviço padrão possui restrições e não comprova entrega para todo destinatário.
5. Testar cadastro, confirmação, entrada, recuperação, atualização de senha e saída em uma conta descartável. Não desativar confirmação para contornar falha de e-mail.

Credenciais SMTP/OAuth dependem do provedor escolhido e não são inferidas do repositório. `config.toml` ajuda a reproduzir o desenvolvimento, mas não substitui a configuração hospedada nem prova que um e-mail foi entregue. Login social não está habilitado pela aplicação nesta versão.

## Verificações

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm run build:vercel
node scripts/build-supabase-game.mjs
```

| Verificação | O que cobre | Limite |
| --- | --- | --- |
| Testes de domínio/SQLite/API | Ações reais do repositório, papéis, rolagens, recursos, conflitos e persistência | Adapter SQLite, não servidor hospedado |
| `tests/postgres.test.mjs` | Todas as migrações em PostgreSQL/PGlite; grants, RLS, SQL fechado, mídia, versão e políticas Realtime | Auth, metadados de Storage e transporte Broadcast são modelados |
| Testes de rotas Vercel | Identidade forjada, origem, corpo inválido e sessão ausente | Não comprovam entrega de e-mail |
| Typecheck e dois builds | Contratos TypeScript, rotas Next.js e compatibilidade Sites | Build não aplica migração nem publica função |
| Sessão hospedada com contas descartáveis | Auth real, API, bytes do Storage, URLs privadas e Realtime | Exige ambiente e contas de teste autorizados |

Para smoke test remoto: mestre cria campanha, jogador entra por código, ambos criam fichas permitidas; uma terceira conta tenta ler/alterar IDs alheios. Confira monstro/rolagem privada invisível, PV/PE/SAN após reload, `409` entre duas abas, upload de cada tipo, retrato e exclusão. Após remover o jogador, novas leituras e assinaturas precisam ser negadas. Não usar contas reais de jogadores como fixtures.

O teste antigo `tests/supabase-live.mjs` é específico do gateway Sites/importação e recebe configuração pelo stdin. Não confundi-lo com um teste de Supabase Auth. Não colocar tokens em argumentos do shell ou fixtures versionadas.

Consultas administrativas úteis, sem retornar fichas nem e-mails:

```sql
select tablename, rowsecurity
from pg_tables where schemaname='nexo' order by tablename;

select has_function_privilege('anon','public.nexo_query(jsonb)','EXECUTE') as anon_query,
       has_function_privilege('authenticated','public.nexo_assets(text,text,jsonb)','EXECUTE') as browser_assets;
-- Ambos devem ser false.

select id, public, file_size_limit, allowed_mime_types
from storage.buckets where id='nexo-assets';

select status, count(*) from nexo.assets group by status;
```

Confira Security/Performance Advisors e logs Auth/Edge/Postgres. Não registrar JWTs, senhas, URLs assinadas, payloads de fichas nem token de upload. Erros da aplicação são resumidos para o usuário; o log operacional deve permitir identificar a causa sem expor dados privados.

## Pendências de arquivos e limpeza

`pending`: reserva sem confirmação. O dono autorizado/mestre pode confirmar se o upload terminou ou excluir na interface. `deleting`: leitura já bloqueada; repetir a exclusão conclui a remoção no Storage e depois nos metadados.

Para reconciliar manualmente, liste os metadados de `nexo.assets` e os objetos do bucket pela **API Storage** e compare `object_path`. Antes de remover, confira campanha, idade e estado. Tokens de upload assinados podem continuar válidos após abandonar um envio; aguarde sua expiração, com margem operacional de 24 horas para reservas abandonadas. Não apagar registros de `storage.objects` com SQL. Essa operação altera apenas metadados internos e pode deixar os bytes órfãos.

Após excluir uma ficha, seus assets permanecem com `sheet_id=NULL` e continuam sujeitos a dono/mestre/visibilidade; o mestre pode removê-los. Após exclusão administrativa de campanha, o cascade elimina seus metadados, mas os objetos devem ser removidos pelo serviço Storage. Não há ação de excluir campanha na interface atual nem rotina automática de limpeza.

## Backup e recuperação

Use o mecanismo de backup/export PostgreSQL adequado ao plano e mantenha cópia do bucket por mecanismo próprio de Storage. Um backup do PostgreSQL contém metadados de arquivos, **não seus bytes**. `imports` não é backup, e GitHub não contém os dados dos usuários.

Antes de migrações que removem ou transformam dados, teste restauração em ambiente separado e confira integridade de perfis, participações, fichas, rolagens e arquivos. Nunca testar restauração sobrescrevendo a produção.

Rollback deste PR: volte frontend e `nexo-game` à versão anterior. A migração aditiva pode permanecer; não apagar `assets` ou bucket com arquivos de usuários para desfazer código. Uma correção de schema deve entrar por nova migração.

## Onde alterar cada regra

| Mudança | Arquivos principais |
| --- | --- |
| Colunas, constraints, RLS, triggers, RPCs | Nova migração em `supabase/migrations/` + testes PostgreSQL |
| Ficha/campos/limites | `lib/game/types.ts`, `validation.ts`, editor e view |
| Papéis e ações de jogo | `lib/game/access.ts`, `server.ts`, testes API e registro SQL se necessário |
| Auth/sessão/callback | `lib/auth/`, `app/api/auth/`, `app/auth/`, `proxy.ts` |
| Rotas Vercel → Supabase | `lib/game/remote.ts`, `app/api/game/`, `app/api/media/` |
| Autorização da função e adapter | `supabase/functions/nexo-game/`; sempre recompilar bundle |
| Storage e imagens | `lib/game/media*`, `components/campaign-assets.tsx`, RPC `nexo_assets` |
| Atualização da mesa | `lib/game/use-campaign-realtime.ts`, triggers e política Realtime |
| Sistema novo | Registro em `systems.ts`, tipos, validação, dados, constraint da campanha e testes |

Ao adicionar um sistema, mantenha o sistema de campanhas existentes estável. Campos comuns ficam relacionais; regras variáveis podem ficar no JSON validado. Extraia uma tabela específica quando houver necessidade real de pesquisa, integridade ou relacionamentos, com migração e compatibilidade de leitura dos registros antigos.
