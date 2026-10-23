# Nexo — escopo do projeto

## Objetivo original

Um site para montar e usar fichas de RPG interativas. A primeira etapa atende duas mesas: **Ordem Paranormal** e **Jujutsu adaptado ao sistema de Ordem**. Cada pessoa entra com sua própria conta e acompanha seus personagens. O mestre da campanha acessa todas as fichas daquela mesa e pode criar fichas de monstros.

As fichas permitem editar atributos, perícias, ataques, habilidades/técnicas, equipamento e notas; rolar dados onde houver testes; e ajustar vida, PE/energia amaldiçoada e sanidade durante a sessão. Os dados devem permanecer salvos entre acessos.

O registro de sistemas deve permitir novas campanhas no futuro, incluindo D&D, Call of Cthulhu, Tormenta20 e sistemas personalizados. Os modelos adicionais não devem ser apresentados como implementação completa dos livros.

## Continuidade e Git

- Repositório: `playlucas99br/rpg-character-sheet`.
- O usuário pediu trabalho por branches e PRs.
- Esta etapa de login e persistência parte de `feat/ordem-paranormal-library`, preservando sua biblioteca, rituais e armas.
- Mudanças futuras devem consultar a branch e a versão atuais antes de usar decisões antigas.

## Identidade, dados e privacidade

- A implementação hospedada atual mantém o login com ChatGPT pelo Sites e usa Supabase/PostgreSQL para gravação. O usuário pediu explicitamente a criação do projeto Supabase após a etapa inicial de login.
- Projeto Supabase: `nexo-rpg`, São Paulo, na organização `playlucas99br's Org`. O projeto antigo inativo dessa organização foi preservado.
- O D1 é a origem da transferência inicial e continua disponível no desenvolvimento. A importação não apaga a origem e deve preservar IDs, proprietários, permissões e versões das fichas.
- Perfis são criados a partir da identidade autenticada; não há senhas próprias armazenadas pelo aplicativo.
- O nome de exibição é editável. Ele não determina permissões.
- Os papéis de mestre e jogador pertencem a cada campanha. Ser mestre em uma não permite acessar outras.
- O jogador acessa suas próprias fichas de personagem. O mestre acessa as fichas e os monstros da sua campanha.
- Fichas de monstros e suas rolagens permanecem privadas para o mestre.
- Convites da campanha não alteram as permissões da hospedagem.
- O repositório é público; dados reais, arquivos de banco, credenciais, chaves e livros locais ficam fora do Git.
- A demonstração usa apenas exemplos no navegador; fichas reais ficam no banco do servidor.
- Rascunhos temporários nesta aba protegem edições interrompidas, sem substituir o salvamento da ficha na conta.
- A Vercel usa Supabase Auth com e-mail/senha. O Sites preserva ChatGPT e os vínculos anteriores. Não unir contas automaticamente por e-mail ou nome: uma vinculação futura deve exigir controle das duas identidades.
- A Vercel encaminha apenas a sessão do jogador. A função `nexo-game` valida a sessão e aplica a autorização compartilhada; o segredo administrativo permanece no Supabase.
- A main de Deucher foi integrada com a biblioteca e o stylesheet restaurado. A etapa Vercel parte dessa versão e inclui a persistência que ainda estava no PR anterior.

## Validação necessária

Verificar login ausente e troca de conta, persistência após reabrir o banco, edição e recursos, acesso cruzado entre jogadores, permissões do mestre, privacidade de monstros, convites, conflitos entre janelas e falhas na confirmação de salvamento. A publicação deve manter a audiência do Site.
