# Estado da entrega e validação — 25/10/2026

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

- 32 testes de domínio, persistência, PostgreSQL/RLS, sessão, rotas e mídia.
- TypeScript e geração dos tipos das rotas.
- Build Next.js/Vercel.
- Build Vinext/Sites.
- Bundle da Edge Function `nexo-game`.

Os testes de Auth usam respostas controladas do provedor; os testes PostgreSQL modelam os schemas gerenciados de Auth/Storage/Realtime. Isso permite testar permissões e migrações sem credenciais ou dados reais. Não substitui login e upload no serviço hospedado.

## Publicação pendente

O conector Supabase retornou `McpServerError: Invalid or expired requestState` nas tentativas de `apply_migration`. Uma consulta posterior do histórico confirmou somente as duas migrações anteriores (`nexo_persistence` e `explicit_browser_denial`): **a migração deste PR não foi aplicada**. A função nova não foi publicada, preservando a compatibilidade do site atual.

Antes de integrar/publicar o frontend:

1. Aplicar a migração validada pelo caminho administrativo autorizado e conferir o histórico remoto.
2. Publicar o bundle de `nexo-game` e verificar `nexo_schema_status()` e chamadas autenticadas.
3. Testar login/recuperação com e-mail, upload dos bytes, leitura privada, retrato, exclusão e Realtime com contas descartáveis.
4. Conferir advisors e configurar SMTP/política de senha conforme o projeto. O advisor inicial apontou Leaked Password Protection desativado; este PR não altera plano nem credenciais SMTP.
5. Publicar o frontend após essas verificações.

Os comandos e procedimentos estão em [OPERATIONS.md](OPERATIONS.md). Nenhum check local comprova que essas etapas remotas já ocorreram.
