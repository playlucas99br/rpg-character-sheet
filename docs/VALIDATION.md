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

# T06 — Importar fichas JSON — 26/11/2026

Base: `main` em `a00775d0036cf16a53654cb50d974930ebe0f880`, após a integração da T05. Branch `feat/t06-import-json`, responsável Lucas.

**Importar JSON** está disponível em Minhas fichas, Bestiário para mestres e na campanha. O formulário lê a exportação `nexo-sheet` versão 1, limita o arquivo a 128 KiB, mostra personagem/criatura e sistema e pede nome e campanha compatível. O mestre pode escolher o dono de um personagem entre os participantes. Sem campanha elegível, há um atalho para criar uma do sistema do arquivo. A importação sempre cria outra ficha, abre seu detalhe e preserva os recursos atuais, atributos, ataques, habilidades, rituais, inventário e anotações.

IDs, conta, campanha, retrato, versão e data da exportação não são reutilizados como identidade. A nova ficha recebe UUID, versão 1 e nova data, sem histórico de rolagens nem rascunhos antigos. A interface informa que o retrato precisa ser enviado novamente. Não há sobrescrita nem repetição automática de gravações.

## Verificação da T06

- 47 testes passaram. Os novos cenários cobrem exportações dos seis sistemas como personagens e criaturas, cópia profunda, detalhes de rituais, BOM, exportações antigas sem rituais, formato/versão inválidos, limite em bytes UTF-8, atributos, referências de ataques, fórmulas e campos inválidos.
- A API real com SQLite confirmou o INSERT independente, repetição do mesmo arquivo gerando outro ID, recursos/anotações preservados, ausência de rolagens herdadas e original intacta. Foram verificados sessão ausente, conta antiga, terceiros, sistema diferente, dono forjado, atribuição pelo mestre, criaturas privadas e remoção da campanha.
- TypeScript, build Vinext/Sites, build Next.js/Vercel e bundle da Edge Function aprovados. As 23 consultas literais do servidor permaneceram iguais; nenhuma migração, política RLS, dependência ou credencial foi adicionada.
- Navegador com `NexoApp` e CSS compilado em demonstração isolada: arquivo válido, prévia, nome obrigatório, destino do mesmo sistema, abertura da ficha, equipamentos/anotações, histórico vazio, recarga e alteração independente de PV. Arquivo de versão 99 recusado; visão de jogador não ofereceu destino para criatura.
- Computador de 1363 px e janelas de conteúdo de 320, 375 e 768 px: sem rolagem horizontal do formulário. A conferência encontrou uma regra antiga que escondia botões secundários no celular; o atalho de importação recebeu regra própria e passou na nova conferência. Importação concluída em 320 px, com botões de pelo menos 44 px e campo de nome com fonte de 16 px. Nenhum erro do aplicativo foi capturado no console da demonstração.
- A página temporária de QA importa os componentes reais e usa somente dados fictícios; não integra o PR. Essa conferência não comprova login ou persistência no Supabase hospedado.

## Backend publicado

A função `nexo-game` do projeto `nexo-rpg` foi atualizada para a versão 5, estado `ACTIVE`. A versão 4 anterior continha o mesmo código da versão 3 da T05. O código publicado foi lido novamente e corresponde ao bundle validado. A autenticação própria e `verify_jwt=false` foram preservados. Nenhum registro de jogador foi alterado para teste.

Chamadas hospedadas sem sessão e com JWT inválido, incluindo o comando `import_sheet`, retornaram `401` antes de qualquer gravação.

## Aceite com conta real

Na prévia do PR, exportar um personagem, importar para uma campanha do mesmo sistema e recarregar. Conferir recursos/anotações e editar a nova ficha sem alterar a original. Como mestre, importar para outro participante e importar uma criatura; como jogador, confirmar que a criatura não aparece. Enviar o retrato novamente quando necessário. O fluxo positivo hospedado com contas reais ainda precisa desse aceite.

# T08 — Ações rápidas no painel — 27/11/2026

Base: `main` em `4c94d0f`, após a integração da T07. Branch `feat/t08-quick-actions`, responsável Lucas (Agente T08, com integração e revisão do coordenador).

O painel do mestre permite informar uma quantidade inteira de 1 a 9999 e aplicar dano, cura ou gasto de energia e sanidade em personagens, criaturas e NPCs. O rótulo de energia acompanha o sistema. Gastos acima do saldo são rejeitados no cliente e no servidor, sem alterar valor ou versão; um toast informa o recurso disponível e a quantidade solicitada. Dano continua limitado a zero e cura ao máximo. Os controles ficam bloqueados durante a gravação. O resultado só é apresentado como salvo quando a operação é confirmada. Uma resposta incerta orienta sincronizar antes de repetir.

## Verificação da T08

- 55 testes aprovados, incluindo seis da T08. O teste de regressão primeiro reproduziu a aceitação indevida de gasto excessivo (HTTP 200); a correção passou a retornar 400, preservando saldo e versão. Cobertos gasto exato e saldo zero de energia e sanidade. A API real com SQLite confirmou o ajuste do mestre em personagem de jogador e criatura, a leitura atualizada pelo jogador, a versão incrementada e o conflito `409` ao tentar salvar um editor anterior ao ajuste. Também foram verificados limites dos recursos, sanidade preservada, sessão ausente, terceiros, isolamento de campanha, criatura privada e revogação de participação.
- TypeScript, builds Next.js/Vercel e Vinext/Sites e bundle da Edge Function aprovados. O lint dos arquivos novos e do painel passou. O lint completo foi medido antes das alterações e já apresentava oito erros e sete avisos em módulos existentes; essas pendências não foram alteradas nesta tarefa.
- Navegador Chromium com os componentes reais do `NexoApp` e seus estilos em demonstração isolada: dano, cura e gasto de energia concluídos, valores preservados após recarregar. Larguras de 320, 375, 768 e 1440 px sem rolagem horizontal; campos e botões de ações rápidas com altura mínima de 44 px. O harness e suas dependências temporárias não integram o PR.
- Nenhuma mudança em consultas SQL, esquema, políticas, autenticação ou dependências do projeto. A validação de saldo usa a mesma lógica pura no painel, na demonstração e na API. O backend precisa do bundle atualizado para rejeitar chamadas diretas com gasto excessivo. NPCs usam a ficha privada existente de criaturas; não há reclassificação automática de personagens do mestre.

## Aceite com contas reais

Na prévia do PR, abrir o painel como mestre, aplicar dano a um personagem e conferir a ficha na sessão do jogador. Repetir com cura e gasto de energia, recarregar as duas sessões e verificar os limites. Como jogador, confirmar que o painel permanece reservado ao mestre. A validação local cobre a rota real e os componentes da demonstração; o fluxo positivo com contas reais e a entrega de eventos no serviço hospedado continuam pendentes.

# T09 — Iniciativa e turnos — 27/11/2026

Branch `feat/t09-encounters`, sobre a T08. O painel do mestre permite salvar encontros com participantes da campanha, informar iniciativa, desempatar pela ordem manual da preparação e iniciar, avançar e encerrar o combate. A primeira rodada é 1; voltar do último participante ao primeiro incrementa a rodada. Encontros encerrados ficam disponíveis para consulta. Cada encontro guarda o nome do participante para preservar o registro quando a ficha é excluída.

A persistência usa a nova tabela privada `encounters`, com JSON e versão, nas migrações SQLite e Supabase. O mestre autoriza pela campanha armazenada no encontro; o servidor resolve os nomes das fichas, verifica a campanha de cada participante e recusa versões antigas com `409`. Jogadores recebem lista vazia. A migração Supabase eleva o schema para 3, registra cinco consultas literais novas, mantém RLS e bloqueio de acesso direto do navegador e envia apenas a invalidação de campanha pelo Realtime. Importações de origens D1 novas preservam também encontros; origens antigas sem a tabela continuam compatíveis.

Verificações específicas: seis testes de lógica/API SQLite aprovados, cobrindo iniciativa, desempate, estados, rodadas, isolamento, campos forjados, nomes canônicos, retomada após reabrir o banco e concorrência. Dois testes PostgreSQL adicionais confirmaram o registro SQL, privacidade, gravação por versão, payload mínimo de Broadcast e importações D1 com e sem encontros. A API existente e o smoke de consolidação permaneceram aprovados.

O modelo local da demonstração usa as mesmas regras de iniciativa e estado, separado das contas reais. O rollout exige aplicar a migração e atualizar a Edge Function antes de usar os novos comandos. O aceite com duas sessões reais no serviço hospedado permanece pendente.

# T10 — Condições e duração — 27/11/2026

Branch `feat/t10-conditions`, sobre a T09. Cada participante do encontro pode receber até 30 condições com nome e duração de 1 a 999 rodadas ou até remoção manual. A contagem diminui quando o último participante termina o turno e a rodada seguinte começa; a condição expira ao chegar a zero. Adicionar uma condição durante a rodada inclui a próxima virada nessa contagem. Condições podem ser preparadas antes do início e são preservadas ao editar nome, iniciativa ou ordem dos participantes mantidos. Encontros encerrados permitem consulta, sem novas alterações.

Condições ficam no JSON privado do encontro, com o mesmo controle de versão e permissões da T09. Avançar rodada e reduzir/expirar condições é uma única gravação; a API não aplica efeitos sobre atributos, defesa ou recursos. Não há nova consulta SQL nem migração na T10.

A suíte completa local passou em 68 testes, além de TypeScript. Quatro testes de condições cobrem validação, limites, identificadores, duração finita/indefinida e imutabilidade. A API real confirmou preservação na edição do rascunho, decremento somente na virada, expiração em duas rodadas, remoção manual, limite de 30, rejeição após encerramento, privacidade do mestre e concorrência entre adicionar condição e avançar turno (uma gravação e um conflito `409`). Recursos das fichas permaneceram iguais.

O fluxo positivo com contas reais no serviço hospedado continua como aceite: abrir o mesmo encontro em duas sessões do mestre, aplicar condição e avançar rodada, conferindo a versão atualizada e a recusa de uma ação antiga.

# Ajuste compartilhado — Modais e barras de rolagem — 27/11/2026

Branch `fix/modal-layout-and-scroll`, sobre a T10. As modais mantêm o cabeçalho com X e o rodapé de ações visíveis; apenas o conteúdo rola. No editor, o campo desabilitado fica dentro da área de conteúdo e as ações de salvar, guardar ou descartar rascunho permanecem no mesmo formulário. Cliques e toques no fundo são ignorados para evitar saídas acidentais. Fechar pelo X ou Escape grava o rascunho local antes de sair; se o navegador negar armazenamento, a edição permanece aberta com aviso. Um arrasto iniciado dentro e solto fora não fecha a janela. Barras de rolagem acompanham o tema, com tratamento para alto contraste e impressão preservada.

QA Chromium com os componentes reais da demonstração: editor em 320×568, 375×667, 768×360 e 1440×900; cabeçalho/X e todas as ações do rodapé visíveis antes e depois de rolar, sem rolagem horizontal. Também verificados os formulários de campanha e encontro. Confirmados cliques e toques fora sem fechamento, recuperação do rascunho ao sair por X/Escape, descarte, salvamento por botão e Enter, arrasto e armazenamento negado. Nenhum erro do aplicativo no navegador. Firefox, teclado virtual e contas hospedadas não foram revalidados.

Verificação final do conjunto: 68 testes, TypeScript, builds Next.js/Vercel e Vinext/Sites e bundle Supabase aprovados. A conferência visual do combate cobriu 16 combinações de estado/largura (320, 375, 768 e 1440 px), iniciativa, desempate, duração/expiração, remoção manual, recarga, seleção de encontros, encerramento e acesso de jogador. O lint dos módulos novos passou; o lint completo permanece com sete erros e sete avisos anteriores. O ajuste da modal removeu o erro antigo de atualização de ref durante render.

## Situação do backend em produção

O backend foi atualizado para `nexo-game` versão 7, `ACTIVE`, após a autorização do proprietário. A migração de encontros foi aplicada e o schema 3 está pronto. O bloqueio anterior de autorização foi resolvido; a verificação da publicação está registrada na seção seguinte. A interface completa depende dos PRs #12 e #13 em `main`.

# Ativação de T09/T10 em produção — 27/11/2026

Após autorização do proprietário, a migração `campaign_encounters` foi aplicada em `20261127225523`. O arquivo local foi alinhado à versão registrada pelo serviço. Conferidos schema 3, tabela `nexo.encounters`, RLS e as cinco consultas do registro fechado.

A função `nexo-game` foi publicada na versão 7, `ACTIVE`, com encontros e condições. O código lido novamente do serviço é idêntico ao bundle validado; a autenticação própria anterior foi preservada. O smoke administrativo de encontros passou no PostgreSQL hospedado, cobrindo criação com iniciativa zero, leitura exclusiva do mestre, JSON de condições, atualização por versão, rejeição de versão antiga, restrição do navegador e Broadcast sem dados privados. Registros e mensagens temporários foram integralmente desfeitos.

Perfis/campanhas/participações/fichas/rolagens/assets permaneceram em 4/6/9/9/18/2 antes e depois; encontros reais permaneceram em zero. Nenhum registro existente foi alterado. O advisor manteve somente o aviso de proteção contra senhas vazadas já documentado.

A suíte local passou em 69 testes, incluindo o novo smoke reproduzido em PGlite. O teste HTTP direto desta execução encontrou timeout de rede; a verificação de API com JWT de conta real continua como aceite do proprietário. O código publicado e a persistência do serviço foram conferidos independentemente.

No GitHub, os PRs #10 e #11 estavam mesclados, enquanto #12 e #13 ainda estavam abertos. Os PRs restantes foram redirecionados para `main`, porque #11 havia sido mesclado na antiga branch da T08 e seus encontros ainda não estavam na principal. Para o frontend completo em produção, integrar #12 e depois #13. A prévia que já contém a tela de encontros pode usar o backend atualizado.

# Proteção contra fechamento acidental das modais — 27/11/2026

O componente compartilhado deixa de fechar ao clicar ou tocar no fundo. X, Escape e ações explícitas do rodapé continuam disponíveis. A mudança protege também formulários de campanha, encontros, importação e demais telas que reutilizam a modal; não exige alteração de contrato ou persistência.

O teste de navegador primeiro reproduziu a falha: o diálogo desaparecia após clicar no fundo, quando deveria permanecer aberto com o texto não salvo. Após remover os handlers de fechamento por backdrop, a mesma verificação passou. QA Chromium em 320×568, 375×667, 768×360 e 1440×900 confirmou cliques/toques fora ignorados e texto preservado, X/Escape, recuperação e descarte de rascunho, salvar por botão/Enter, armazenamento negado e header/footer visíveis ao rolar. Campanha e encontro também preservaram seus campos/participantes após clicar fora. Nenhum erro de aplicativo foi capturado.

TypeScript, três testes de sincronização/rascunho e builds Next.js/Vercel e Vinext/Sites aprovados. Lint do componente compartilhado sem erros, com apenas o aviso de imagem já existente.
# T11 — Inventário estruturado — 27/11/2026

Itens opcionais em `sheets.data.inventoryItems` guardam nome, quantidade, peso unitário em kg, equipado e descrição. O texto anterior de equipamento continua em `inventory`, sem conversão ou remoção. O peso total é informativo e considera quantidade × peso unitário. Não há nova tabela nem regra automática de capacidade de carga.

O editor, a ficha e a impressão mostram os itens. Rascunhos incluem o novo campo, aceitam fichas antigas sem ele e detectam conflitos; importação e cópia preservam os valores com estruturas independentes. Atualizações continuam exigindo propriedade da ficha ou papel de mestre e versão atual. Omissão do campo por um cliente antigo preserva os itens já salvos; uma lista vazia remove os itens explicitamente.

Validação: 16 testes focados aprovados (itens, API, importação, cópia e rascunhos), TypeScript e builds Next.js/Vercel e Vinext/Sites aprovados. O lint dos módulos novos passou. O lint global mantém os 7 erros e 7 avisos anteriores, em componentes legados fora do escopo desta tarefa.

# T12 — Munição e cargas — 27/11/2026

Cada item pode ter um contador de munição, cargas ou usos de consumível, com nome opcional, saldo e máximo. Consumo e reposição são manuais, exatos e versionados; saldo insuficiente ou reposição acima do máximo rejeitam a operação inteira. A quantidade física e os ataques permanecem independentes do contador.

Os dados ficam no JSON existente da ficha e usam o salvamento condicional e as permissões já existentes. Edições de clientes antigos preservam contadores omitidos pelo ID estável do item; `counter: null` remove explicitamente a configuração. Importação, cópia, rascunho e impressão preservam os contadores.

Validação: 18 testes focados aprovados, incluindo a API real sobre SQLite, autorização, limites e conflitos; TypeScript, os dois builds e bundle Supabase aprovados. Lint dos módulos novos limpo. A T12 depende do inventário da T11 e seu PR deve ser integrado depois do PR #14.

# T13 — Técnicas personalizadas — 27/11/2026

Técnicas podem configurar usos por combate, recarga em rodadas e até oito contadores nomeados. Usar uma técnica valida e debita energia, uso e recarga em uma operação; quando há fórmula, o histórico de rolagem é salvo na mesma transação condicionada à versão. Técnicas sem controles mantêm o comportamento ilimitado anterior. Campos omitidos por editores antigos são preservados; `tracking: null` remove a configuração.

Conforme decisão do usuário, novo combate e avanço de recarga são manuais pela ficha. Novo combate restaura usos e libera recargas, sem repor energia ou contadores próprios. Contadores próprios são ajustados explicitamente. Os encontros não alteram esses valores.

Validação final: 101 testes aprovados, incluindo 17 testes puros de técnicas e API com técnica sem fórmula, fórmula, limites, permissões, omissão de campos e conflito simulado entre leitura e gravação. A rolagem rejeitada por concorrência não gerou histórico nem débito parcial. TypeScript, builds Next.js/Vercel e Vinext/Sites e bundle Supabase passaram. Lint dos módulos novos limpo; lint global mantém os 7 erros e 7 avisos anteriores.

Navegador local com NexoApp real em demonstração: T11 em 1440 e 375 px; T12 e T13 em 1440, 375 e 320 px. Confirmados configuração, salvar/recarregar, limites e avisos, restauração de rascunhos, clique/toque externo ignorado, cabeçalho/rodapé das modais, foco, impressão e ausência de overflow/erros de execução. O suporte foi publicado como `nexo-game` versão 8 e o código publicado foi lido e comparado integralmente com o bundle local. Não foi efetuado login com contas reais para o aceite final do serviço hospedado.

Todos os PRs deste bloco contêm roteiro manual com pré-requisitos, passos e resultados esperados; a regra foi registrada no `AGENTS.md` para as próximas tarefas.

