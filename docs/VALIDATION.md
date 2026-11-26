# T01 — Estado da entrega e validação — 27/10/2026

Base: `main` em `40264f25b7fd873c7d60a8850bc13700d556e995`. Mudanças propostas na branch `feat/supabase-consolidation`.

## Já existente no ambiente hospedado

- Projeto Supabase `nexo-rpg`, PostgreSQL e tabelas principais privadas com RLS.
- Edge Function `nexo-game` e frontend Next.js/Vercel com login e persistência Supabase.
- Consulta pública de configuração do Auth confirmou e-mail habilitado, cadastro permitido, confirmação de e-mail obrigatória e contas anônimas desabilitadas.
- Nenhum registro de jogador foi alterado durante esta implementação.

## Implementado neste PR

- Migração aditiva `consolidate_platform`: metadados de imagens, bucket privado, RPC de mídia, readiness independente da importação antiga e autorização/Broadcast por campanha.
- API e interface para retratos, tokens, mapas e seleção de retrato da ficha.
- Assinatura de canais privados e recuperação pelo polling existente.
- Configuração local reproduzível e documentação do schema, permissões e operação.
- Testes PostgreSQL reais em PGlite e testes adicionais de Auth e mídia no Next.js.

## Verificações locais

- 33 testes de domínio, persistência, PostgreSQL/RLS, sessão, rotas e mídia, incluindo o smoke administrativo com rollback completo.
- TypeScript e geração dos tipos das rotas.
- Build Next.js/Vercel.
- Build Vinext/Sites.
- Bundle da Edge Function `nexo-game`.

Os testes de Auth usam respostas controladas do provedor; os testes PostgreSQL modelam os schemas gerenciados de Auth/Storage/Realtime. Isso permite testar permissões e migrações sem credenciais ou dados reais. Não substitui login e upload no serviço hospedado.

## Backend publicado e verificado

O bloqueio anterior do conector foi resolvido. A migração `20261027182618_consolidate_platform.sql` foi aplicada e confirmada no histórico remoto. O nome local corresponde à versão efetivamente atribuída pelo Supabase.

- `nexo_schema_status()` retornou `ready: true`, `schemaVersion: 2`.
- Bucket `nexo-assets` privado, com limite de 10 MiB e PNG/JPEG/WebP.
- `nexo-game` publicada como versão 2, estado `ACTIVE`. A validação do JWT continua dentro da função; nenhuma chave administrativa foi enviada à Vercel.
- `supabase/tests/consolidation-smoke.sql` passou no PostgreSQL hospedado, exercitando o papel `service_role`, restrições de mídia para jogadores, isolamento por campanha, confirmação sem bytes rejeitada, autorização do Realtime, gravação dos Broadcasts pelos gatilhos e revogação após remover a participação.
- Todos os fixtures desse smoke foram desfeitos, inclusive mensagens, pelo rollback de uma subtransação. Não foram criadas contas em Supabase Auth nem arquivos no Storage. Os dados existentes permaneceram com 3 perfis, 3 campanhas, 4 participações, 3 fichas e 10 rolagens na conferência antes/depois.
- Uma conexão WebSocket de saúde em um canal público aleatório e sem dados de campanha inicializou o serviço Realtime. O serviço gerenciado criou suas cinco partições; nenhuma tabela gerenciada foi alterada manualmente. As campanhas continuam usando exclusivamente canais privados.
- O advisor de segurança não encontrou problemas novos de schema/RLS. Permanece o aviso anterior de Leaked Password Protection desativado. Este PR não altera plano, SMTP ou credenciais.

O teste de revogação verifica as regras do banco e novas autorizações. Não comprova o encerramento imediato de um WebSocket já autorizado; nenhum conteúdo de ficha ou imagem é enviado por Broadcast.

## Aceite e frontend pendentes

Antes de integrar o PR e publicar o frontend de produção, validar com duas contas confirmadas no serviço hospedado:

1. Entrar como mestre e jogador; criar/entrar na campanha e confirmar persistência após recarregar.
2. Enviar os bytes de uma imagem, confirmar, abrir com as permissões corretas e selecionar o retrato; editar a ficha sem perder o retrato.
3. Alterar ficha/recursos em uma sessão e observar a atualização na outra, incluindo a proteção dos arquivos de criaturas.
4. Excluir o arquivo e conferir a remoção física pelo serviço Storage; remover o jogador e testar novas requisições/assinaturas.

Os testes de Auth locais usam respostas controladas. O smoke hospedado testa PostgreSQL/RLS e gatilhos; não substitui login real, transporte WebSocket com JWT de jogador, envio/leitura/exclusão de bytes ou entrega de e-mail. A produção continua na `main` anterior enquanto este aceite estiver pendente. Os procedimentos estão em [OPERATIONS.md](OPERATIONS.md).

# T03 — Leitura da ficha — 28/10/2026

Base: `main` em `9329083a9a5384b3f6fbe1c9ef05e7466456cc6c`, após a integração da T01. A T03 ajusta a ficha e seu editor, com textos de conteúdo e campos em 16 px, rótulos em 14 px e informações auxiliares em pelo menos 12 px, usando unidades relativas. Controles têm área mínima de 44 × 44 px. Os recursos e atributos se reorganizam em telas estreitas; os campos de perícia passam a duas linhas. As cores secundárias, bordas dos controles e indicação de foco foram reforçadas. As abas aceitam setas, Home, End e Tab, com associação ao painel ativo.

## Verificação da T03

- 33 testes existentes passaram; geração dos tipos, TypeScript, builds Next.js/Vercel e Vinext/Sites e bundle de `nexo-game` passaram.
- Navegador com os componentes reais e o CSS compilado, em demonstração isolada: computador com viewport de 1363 px e janelas de conteúdo de 768, 375 e 320 px. Sem transbordamento horizontal do conteúdo da ficha nessas medidas; as abas têm rolagem própria.
- Medições dos botões visíveis da ficha no computador, em 375 e em 768 px: nenhum controle abaixo de 44 × 44 px. Em 320 px, as 28 perícias usaram texto de 16 px e linhas de pelo menos 52 px, sem transbordar.
- Redução e recuperação de vida, mudança de aba por setas, End no editor, filtro de perícias treinadas e edição/salvamento das notas confirmados na interface. Notas do exemplo restauradas ao final. Campos de perícia no editor em 375 px mediram 16 px de fonte e 45–46 px de altura.
- A prévia completa do servidor retornou erro neste ambiente. A conferência visual usou uma página temporária que importa `NexoApp` diretamente, com o CSS do build e os dados de demonstração existentes. Isso valida os componentes e as interações locais; não é um teste de login, Supabase ou deploy hospedado.

Para repetir o aceite na aplicação, abra a demonstração, entre na ficha de Kaori Sato e confira recursos, atributos, combate, perícias, história e rolagens. Abra o editor, percorra as abas com setas/Home/End e salve uma alteração de notas. Repita em 320, 375, 768 px e no computador, conferindo foco visível, alcance dos botões e campos sem corte. A impressão continua usando as regras anteriores, pois os novos estilos se aplicam somente à tela.

# T04 — Retomar a última mesa — 29/10/2026

Base: `main` em `ba5b6fc70ee107e7a7eca76a2a20375c236e0d2f`. Branch `feat/t04-dashboard-resume`, responsável Lucas.

A visão geral destaca a última campanha e a última ficha abertas, com atalhos para dados, criação de personagem, histórico da campanha e criação de criatura para o mestre. Abrir uma ficha também registra sua campanha. Dados e criação já abrem com a campanha do destaque selecionada; o histórico aplica seu filtro. Sem acessos anteriores, a tela sugere uma campanha ativa e prioriza personagens do próprio usuário; sem campanhas, mantém a orientação inicial existente.

O histórico contém somente até 12 identificadores de campanhas e fichas por contexto em `localStorage`, com chave versionada e separação por conta, demonstração de mestre e demonstração de jogador. Os nomes e valores vêm do workspace autorizado atual. Fichas excluídas, campanhas removidas e mudanças de permissão invalidam os atalhos. Armazenamento ausente, corrompido ou bloqueado não impede a navegação; nesse último caso, o histórico pode continuar somente na sessão. Alterações em outra aba são recebidas pelo evento `storage`. O histórico é deste navegador e não é sincronizado entre dispositivos.

## Verificação da T04

- 37 testes passaram, incluindo quatro novos cenários de histórico, serialização, isolamento de conta/modo, permissões e opções para primeiro acesso.
- Geração de rotas e TypeScript, build Next.js/Vercel, build Vinext/Sites e bundle de `nexo-game` aprovados. Os builds dos dois frameworks precisam rodar em sequência porque ambos geram arquivos em `.next`.
- Navegador, com os componentes reais e o CSS compilado em demonstração isolada: abertura de Kaori e Dante, atualização da campanha correspondente, retorno à visão geral e preservação de Dante/Santa Aurora após recarregar.
- Atalho de dados selecionou Santa Aurora; histórico abriu com seu filtro ativo; criação de personagem abriu com essa campanha preenchida. Mudança para visão de jogador usou outro histórico e removeu o atalho de criação de criatura.
- Conferência visual e medições em 320, 375 e 768 px de viewport de conteúdo, além do computador: nenhuma rolagem horizontal; cartões empilhados no celular e lado a lado no tablet; controles com altura mínima de 44 px. A ficha foi aberta por Enter no cartão.
- A prévia Vinext completa retornou erro neste ambiente. Uma execução local Next.js sem dados reais renderizou a página, mas não ativou seus controles; por isso a validação de interação usou uma página temporária que importa `NexoApp` diretamente. O harness usa somente demonstração e não integra o PR. Login, Supabase e persistência hospedada não foram revalidados nesta tarefa.

## Aceite após integração

Com uma conta real, abrir uma campanha e uma ficha, voltar à visão geral e recarregar. Confirmar os destaques e testar os atalhos. Trocar de conta no mesmo navegador e confirmar que somente conteúdo da conta atual aparece. Excluir a ficha ou remover a participação em uma campanha e verificar que o destaque escolhe outro item acessível.

# T05 — Duplicação de fichas — 29/10/2026

Base: `main` em `dc7e00bbd967ba8814f157883799a4b038e96478`, após a integração da T04. Branch `feat/t05-duplicate-sheets`, responsável Lucas.

O botão **Duplicar ficha** abre uma confirmação com o nome sugerido, campanha e dono. Nomes como “Abissal (cópia)” e “Abissal (cópia 2)” permitem criar inimigos semelhantes sem preencher a ficha novamente. O nome pode ser editado, respeitando o limite de 100 caracteres e preservando Unicode válido. Após confirmar, a interface abre a nova ficha.

A cópia preserva sistema, tipo, campanha, dono, atributos, recursos atuais, defesa, ataques, técnicas, rituais, inventário, anotações e retrato. Ela recebe novo UUID, versão 1 e nova data. Não altera a original e começa sem as rolagens e os rascunhos da outra ficha. O retrato compartilha o arquivo existente: a janela informa que excluir essa imagem remove o retrato de ambas. Não há cópia entre campanhas nem alteração de dono nesse fluxo.

## Verificação da T05

- 41 testes aprovados. Os novos cenários cobrem os seis sistemas, cópia profunda dos campos e detalhes de rituais, sugestões de nome, limites e Unicode, identidade independente, versão inicial, preservação da original e alterações separadas dos recursos/anotações.
- A API real com SQLite confirmou a cópia persistida entre requisições, bloqueio de sessão ausente/terceiros/jogadores tentando copiar criaturas, validação de nomes e versões, `409` para origem desatualizada, dono/campanha/tipo forjados ignorados e revogação após remoção da campanha.
- PostgreSQL/PGlite confirmou o uso do INSERT já autorizado, manutenção das permissões do retrato, leitura da imagem após excluir a ficha original e remoção das referências das cópias após excluir a imagem.
- TypeScript, build Vinext/Sites, build Next.js/Vercel e bundle da Edge Function aprovados. As 23 consultas literais do servidor permaneceram iguais; não foi necessária migração, alteração de RLS ou novas credenciais.
- Validação visual pendente: a revisão automática do navegador bloqueou o acesso à prévia por limite de uso. Nenhuma conferência de layout ou interação visual da T05 foi concluída. Os arquivos temporários de prévia não fazem parte do PR.

## Backend publicado

A função `nexo-game` do projeto `nexo-rpg` foi atualizada da versão 2 para a versão 3, estado `ACTIVE`. O código publicado foi lido novamente e corresponde ao bundle validado. A autenticação própria e a configuração anterior `verify_jwt=false` foram preservadas. Nenhum registro de jogador foi alterado para teste.

Chamadas hospedadas sem sessão e com JWT inválido retornaram `401`, antes de qualquer gravação.

## Aceite visual e com conta real

Na prévia do PR, abrir um personagem e selecionar **Duplicar ficha**. Conferir o nome sugerido, cancelar e repetir confirmando. Verificar a abertura da cópia, recarregar, mudar PV/anotações nela e conferir a original. Repetir com uma criatura como mestre e confirmar que jogadores não a enxergam. Testar o formulário em 320 e 375 px, foco pelo teclado, nome vazio e nomes longos. Se houver retrato, conferir o aviso e a imagem compartilhada.
