# Nexo — RPG Character Sheet

Um espaço para organizar campanhas, criar personagens e jogar com fichas interativas. A primeira versão prioriza **Ordem Paranormal** e **Jujutsu adaptado ao sistema de Ordem**.

## O que já funciona

- Login com ChatGPT e dados vinculados à identidade da conta.
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
- Atualização das campanhas a cada 20 segundos enquanto a página estiver visível.

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

Para alterar o banco, edite `db/schema.ts`, rode `pnpm db:generate` e revise a nova migração. Migrações aplicadas não devem ser reescritas. A publicação de Sites provisiona o D1 e aplica as migrações da versão.

## Arquitetura e acesso

- **React + TypeScript + Vinext/Vite**, com execução em Cloudflare Workers pelo Sites.
- **D1/SQLite** para perfis, campanhas, membros, fichas e rolagens.
- `lib/game/systems.ts`: registro de sistemas e modelos de ficha.
- `lib/game/dice.ts`: interpretação das fórmulas e regras de rolagem.
- `lib/game/server.ts`: persistência, transações e autorização por campanha.
- `app/api/game/route.ts`: API autenticada, validação de origem e respostas sem cache.
- `components/`: telas de campanhas, fichas, editor e dados.

A identidade é fornecida pelo proxy autenticado do Sites, por meio dos cabeçalhos `oai-authenticated-user-*`. O ID da conta não é aceito como identidade a partir do corpo de uma requisição. Em outro provedor de hospedagem, implemente uma sessão autenticada equivalente e um adaptador de banco; **não confie em cabeçalhos enviados diretamente pelo navegador**. O projeto não é um deploy Vercel independente.

O código da campanha concede participação na mesa, mas não muda a audiência da hospedagem. A primeira publicação é privada para revisão do proprietário. Antes de convidar o grupo para uso real, compartilhe o Site com a audiência desejada; cada participante deve entrar com sua própria conta.

### Login e salvamento

O acesso usa a **conta do ChatGPT**, gerenciada pela hospedagem. Não há formulário próprio de e-mail/senha, nem senhas guardadas pelo Nexo. No primeiro acesso autenticado à API, um perfil é criado no D1; seu nome na mesa pode ser editado sem alterar a identidade da conta. Trocar de conta exige recarregar a aba: a API rejeita uma operação cujo cabeçalho de conta esperada não corresponda à identidade autenticada. Esse cabeçalho não concede acesso e nunca substitui a autenticação da hospedagem.

Campanhas, participantes, fichas, PV/PE/SAN, técnicas e histórico são gravados no **banco D1 no servidor**. Ajustes de recursos, rolagens e criações são persistidos ao executar a ação. No editor, use **Salvar ficha** para confirmar a edição. A confirmação só aparece após uma resposta válida da API. O Nexo não repete automaticamente uma escrita interrompida: sincronize antes de repetir, porque a ação pode ter sido concluída antes da perda da resposta.

Durante a edição, um rascunho temporário é guardado em `sessionStorage`, separado por conta de quem edita e por ficha. Ele permite recuperar texto após recarregar ou fechar e reabrir o editor na mesma aba. Ao salvar, o rascunho é removido. Rascunhos não substituem o banco nem sincronizam entre dispositivos; fechar a aba pode removê-los. Se o navegador bloquear o armazenamento, a interface avisa. Ao detectar edições simultâneas, o editor preserva alterações independentes e pede uma escolha explícita para os campos em conflito.

Sem conexão, as fichas já carregadas continuam visíveis, e o editor mantém o rascunho quando o armazenamento da aba está disponível. Escritas exigem reconexão. A demonstração continua isolada em `localStorage` e não é importada automaticamente para uma conta real.

Alterações completas de ficha usam versão otimista. Uma edição desatualizada recebe `409`, sem sobrescrever dados mais recentes. Ajustes de recursos são limitados no servidor. Rolagens reais usam aleatoriedade criptográfica do servidor, e rolagens de monstros sempre ficam privadas.

## Validação

`pnpm test` executa testes de domínio, sincronização e integração. A integração chama a API real contra um adaptador D1 em SQLite e verifica autenticação ausente, origem inválida, convites, isolamento entre usuários, permissões de mestre, persistência de recursos, conflitos de versão, custo de habilidade, privacidade de monstros e revogação de acesso. Um teste fecha e reabre um arquivo de banco para confirmar a recuperação do perfil, da ficha, dos recursos e das rolagens. Também são cobertos troca de conta em uma aba antiga, retorno seguro do login, rascunhos com mudanças simultâneas e respostas de rede interrompidas. Os módulos simulados vivem apenas em `tests/`.

O escopo inicial e as decisões para as próximas alterações estão registrados em [docs/PROJECT_SCOPE.md](docs/PROJECT_SCOPE.md).

Os testes não substituem uma sessão de login no Site publicado. A interface de demonstração também é verificada manualmente no navegador, incluindo edição, rolagem, ajuste de recursos e recuperação após recarregar.

## Próximas evoluções

- Incorporar as regras próprias da campanha de Jujutsu: aparar, vestígios, técnicas e progressão.
- Importar fichas JSON, adicionar retratos e duplicar personagens/criaturas.
- Condições, iniciativa e gerenciamento de combate.
- Presença e sincronização em tempo real.
- Automação dedicada para D&D, Call of Cthulhu e Tormenta20.
- Modelos de sistemas registrados pelo mestre dentro da interface.

Ilustrações vetoriais e textos de exemplo são originais. Este é um projeto independente de apoio às mesas, sem vínculo oficial com as editoras dos sistemas citados.
