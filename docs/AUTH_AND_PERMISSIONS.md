# Autenticação e permissões

## Fluxo de identidade

1. O formulário envia cadastro/entrada/recuperação para `/api/auth`, na mesma origem.
2. Supabase Auth valida credenciais, confirma e-mail e emite a sessão. O Nexo não escreve senhas em suas tabelas.
3. `proxy.ts` renova a sessão nos cookies; clientes SSR são criados por requisição. Respostas autenticadas usam `private, no-store`.
4. `/api/game` e `/api/media` encaminham o access token do usuário para `nexo-game`; nenhuma chave administrativa fica na Vercel.
5. A Edge Function valida o bearer em `/auth/v1/user`, exige conta confirmada e não anônima e deriva `supabase:<auth.id>`.
6. A autorização usa `nexo.memberships`, proprietário e tipo da ficha. `user_metadata.full_name` só fornece nome inicial, nunca papel de mestre.
7. Apenas a função confiável usa a credencial administrativa gerenciada no Supabase para executar os RPCs fechados.

`verify_jwt=false` na configuração de `nexo-game` é intencional: a própria função valida cada sessão com Auth, incluindo contas com as chaves atuais. Isso não torna os dados anônimos. Ausência de bearer, token inválido, usuário não confirmado ou aba de outra conta são recusados antes do acesso de jogo.

## Matriz de permissões por campanha

| Operação | Sem sessão | Não participante | Jogador participante | Mestre da campanha |
| --- | --- | --- | --- | --- |
| Ver dados reais | Não | Somente suas outras campanhas | Suas campanhas | Suas campanhas |
| Criar campanha | Não | Sim, com sessão confirmada | Sim; vira mestre da nova campanha | Sim |
| Entrar por convite válido | Não | Sim | Sim | Sim; não perde papel existente |
| Ver código/renovar convite/editar campanha/remover jogador | Não | Não | Não | Sim |
| Ver/editar/excluir ficha de personagem | Não | Não | Somente própria | Todas da campanha |
| Criar personagem para outro jogador | Não | Não | Não | Sim, para participante existente |
| Criar/ver/editar/rolar monstros | Não | Não | Não | Sim |
| Ajustar PV/PE/SAN e rolar ficha | Não | Não | Própria ficha | Qualquer ficha da campanha |
| Rolagem compartilhada | Não | Não | Sim | Sim |
| Criar rolagem privada | Não | Não | Não | Sim; obrigatório para monstros |
| Ler histórico compartilhado | Não | Não | Sim | Sim |
| Ler histórico privado | Não | Não | Não | Sim |
| Enviar retrato/token | Não | Não | Próprio personagem | Qualquer ficha da campanha |
| Enviar mapa | Não | Não | Não | Sim |
| Ver imagem `owner` / `gm` / `table` | Não | Não | Própria `owner`; qualquer `table` | Todas |
| Gerenciar imagem compartilhada de outra pessoa | Não | Não | Não | Sim |
| Assinar canal Realtime privado | Não | Não | Sua campanha | Sua campanha |
| Enviar Broadcast como cliente | Não | Não | Não | Não; envio somente por trigger |
| Consultar tabelas ou RPCs de jogo diretamente pelo SDK | Não | Não | Não | Não |

O mestre não tem acesso global a campanhas alheias. Ser dono do projeto no painel Supabase/GitHub é uma permissão operacional externa, separada dos papéis do aplicativo. A demonstração usa dados fictícios locais e não concede privilégios no banco real.

## Controles aplicados

- Toda ação de jogo consulta participação/dono/mestre no servidor. A UI esconder botões não é a proteção.
- Browser roles `anon`/`authenticated` não recebem privilégios de tabela nem de RPC de jogo. Todas as tabelas `nexo` têm RLS e política de negação explícita para ambos.
- A API de mídia revalida as permissões também em SQL. `p_actor` só vem do usuário validado pela Edge Function; o navegador não pode executar esse RPC.
- Cabeçalhos `oai-authenticated-user-*` são ignorados na Vercel. Só o runtime legado do Sites confia em seu proxy ChatGPT.
- `X-Nexo-Account` é uma trava contra escrita por uma aba com conta antiga, não uma identidade aceita do cliente.
- Escritas no Next.js verificam `Origin`, tipo e tamanho do corpo. Redirecionamentos de Auth ficam em caminhos permitidos da aplicação.
- Fichas usam versão otimista; `409` exige sincronização, sem sobrescrever silenciosamente outra edição.
- Não há repetição automática de escrita após falha de rede. A resposta pode ter se perdido depois do commit.

## Imagens privadas

O bucket `nexo-assets` não é público. PNG/JPEG/WebP são permitidos até 10 MiB por objeto; SVG/HTML não são aceitos. O original enviado é preservado. MIME e tamanho declarados são conferidos com os metadados do Storage ao confirmar; não há inspeção antivírus ou reconhecimento de conteúdo.

O fluxo é reserva autorizada → upload assinado para um caminho aleatório sem sobrescrita → confirmação dos metadados → estado `ready`. Um token de upload assinado concede acesso temporário somente àquele caminho; não deve aparecer em logs, URLs compartilhadas ou commits.

`/api/media/image?assetId=...` revalida a sessão e o acesso e redireciona para URL assinada de leitura com validade de 60 segundos. Quem receber essa URL poderá usá-la até expirar; revogar participação impede novas URLs, mas não invalida uma assinatura já emitida antes de seu vencimento. Pessoas autorizadas também podem salvar uma imagem que visualizaram.

Jogadores têm visibilidade forçada a `owner`; somente mestre pode criar imagens `table`. Retratos/tokens ligados a criaturas permanecem privados mesmo se alguém tentar enviar `visibility=table`. A seleção de retrato passa pelo RPC dedicado; `update_sheet` não aceita um ID arbitrário do cliente.

## Realtime

Tópico: `nexo:campaign:<campaign_id>`, sempre privado. Uma política em `realtime.messages` consulta `nexo.can_join_campaign(realtime.topic())` e confere o próprio tópico. Não há política INSERT para usuários; triggers publicam o evento `invalidate` com apenas `campaignId`. O serviço pode acrescentar seu identificador de mensagem.

O cliente busca novamente o estado na API, que reaplica as permissões. Nenhum segredo de mestre, imagem assinada, valor de dado ou conteúdo de ficha vai no Broadcast. Canais são removidos ao trocar de conta/campanhas. Uma assinatura já aberta pode persistir por algum tempo após remoção de participante; os avisos não contêm dados de jogo e as novas leituras da API são negadas. O polling autenticado a cada 20 segundos continua como recuperação se Realtime cair.

## Credenciais e configuração operacional

Valores públicos: URL do projeto, publishable key e URL da função. Eles identificam o serviço, mas não concedem privilégios administrativos. Nunca versionar `service_role`, `sb_secret_*`, senha do banco, access/refresh tokens, token do gateway legado ou credenciais SMTP/OAuth.

Login e senha, cadastro, confirmação e recuperação estão implementados. Entrega de e-mail depende da configuração do Supabase Auth/SMTP e das URLs autorizadas. OAuth Google/Discord, MFA, transferência de mestre, exclusão de conta e vínculo ChatGPT ↔ Supabase não fazem parte desta implementação. Não habilitar provedores sem configurar e testar seus callbacks.

O advisor do projeto indicou **Leaked Password Protection desativado** na auditoria inicial. Verificar a disponibilidade no plano e ativar no painel Auth quando disponível; não há configuração de billing no código. Consulte a [documentação de segurança de senhas](https://supabase.com/docs/guides/auth/password-security). O mínimo de senha na UI/API é 10 caracteres, mas o Auth possui sua própria política para acesso direto ao serviço: alinhar a configuração do provedor no painel.

## Como verificar uma mudança

Execute `pnpm test`, `pnpm typecheck` e as compilações descritas em [OPERATIONS.md](OPERATIONS.md). Os testes PostgreSQL aplicam as migrações reais em PGlite, alternam os papéis e verificam concessões/RLS, mídia, concorrência e Broadcast. Eles modelam os serviços gerenciados, por isso não comprovam entrega de e-mail nem transferência de bytes pelo Storage.

Na integração hospedada, use contas descartáveis de mestre/jogador/terceiro; crie uma campanha de teste, entre por convite, confira ficha própria/alheia, monstros, rolagens, upload, retrato e revogação. Não altere credenciais nem registros de jogadores reais para testar. Use a API administrativa oficial para criar/remover contas de teste; não edite `auth.users` manualmente.
