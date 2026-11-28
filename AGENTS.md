# Nexo RPG

Use a skill `implementar-tarefas-rpg` para toda mudança de código, desde tarefas do plano até correções e ajustes pequenos. Aplique este fluxo quando a skill não estiver disponível:

1. Localize e leia o código afetado e um caso equivalente. Identifique as convenções e instruções aplicáveis.
2. Antes de editar, relate o impacto sobre chamadores, contratos, dados, permissões e testes.
3. Confirme no chat ambiguidades de regra de negócio e mudanças em contratos públicos, esquema ou comportamento existente.
4. Reutilize a lógica do projeto, mantendo a mudança restrita ao requisito.
5. Crie ou atualize os testes relevantes, rode lint e build e informe as verificações e seus limites.

Todo PR deve incluir um **Roteiro de teste** em português, com pré-requisitos, passos executáveis e resultados esperados. Cubra os fluxos alterados, limites e permissões relevantes; inclua computador e celular quando houver mudança de interface. Separe o roteiro manual das verificações automatizadas já executadas e identifique dependências ou limitações do ambiente.
