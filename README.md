# Nexo — RPG Character Sheet

Um espaço para organizar campanhas, criar personagens e jogar com fichas interativas. A primeira versão prioriza **Ordem Paranormal** e **Jujutsu adaptado ao sistema de Ordem**.

## O que já funciona

- Login com ChatGPT no Sites e e-mail/senha via Supabase Auth na Vercel.
- Tela de entrada com criação do perfil no primeiro acesso e demonstração escolhida explicitamente.
- Indicador de conexão e salvamento confirmado pela API; falhas e sessões encerradas nunca aparecem como salvamento concluído.
- Recuperação de rascunhos de edição nesta aba, separados por conta e ficha, com resolução de conflitos entre janelas.
- Campanhas independentes, com papéis de mestre e jogador por campanha.
- Convite por código, renovação do convite e remoção de participantes.
- Jogadores acessam suas próprias fichas; mestres acessam todas as fichas da campanha.
- Bestiário e rolagens de criaturas exclusivos do mestre, com autorização no servidor.
- Editor de identidade, atributos, recursos, perícias, ataques, técnicas, equipamento e notas.
- Controles de vida, PE/energia amaldiçoada e sanidade, com valores limitados entre zero e o máximo.
- Rolagens de atributos, perícias, acerto, dano, habilidades e fórmulas livres.
- Desconto de energia ao usar habilidades. Nas habilidades com rolagem, custo e histórico são gravados na mesma transação.
- Histórico compartilhado por campanha e rolagens privadas do mestre.
- Exportação da ficha em JSON e impressão em A4.
- Modo de demonstração isolado, persistido apenas no navegador, com alternância entre visão de mestre e jogador.
- Imagens privadas por campanha: retratos, tokens e mapas, com upload assinado e seleção de retrato na ficha (Supabase/Vercel).
- Avisos de atualização em tempo real por canal privado, com leitura autenticada e polling de recuperação a cada 20 segundos.

## Sistemas e limites desta versão

| Sistema          | Implementação inicial                                                 |
| ---------------- | --------------------------------------------------------------------- |
| Ordem Paranormal | Cinco atributos, perícias editáveis, pool de d20 e recursos PV/PE/SAN |
| Jujutsu • Ordem  | Base de Ordem, energia amaldiçoada e técnicas configuráveis pela mesa |
| D&D              | Modelo d20, valores de atributos e cálculo dos modificadores          |
| Call of Cthulhu  | Modelo percentual com testes d100 contra o valor da perícia/atributo  |
| Tormenta20       | Modelo d20 com atributos, perícias e recursos editáveis               |
| Personalizado    | Modelo d20 inicial e campos editáveis                                 |

Os modelos não incluem os livros ou um compêndio oficial. Não há automação completa de progressão, criação de classes, pré-requisitos de perícias, descansos, condições, espaços de magia ou todas as regras de combate. As mesas definem seus próprios valores e efeitos. Os modelos adicionais são uma base para evolução, e a adaptação de Jujutsu ainda precisa receber as regras específicas da campanha do grupo.

Em Ordem/Jujutsu, o teste usa o maior entre N d20, sendo N o atributo, e soma o bônus da perícia. Atributo zero usa o menor entre 2d20. Ataques usam uma perícia configurada para acerto e uma expressão própria para dano. O crítico sinaliza o resultado natural; multiplicadores de dano são aplicados manualmente conforme a mesa.

Exemplos do rolador: `1d20+5`, `2d8+3`, `3d20kh1+5`, `2d20kl1`. Não utiliza `eval`; aceita até 30 dados, de 2 a 1000 lados, com bônus de -1000 a 1000. Expressões com vários grupos de dados ainda não estão implementadas.

## Documentação técnica

- [Banco de dados: tabelas, colunas, JSON das fichas, índices e transações](docs/DATABASE.md)
- [Autenticação, permissões de jogador/mestre, RLS e arquivos privados](docs/AUTH_AND_PERMISSIONS.md)
- [Desenvolvimento, migrações, publicação, testes, backup e manutenção](docs/OPERATIONS.md)
- [Validação e etapas de publicação desta entrega](docs/VALIDATION.md)

O caminho principal para continuar o projeto é **Next.js/Vercel + Supabase**. Comece pelo guia de operação acima. As instruções D1 abaixo mantêm o ambiente legado do Sites.

## Desenvolvimento

Requisitos: **Node.js 24** (inclui o SQLite usado pelos testes) e **pnpm 11.25.0**, definido em `packageManager`.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm build
```

Antes de usar o banco de desenvolvimento, aplique a migração ao D1 local, depois de compilar:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_bouncy_hercules.sql
pnpm dev
```

A prévia portátil usa a porta exibida no terminal. O starter simula login com ChatGPT apenas no desenvolvimento portátil em loopback; a simulação não entra na compilação de produção. No ambiente gerenciado do ChatGPT, o supervisor de Sites controla a prévia e a autenticação simulada fica desligada.

Para alterar o D1 de desenvolvimento, edite `db/schema.ts`, rode `pnpm db:generate` e revise a nova migração. Migrações aplicadas não devem ser reescritas. A publicação de Sites provisiona o D1 e aplica suas migrações. As migrações do Supabase são independentes, conforme a configuração de produção abaixo.

## Arquitetura e acesso

- **React + TypeScript**, com Next.js na Vercel e Vinext/Vite em Cloudflare Workers pelo Sites.
- **Supabase/PostgreSQL** em produção para perfis, campanhas, membros, fichas e rolagens. O D1 permanece disponível para desenvolvimento e como cópia de origem na transferência inicial.
- `lib/game/systems.ts`: registro de sistemas e modelos de ficha.
- `lib/game/dice.ts`: interpretação das fórmulas e regras de rolagem.
- `lib/game/server.ts`: persistência, transações e autorização por campanha.
- `app/api/game/route.ts`: API autenticada, validação de origem e respostas sem cache.
- `components/`: telas de campanhas, fichas, editor e dados.

No Sites, a identidade vem do proxy autenticado, pelos cabeçalhos `oai-authenticated-user-*`. Na Vercel, esses cabeçalhos são ignorados: a conta vem da sessão do Supabase Auth, validada novamente na função que executa as operações. O ID e o papel da conta nunca são aceitos do corpo de uma requisição. `X-Nexo-Account` serve apenas para rejeitar abas com uma conta desatualizada.

O código da campanha concede participação na mesa, mas não muda a audiência da hospedagem. A primeira publicação é privada para revisão do proprietário. Antes de convidar o grupo para uso real, compartilhe o Site com a audiência desejada; cada participante deve entrar com sua própria conta.

### Login e salvamento

No Sites, o acesso usa a **conta do ChatGPT**. Na Vercel, cadastro, confirmação do e-mail, entrada e recuperação usam **Supabase Auth**; o aplicativo não armazena senhas em suas tabelas. As sessões são renovadas por `proxy.ts`, com respostas privadas sem cache e um cliente por requisição. No primeiro acesso autenticado à API, um perfil é criado. Seu nome na mesa pode ser editado sem alterar a identidade ou as permissões.

As contas dos dois provedores são distintas: IDs do Supabase recebem o prefixo `supabase:`. Os dados do ChatGPT continuam ligados aos mesmos IDs anteriores, e a tela de entrada oferece um link para esse acesso. Não há união automática por nome/e-mail; vincular provedores exigirá confirmar o controle das duas contas.

### Vercel

O projeto `nexo-rpg` usa Next.js, Node 24 e funções em São Paulo (`gru1`). `vercel.json` seleciona `pnpm run build:vercel`; o comando original `pnpm build` mantém a compilação do Sites.

Configure apenas os três valores públicos de `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `NEXO_GAME_API_URL`. Nenhum token administrativo ou de gateway é necessário na Vercel. A API encaminha o JWT do jogador à função `nexo-game`, que valida a sessão com Supabase Auth e executa o mesmo código de autorização de campanhas do Sites. As credenciais administrativas ficam no ambiente gerenciado da função Supabase. A API privada SQL continua inacessível ao navegador.

Para desenvolvimento Next.js, copie `.env.example` para `.env.local`, preencha esses valores e rode `pnpm run dev:vercel`. Para validar produção: `pnpm run build:vercel` e `pnpm run start:vercel`. Para publicar a função, execute `node scripts/build-supabase-game.mjs` e envie `dist/supabase-game/index.ts` como o entrypoint `index.ts` de `nexo-game`. Esse artefato combina o repositório compartilhado com seu adaptador PostgREST; não publique o fonte sem essa etapa. A função usa autenticação própria, validando o JWT em cada operação; a verificação legada de JWT do gateway fica desligada.

No painel **Supabase Auth → URL Configuration**, use a URL de produção da Vercel em Site URL e autorize `/auth/callback` e `/auth/callback?next=/auth/password` para esse domínio. Autorize apenas as prévias que serão usadas. Confirmação e recuperação de e-mail exigem SMTP configurado para os destinatários da mesa; o serviço padrão tem limites de envio. Mantenha a confirmação de e-mail ligada.

Campanhas, participantes, fichas, PV/PE/SAN, técnicas e histórico são gravados no **Supabase/PostgreSQL** quando o provedor de produção está selecionado. Ajustes de recursos, rolagens e criações são persistidos ao executar a ação. No editor, use **Salvar ficha** para confirmar a edição. A confirmação só aparece após uma resposta válida da API. O Nexo não repete automaticamente uma escrita interrompida: sincronize antes de repetir, porque a ação pode ter sido concluída antes da perda da resposta.

### Supabase em produção

Projeto: **nexo-rpg**, região **São Paulo (`sa-east-1`)**. As tabelas estão no schema privado `nexo`. Os IDs existentes do ChatGPT foram preservados na transferência; contas da Vercel usam o provedor Supabase Auth.

Na Vercel, o navegador usa `/api/game`, `/api/media`, Supabase Auth, transferências assinadas do Storage e canais Realtime privados. As operações de jogo passam por `nexo-game`, autenticadas com o JWT do jogador. O servidor legado do Sites chama `nexo-database` com um token exclusivo de servidor. Não há chave `service_role` no site, no navegador ou no Git. O arquivo `gateway-config.ts` contém somente o hash SHA-256 do token legado. RPCs de jogo são `SECURITY INVOKER`, executáveis somente por `service_role`; os papéis do navegador não recebem privilégios de tabela e também encontram RLS de negação explícita. A única função de leitura disponível a `authenticated` retorna um booleano de participação para autorizar Realtime, sem expor fichas. Veja a matriz de permissões na documentação técnica.

Configure no ambiente do Sites, como segredos de execução:

- `NEXO_DATABASE_PROVIDER=supabase`
- `SUPABASE_DATABASE_GATEWAY_URL`: URL da função `nexo-database` do projeto.
- `NEXO_DATABASE_TOKEN`: token correspondente ao hash publicado na função.
- `NEXO_DATABASE_SOURCE_ID`: identidade estável da origem, como `sites:<project_id>`.

No primeiro acesso autenticado, o servidor verifica o marco de importação. Se necessário, lê as cinco tabelas do D1 e as transfere em uma transação antes de gravar novos dados no Supabase. A origem é preservada, e a importação é idempotente: repetir a mesma origem não duplica nem sobrescreve registros. Um destino com dados de outra origem é recusado. Uma falha não faz a aplicação voltar silenciosamente ao D1. Em desenvolvimento, sem seleção de Supabase, o D1 local continua funcionando.

As migrações PostgreSQL ficam em `supabase/migrations/`, separadas das migrações D1 em `drizzle/`. O gateway aceita somente consultas literais registradas na migração. Ao adicionar uma consulta ao repositório, use `node scripts/supabase-query-registry.mjs` para gerar o fragmento e inclua-o em uma **nova** migração; não reescreva uma migração aplicada. Escritas e lotes usam uma transação com trava de aplicação, preservando a atomicidade entre custo de habilidade e registro da rolagem em requisições concorrentes.

Para a integração legada do Sites, `tests/supabase-live.mjs` recebe configuração pelo stdin protegido e chama a própria rota da API contra o Supabase. Não informe credenciais em argumentos de shell nem salve a configuração em arquivos. O teste cria registros identificados por `verify-...`; remova esses registros de verificação depois de inspecioná-los. Ele não testa Supabase Auth. Os testes padrão de CI continuam independentes da rede e de credenciais, e incluem aplicação das migrações reais em PostgreSQL/PGlite com testes de grants, RLS, mídia e Realtime.

Durante a edição, um rascunho temporário é guardado em `sessionStorage`, separado por conta de quem edita e por ficha. Ele permite recuperar texto após recarregar ou fechar e reabrir o editor na mesma aba. Ao salvar, o rascunho é removido. Rascunhos não substituem o banco nem sincronizam entre dispositivos; fechar a aba pode removê-los. Se o navegador bloquear o armazenamento, a interface avisa. Ao detectar edições simultâneas, o editor preserva alterações independentes e pede uma escolha explícita para os campos em conflito.

Sem conexão, as fichas já carregadas continuam visíveis, e o editor mantém o rascunho quando o armazenamento da aba está disponível. Escritas exigem reconexão. A demonstração continua isolada em `localStorage` e não é importada automaticamente para uma conta real.

Alterações completas de ficha usam versão otimista. Uma edição desatualizada recebe `409`, sem sobrescrever dados mais recentes. Ajustes de recursos são limitados no servidor. Rolagens reais usam aleatoriedade criptográfica do servidor, e rolagens de monstros sempre ficam privadas.

## Validação

`pnpm test` executa testes de domínio, sincronização e integração. A integração chama a API real contra um adaptador D1 em SQLite e verifica autenticação ausente, origem inválida, convites, isolamento entre usuários, permissões de mestre, persistência de recursos, conflitos de versão, custo de habilidade, privacidade de monstros e revogação de acesso. Um teste fecha e reabre um arquivo de banco para confirmar a recuperação do perfil, da ficha, dos recursos e das rolagens. Também são cobertos troca de conta em uma aba antiga, retorno seguro do login, rascunhos com mudanças simultâneas e respostas de rede interrompidas. Os módulos simulados vivem apenas em `tests/`.

O escopo inicial e as decisões para as próximas alterações estão registrados em [docs/PROJECT_SCOPE.md](docs/PROJECT_SCOPE.md).

Os testes não substituem uma sessão de login no Site publicado. A interface de demonstração também é verificada manualmente no navegador, incluindo edição, rolagem, ajuste de recursos e recuperação após recarregar.

## Próximas evoluções

- Incorporar as regras próprias da campanha de Jujutsu: aparar, vestígios, técnicas e progressão.
- Importar fichas JSON e duplicar personagens/criaturas.
- Condições, iniciativa e gerenciamento de combate.
- Presença dos participantes e ferramentas de combate em tempo real.
- Automação dedicada para D&D, Call of Cthulhu e Tormenta20.
- Modelos de sistemas registrados pelo mestre dentro da interface.

Ilustrações vetoriais e textos de exemplo são originais. Este é um projeto independente de apoio às mesas, sem vínculo oficial com as editoras dos sistemas citados.
