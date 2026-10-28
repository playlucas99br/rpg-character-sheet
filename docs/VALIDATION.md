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
