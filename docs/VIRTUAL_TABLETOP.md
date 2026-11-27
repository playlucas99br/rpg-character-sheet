# Mesa virtual do Nexo

## Escopo implementado

A branch `feat/nexo-virtual-tabletop` introduz um **editor local de mesa 2D**, acessível pelo botão **Abrir mesa virtual** na campanha do mestre. A rota é `/?view=tabletop&id=<campanha>`; a demonstração mantém `demo=1`. O módulo carrega apenas ao entrar nessa rota.

- Cenas independentes, criação, troca, renomeação e remoção com desfazer.
- Mapa SVG de exemplo original, grade e escala métrica com padrões prontos.
- Importação de mapas PNG/JPEG/WebP sem conversão, recompressão ou redução do arquivo original. O navegador renderiza o arquivo por URL de Blob. Limites locais: 80 MiB por imagem, 100 megapixels e 50.000 pixels por lado; mapas acima dos limites são recusados, nunca reduzidos silenciosamente. Zoom não cria detalhes que não existem no original.
- Pan, zoom ancorado no cursor, enquadramento, pinça em telas sensíveis ao toque e tela cheia nativa com HUD flutuante. Se a Fullscreen API não estiver disponível, o modo imersivo ocupa a janela; F11 permite ocultar a interface do navegador.
- Tokens ligados às fichas existentes, importação de imagens, posição, tamanho, rotação, espelhamento horizontal/vertical, cor, condição, bloqueio e ocultação na simulação do jogador. Imagens personalizadas preservam a transparência, sem moldura ou recorte circular. Nomes ficam ocultos por padrão.
- Alças de redimensionamento e rotação, além de campos exatos, para mapas, tokens e itens inseridos. O mapa começa bloqueado para evitar movimentos acidentais.
- Biblioteca com pastas aninhadas, busca, renomeação e movimentação de arquivos. Suporta imagens e documentos PDF, TXT, Markdown, DOCX e XLSX; documentos aparecem como cartões que abrem o original, não como editores incorporados. Limite de 80 MiB por arquivo.
- Arraste arquivos, tokens, personagens e ferramentas do HUD para o tabuleiro. A ferramenta de parede/porta cria um segmento inicial; pincéis aplicam uma região; luzes e efeitos recebem os padrões do painel.
- Até 12 variantes de aparência por token, com troca pelo atalho T. Variantes preservam posição e estado do token.
- Camadas independentes de mapa, desenhos, tokens e efeitos. Nesta versão a ordem é fixa; a visibilidade é configurável.
- Régua métrica, desenho livre, fog manual com pincel de revelação/ocultação e opções de ocultar/revelar toda a cena.
- Paredes e portas desenhadas sobre o mapa; portas podem abrir e fechar. Raios de luz param nesses obstáculos. A versão atual não impede o movimento de tokens através das paredes.
- Dia, penumbra e noite, com luz em degradê, intensidade, cor e alcance ajustáveis. Ponto de luz, tocha e fogo têm perfis próprios; lanterna ilumina em cone orientável. A luz vinculada acompanha o token durante o movimento. O fog manual e a iluminação são camadas separadas; a tocha não revela automaticamente a exploração sob o fog.
- Chuva, neve, brasas e névoa animadas, com intensidade ajustável e movimento reduzido respeitado. A névoa deixa uma região de visibilidade com bordas suaves em torno de todos os tokens visíveis com visão ativada, incluindo PNGs sem ficha. O raio é configurável. É um efeito visual local compartilhado, não visão individual autorizada nem exploração persistente.
- Lanterna com cone de 64° e direção padrão (cima, direita, baixo ou esquerda) relativa à rotação do token. A iluminação fica atrás dos tokens, sem lavá-los com a cor da luz. O fog manual continua acima dos tokens e separado da névoa climática.
- Explorador flutuante, arrastável e redimensionável, com pastas aninhadas, árvore de navegação, busca, renomeação, arraste e movimento de arquivos/pastas. Recortar/copiar/colar e duplicar por botões ou Ctrl/Cmd X/C/V/D; uma cópia de pasta inclui suas subpastas. A área de transferência é interna à janela. Copiar cria novas referências aos mesmos Blobs originais, sem recompressão.
- Menu de botão direito no token: quatro perfis de luz, espelhamento X/Y, bloqueio, variantes, informações e vínculo a uma ficha da campanha. A ficha vinculada mostra nome, NEX, Vida, PE e Sanidade, com +/− usando a operação de recursos já existente e confirmação de salvamento. O recurso não cria novas permissões: a API continua validando conta, campanha e autorização. Na demo, muda os dados de demonstração; na prévia do jogador, é somente leitura.
- Marcadores de informação com I na barra esquerda. Título e texto multilinha aparecem em um cartão ao passar o mouse; por padrão são exclusivos do mestre. Posição travável e visibilidade configurável na simulação local.
- Paredes e portas selecionáveis, com arraste do segmento, alças nas duas pontas, coordenadas exatas, bloqueio e exclusão. Duplo clique abre/fecha portas desbloqueadas. A geometria atualizada também atualiza as sombras durante o gesto.
- Aba de efeitos com chama, laser e raios animados: arraste para inserir, depois mova, gire e redimensione. Intensidade, ocultação e bloqueio por efeito; fog manual continua ocultando os efeitos. Os efeitos são gráficos locais, não executam dano nem alteram fichas automaticamente.
- HUD ocultável com U; na prévia do jogador começa oculto e pode ser reativado pelo botão flutuante.
- Histórico local de até 40 alterações; atalhos de ferramenta, rotação, variante, movimentos e desfazer/refazer.
- IndexedDB com separação por conta, campanha e contexto demo/real. O indicador confirma a conclusão da transação. Arquivos são guardados como Blobs, fora de localStorage.
- Exportação/importação de um arquivo binário `.nexo` com cenas, pastas e arquivos originais, até 4 GiB no total, sem conversão das mídias para base64. O importador também aceita os backups antigos `.nexo.json` (até 300 MiB); versões antigas do aplicativo não conseguem abrir o novo formato. Importar substitui o projeto local, com a versão anterior disponível no histórico de desfazer da sessão. O importador valida os dados e cria novas referências para os arquivos.

## Limites explícitos

### Mesa presencial com TV no mesmo computador

O botão **Tela da TV** abre uma janela separada neste mesmo navegador. Arraste-a para o segundo monitor e, se desejar, use F11 nessa janela. Ela apresenta a visão local dos jogadores; o mestre continua na janela principal. Mudanças na cena e movimentos/transforms em andamento são refletidos na TV, sem gravar cada quadro do arraste. O navegador pode bloquear a janela: habilite pop-ups para esta origem.

Um duplo clique no marcador reproduz a cutscene na janela da TV, sem cobrir o tabuleiro do mestre. O vídeo tem controles apenas na janela do mestre e pode ser configurado para repetir no painel Notas; Esc na janela do mestre encerra a apresentação. A aba Documentos usa o explorador com pastas, e o botão **Mostrar na TV** exibe PDF ou texto. DOCX/XLSX precisam ser convertidos para PDF para apresentação no navegador. Ambas as janelas precisam continuar abertas no mesmo computador, e áudio e reprodução automática dependem das permissões do navegador e da saída de áudio configurada.

A aba Documentos também aceita imagens e prints PNG, JPEG, WebP e GIF: elas aparecem como imagens no mapa e podem ser apresentadas na TV. É possível arrastar esses arquivos ou documentos compatíveis diretamente do computador para o tabuleiro; os originais também entram na biblioteca. PDFs e outros documentos entram como cartões no mapa; PDFs e textos podem ser abertos em tela cheia na TV, e documentos de Word/Excel precisam ser convertidos para PDF para apresentação. Para inserir um token em vez de uma imagem livre, use a importação da aba Tokens.

Segure T sobre um token, mova o cursor até a variante e solte T (ou clique) para escolhê-la. Tokens sem ficha também podem ter Vida, PE e Sanidade próprios no menu de contexto; esses valores são locais à mesa, independentes de qualquer ficha vinculada.

**Isto não é multiplayer em aparelhos diferentes.** A janela da TV é uma projeção local e usa a mesma sessão e memória do navegador do mestre. Não é uma fronteira de segurança nem permite conexão independente dos jogadores. Teste antecipadamente a TV, os formatos das mídias, o áudio, o desempenho e as fontes; exporte um backup antes da sessão.

O editor **não é uma sala multiplayer**. As alterações não são enviadas ao Supabase, a outro navegador, dispositivo ou jogador. Apenas o mestre recebe o acesso ao editor pela interface. Essa restrição na interface não representa uma nova autorização de servidor: não foram criadas APIs nem políticas de jogo para a mesa.

A prévia do jogador é uma **simulação visual local do mestre**, não uma fronteira de segurança. O projeto completo continua na memória e no armazenamento do navegador do mestre. Nunca compartilhar esse documento completo com jogadores para esconder segredos apenas por CSS/fog.

O salvamento é local ao dispositivo/origem. Navegação privada, limpeza dos dados do site, falta de espaço ou mudança de porta/origem podem tornar o projeto indisponível. Exporte uma cópia para preservar o trabalho. Edite uma mesa em uma aba por vez: ainda não existe resolução de conflitos entre abas.

Não há reconhecimento automático de paredes em imagens. Uma imagem comum não descreve paredes, portas ou unidades. Os padrões permitem começar imediatamente; a escala da grade pode ser ajustada, e paredes precisam ser desenhadas para bloquear luz.

Ainda faltam: sincronização multiplayer, presença e cursores, permissões por token no servidor, visão individual com exploração persistente, colisões, seleção múltipla, camadas personalizadas/reordenáveis, vídeo/WebM, sons, iniciativa e otimização em tiles para mapas maiores.

## Arquitetura

- `lib/tabletop/model.ts`: documento versionado, validação, geometria, criação de cenas e tokens.
- `lib/tabletop/storage.ts`: persistência IndexedDB e referências dos arquivos originais.
- `components/tabletop/stage.tsx`: superfície SVG em coordenadas do mundo, gestos, renderização e máscaras de iluminação/fog.
- `components/tabletop/tabletop.tsx`: comandos, histórico, cenas, importação/exportação e painéis.
- `components/tabletop/lighting.tsx`: gradientes, máscaras, cones e fontes vinculadas.
- `components/tabletop/asset-library.tsx`: pastas, biblioteca e arraste de arquivos.
- `components/tabletop/object-controls.tsx`: transformações e propriedades de luz.
- `app/tabletop.css`: estilos isolados, controles responsivos e efeitos.
- `tests/tabletop.test.mjs`: escala, geometria de luz, portas, validação e isolamento dos contextos locais.

## Próxima etapa: sala compartilhada

Antes de levar a mesa a sessões reais, implementar e validar:

1. Migração aditiva com cenas versionadas por campanha e assets privados específicos para mapas/tokens. Preservar o código existente e as permissões das fichas. O limite de 10 MiB dos uploads existentes não deve ser aumentado globalmente sem analisar Storage, custos e uso de retratos.
2. API autenticada para comandos de cena, com checagem de participação, papel, proprietário do token e versão otimista. Não confiar na visibilidade definida pelo cliente.
3. Dois documentos de leitura: o documento completo do mestre e uma projeção autorizada por jogador. Segredos, tokens ocultos e áreas não autorizadas não podem ser enviados indiscriminadamente. Para segredos contidos na própria imagem do mapa, a ocultação forte exige recortes/tiles gerados no servidor ou assumir explicitamente fog apenas visual; entregar a imagem original inteira permite que o jogador a inspecione.
4. Broadcast de eventos autorizados/presença, comandos idempotentes, confirmação de persistência, recuperação ao reconectar e conflitos de movimentos.
5. Testes com duas contas e dois navegadores: isolamento por campanha, revogação, movimentos simultâneos, reconexão, cena ativa e ausência de segredos no tráfego do jogador.
6. Otimização de imagens/tiles sem substituir o original. Começar com limites medidos e elevar a capacidade após testar memória, carregamento e luzes em máquinas mais simples.

Referência de interação: [Owlbear Rodeo — introdução](https://docs.owlbear.rodeo/docs/getting-started/) e [Dynamic Fog](https://docs.owlbear.rodeo/extensions/reference/dynamic-fog/). A implementação desta branch é própria e não embute o serviço nem depende de extensões externas.

## Validação desta primeira entrega

### Coleções e cutscenes locais

- Cenas e tokens podem ser atribuídos a conjuntos com pesquisa e seções recolhíveis. Remover um conjunto apenas desagrupa seus itens e pode ser desfeito na sessão. As propriedades novas usam padrões que preservam projetos antigos.
- O explorador pode ser destacado em uma janela real do navegador. O navegador pode bloquear pop-ups; neste caso, permita-os para o Nexo. Para outro monitor, arraste a janela destacada.
- Na aba de cenas ou tokens, busque, recolha conjuntos e arraste um item para outro conjunto. No explorador há atalhos de copiar, recortar, colar, duplicar, renomear (F2), remover (Delete), navegar pela hierarquia, ordenar e alternar entre lista e grade.
- Selecione um token e pressione L para ligar ou desligar sua lanterna; sem token selecionado, L seleciona a ferramenta de adicionar luz. As máscaras de luz mudam junto com a posição e a rotação do token.
- O navegador reserva Esc para sair da tela cheia nativa. Para uma experiência que não fecha ao pressionar Esc, use o botão “Modo imersivo com F11” e depois F11 no navegador; use o botão de tela cheia para sair do modo imersivo.
- Marcadores de cutscene aceitam imagens PNG, JPEG, WebP e GIF de até 80 MiB e vídeos MP4/WebM de até 1 GiB, sujeitos à cota e ao espaço disponível no navegador. Dois cliques iniciam a reprodução local e Esc encerra. Controles de vídeo aparecem ao mestre. A mídia original é armazenada no navegador e incluída na exportação; aguarde a gravação e o download concluírem antes de sair.
- A mesa virtual existente ainda é um editor local do mestre: **cutscenes não são transmitidas aos jogadores**. Implementar isso exige sala compartilhada, armazenamento acessível aos membros, autorização no servidor e sincronização de estado/reconexão; a prévia do jogador não representa outro dispositivo.
- O zoom agrupa eventos de roda em quadros e atualiza a geometria completa ao fim do gesto; luzes reutilizam polígonos de paredes inalteradas e gravações próximas são agrupadas. O resultado varia com complexidade da cena e capacidade do dispositivo.

- TypeScript e builds Next.js/Vercel e Vinext/Sites executados com sucesso.
- Vinte testes específicos da mesa, além dos 37 testes anteriores: escala, luz/portas, ordenação angular das sombras, documentos inválidos, referências de arquivos, isolamento local, compatibilidade das cenas anteriores, transformações, pastas, cópia recursiva, visão de PNGs com fichas na cena, direção de lanterna, edição/bloqueio de paredes e persistência de notas/efeitos.
- Navegador: arraste com snap, tocha vinculada ao token, noite/penumbra, chuva, desenho de parede, pincel de fog e simulação visual do jogador.
- Importação de mapa e token JPEG, adição de variante e troca pelo atalho T; exportação e reimportação do documento; recuperação das imagens após recarregar.
- Os três arquivos de imagem presentes na exportação foram comparados por SHA-256 ao original usado no teste, com igualdade de bytes. O arquivo de teste é uma captura da própria demonstração, sem dados reais.
- Conferência em 1440 e 375 pixels de viewport; em 375, não houve transbordamento horizontal da página. Painel recolhido mantém o mapa disponível; painel aberto sobrepõe a cena em vez de deformá-la.
- A cena temporária de importação foi removida pela interface, com recuperação disponível no histórico da sessão. A cena inicial foi deixada para demonstração.

Esses testes cobrem o editor local. Não validam login, uploads remotos, presença ou multiplayer.

### Atalhos de atmosfera e objetos

- Menu do token: ative uma luz e role sobre seu ícone para ajustar simultaneamente o raio (32 px por passo) e a intensidade (10 pontos percentuais). As setas ↑/↓ no botão oferecem alternativa ao mouse. A lanterna acompanha os espelhamentos horizontal/vertical e a rotação do token; as bordas do feixe são suavizadas antes do recorte pelas paredes.
- Cabeçalho: atalhos de dia, penumbra, noite, névoa, chuva e fogo/brasas. Clique alterna o clima; scroll sobre um botão climático ajusta sua intensidade em 10 pontos percentuais. Há um clima ativo por vez; luz ambiente e efeitos locais são independentes.
- Brilho luminoso é composto atrás dos personagens; escurecimento e névoa são compostos depois deles. Assim os tokens recebem a atmosfera sem um halo colorido cobrindo sua imagem.
- Chuva usa trajetórias, clarões e ondulações de impacto no espaço do mapa, recortados por sua transformação. Não é uma película fixa sobre toda a interface.
- Catálogo com 11 efeitos vetoriais procedurais animados: chama, laser, raios, fumaça, portal, vórtice, fagulhas, geada, nuvem tóxica, ondulações e aura de luz. Respeitam movimento reduzido; não são vídeos/física volumétrica.
- Botão direito abre ações de tokens, imagens/documentos, efeitos, notas, luzes, paredes, desenhos e mapa. No menu do mapa, é possível selecionar a última pincelada de fog para apagá-la. Notas aceitam redimensionamento pelas alças e pelo menu/painel.
- Delete/Backspace remove a seleção do tabuleiro, preservando a biblioteca; objetos travados precisam ser desbloqueados. Campos de texto não disparam exclusão. Ctrl+Z ou Desfazer recupera a exclusão no histórico da sessão.
- Novas verificações automatizadas cobrem limites do scroll, lanterna espelhada, os 11 tipos de efeitos, migração/redimensionamento de notas e exclusão de todos os tipos de objetos com proteção de travas.

### Extensão: imagens livres, arquivos e atmosfera

- PNG transparente de teste renderizado sem círculo, fundo ou rótulo; X e R conferidos no navegador. Tamanho proporcional alterado pelo painel.
- Arraste de token conferido: a origem da luz vinculada terminou exatamente na nova posição do token; o estado transitório do gesto usa o mesmo documento exibido pela iluminação.
- Pasta criada, imagem movida para ela e arrastada ao mapa como nova instância. Documento TXT importado e inserido como cartão; redimensionamento pela alça conferido.
- Lanterna arrastada do painel ao mapa; intensidade ajustada até 200%. Cenas, documentos e transformações reapareceram em uma nova aba da mesma origem.
- Prévia do jogador iniciou com ferramentas e HUD ocultos, mantendo o botão para reativá-los.
- Modo imersivo medido em 1440 × 1000, sem margens. A tela cheia nativa não pôde ser confirmada no navegador embutido; o fallback ocupa toda a janela e orienta o uso de F11.
- A cena de validação foi mantida separada da cena inicial, sem modificar seu conteúdo. Uma limitação da automação do navegador impediu concluir a limpeza pela interface ao final; os arquivos estão identificados como teste.

### Revisão: ferramentas de mestre e vínculo de fichas

- 57 testes automatizados aprovados; TypeScript e build de produção aprovados. A revisão de React separou estado da interface e gestos transitórios; os arquivos originais continuam em URLs de Blob, sem otimização/recompressão automática.
- Navegador: menu de botão direito no PNG, vínculo a Kaori, Vida 32 → 31 → 32, seleção de lanterna e direção Direita. Esta conferência de recursos ocorreu na demo; não é validação de uma sessão autenticada remota.
- PNG sem ficha e personagem vinculado produziram círculos de visão distintos na névoa. A luz ficou atrás do PNG. Após recarregar: direção Direita, dois tokens, uma nota, três efeitos e chuva máxima (320 partículas) recuperados.
- Explorador: criação de subpasta, copiar/colar, recortar/colar, renomear e duplicar imagem; movimentação do cabeçalho e redimensionamento da janela confirmados.
- Parede: desenho, seleção, ajuste da ponta B e bloqueio confirmado pela remoção das alças e desativação dos campos. Nota multilinha conferida no tooltip e ausente na prévia do jogador. Chama/laser inseridos pelo painel; raios inseridos por arraste.
- Em 375 × 812, explorador com largura 304 px, dentro do viewport e sem transbordamento horizontal da página.
- A cena e os arquivos criados exclusivamente nesta revisão foram removidos pela interface, com Desfazer disponível na sessão; cena e arquivos anteriores preservados.
