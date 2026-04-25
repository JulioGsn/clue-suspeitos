# Game Design Document (GDD)

## Detetive: Arquivo Secreto (Web Edition)

## 1. Introdução

**Nome do Jogo:** Detetive: Arquivo Secreto (ou *Clue: Secret Files*)
**Plataforma:** Web App (Browser - Desktop e Mobile)
**Gênero:** Cartas, Dedução, Estratégia por Turnos, Multiplayer.
**Público-Alvo:** Jogadores casuais, fãs de jogos de tabuleiro, famílias e grupos de amigos. Faixa etária: 8+ anos.

**Resumo do Conceito:**
Uma adaptação digital 100% fiel do jogo de cartas "Clue Suspeitos". Diferente do jogo de tabuleiro tradicional, esta versão remove a movimentação por dados e foca puramente na dedução lógica e blefe através de mecânicas de cartas. Os jogadores interrogam uns aos outros para descobrir o que está escondido no "Arquivo Confidencial".

## 2. Visão Geral do Jogo

**Objetivo Principal:**
Ser o primeiro detetive a deduzir corretamente os três elementos do crime ocultos no Arquivo Confidencial: **Quem** (Suspeito), **Com o quê** (Arma) e **Onde** (Local).

**Mecânicas Principais:**

* **Gestão de Mão:** Ocultar suas Cartas de Evidência dos oponentes.
* **Interrogatório (Call-out):** Escolher dois elementos para perguntar aos adversários.
* **Dedução por Eliminação:** Marcar cartas como "Inocentes" ao vê-las com outros jogadores.
* **Blefe:** Fazer perguntas sobre cartas que você mesmo possui para confundir adversários.

**Regras Básicas (Resumo):**

* 2 a 4 Jogadores.
* 3 cartas do crime são separadas no início (1 suspeito, 1 arma, 1 local).
* O resto das Cartas de Evidência é distribuído aos jogadores.
* No turno, o jogador X pergunta ao jogador Y sobre 2 itens (ex: "Foi a Scarlet com a Corda?").
* Se Y tiver uma ou ambas as cartas, deve mostrar (secretamente) apenas UMA para X.
* Se Y não tiver, a pergunta passa para o próximo jogador.

## 3. Design de Gameplay

### 3.1. Estrutura da Rodada (Core Loop)

1. **Fase de Interrogatório:** O jogador da vez seleciona 2 itens (Suspeito, Arma ou Local) na UI para investigar.
2. **Fase de Resposta:** O sistema notifica o jogador à esquerda. Se ele possuir cartas correspondentes, a UI o obriga a escolher UMA para mostrar. Se não, o sistema passa automaticamente a pergunta ao próximo.
3. **Fase de Registro:** O jogador que perguntou visualiza a carta revelada. O sistema automaticamente (ou manualmente, a critério do jogador) marca essa carta como "Inocente" no Bloco de Notas Virtual.
4. **Fase de Acusação (Opcional):** O jogador pode decidir fazer uma acusação final.

### 3.2. As Cartas

O jogo possui dois "tipos" lógicos de cartas, traduzidos para a interface digital:

* **Cartas de Evidência (Laranjas no físico):** As provas reais. São distribuídas no início. O que você tem na mão é "Inocente".
* **Cartas de Arquivo (Brancas no físico):** No jogo físico, servem para o jogador separar o que já sabe. **Adaptação Digital:** Isso será transformado em um **Bloco de Notas Interativo (Tracker)**. Em vez de gerenciar um segundo deck de cartas brancas, o jogador clica nos ícones dos suspeitos/armas/locais para riscá-los (marcá-los como inocentes).

**Distribuição (Jogo Simples / 12 Cartas):**

* **Suspeitos (6):** Coronel Mostarda, Prof. Plum, Sr. Green, Sra. Peacock, Srta. Scarlet, Sra. White.
* **Armas (3):** Faca, Castiçal, Corda.
* **Locais (3):** Quarto, Banheiro, Cozinha.
  *(Nota: O Modo Avançado adiciona +1 Arma e +2 Locais).*

### 3.3. Acusação e Fim de Jogo

* Ao acusar, o jogador seleciona 3 itens. O sistema verifica secretamente no Banco de Dados (Backend).
* **Acerto:** Tela de Vitória. O jogador revela o Arquivo Confidencial para todos.
* **Erro:** Tela de "Eliminado". O jogador não joga mais, seu Bloco de Notas é bloqueado, mas seu cliente continua respondendo automaticamente aos interrogatórios dos outros jogadores se ele possuir as cartas solicitadas (para não travar a partida).

## 4. Interface e Experiência do Usuário (UI/UX)

**Layout Principal (In-Game):**

* **Centro da Tela (Mesa):** O "Arquivo Confidencial" fechado e as cartas extras reveladas (se houver sobra na distribuição). Avatar dos oponentes em círculo.
* **Rodapé (Sua Mão):** Suas Cartas de Evidência visíveis apenas para você.
* **Lateral Direita (Bloco de Notas/Arquivo):** Um painel retrátil. Substitui as "Cartas de Arquivo" físicas. Mostra a lista de todos os itens. O jogador clica para marcar "X" (Inocente) ou "!" (Suspeito).
* **Log de Ações (Esquerda):** Um chat que descreve as ações: *"Green perguntou a Plum sobre Faca e Scarlet"*. *"Plum mostrou uma carta para Green"*.

**Fluxo de Navegação:**
`Login -> Menu Principal -> Criar Sala / Entrar em Sala -> Lobby de Espera -> Partida -> Tela de Resultados -> Retorno ao Lobby`.

**Feedback Visual e Sonoro:**

* *Ao receber uma prova:* A carta desliza para a tela com um som de "papel sendo carimbado" (CONFIDENCIAL).
* *Ao fazer acusação:* A música para, som de batida de coração, sirene policial se acertar, som de vidro quebrando ou falha se errar.
* *Turno do jogador:* Borda da tela pisca suavemente para indicar que é a vez de agir.

## 5. Arte e Estilo Visual

* **Estilo Artístico:** "Modern Noir" ou "Flat Mystery". Vetores limpos, sombras duras, paleta de cores focada em contraste. Acessível e responsivo para telas de celular.
* **Paleta de Cores:**
  * Fundo/Mesa: Verde feltro escuro (#1a3b2b) ou Madeira escura (#2c1e16).
  * Cartas: Creme/Papel envelhecido (#f4eedc).
  * Destaques (UI): Laranja (referência às cartas de evidência originais), Dourado, e Vermelho escuro para alertas.
* **Design das Cartas:** Retratos estilizados. Símbolos claros e grandes (importante para jogar no celular).

## 6. Música e Efeitos Sonoros

* **Música de Fundo (BGM):**
  * *Lobby:* Jazz suave, contrabaixo marcante, estalar de dedos (estilo Pantera Cor-de-Rosa/Espionagem clássica).
  * *In-Game:* Atmosfera de suspense leve, loops discretos que não atrapalham a concentração.
* **Efeitos Sonoros (SFX):**
  * Distribuir cartas (Swoosh de papel).
  * Notificação de seu turno (Sino de máquina de escrever).
  * Mensagem de erro/Acusação falsa (Som de carimbo de "Rejeitado").

## 7. Multiplayer e Interatividade

* **Modos de Jogo:**
  * *Casual Online:* Matchmaking aleatório com jogadores reais.
  * *Salas Privadas:* Criação de sala com código de 6 letras para jogar com amigos (via WebSocket).
* **Comunicação:**
  * Sem chat de texto livre (para evitar insultos ou que jogadores revelem o jogo estragando a partida).
  * **Sistema de Emojis/Frases Rápidas:** "Hmm...", "Suspeito...", "Eu sei quem foi!", "Passe a vez!".
* **Sincronização:** Uso estrito do NestJS com Socket.io. O estado da partida fica 100% no servidor. O cliente NextJS apenas renderiza a UI para evitar trapaças (nuggets escondidos no código client-side).

## 8. Regras e Balanceamento

O balanceamento segue o jogo físico da Hasbro, sem alterações matemáticas.

* **Modo Clássico (2-4 jogadores):** Usa o deck reduzido (12 cartas). Rápido, partidas duram de 5 a 10 minutos.
* **Modo Avançado (Investigador Experiente):** Habilitado via botão no Lobby. Adiciona Revólver, Sala de Estar e Hall (15 cartas totais). Aumenta o tempo de partida para 10-15 minutos.
* **Regra de 2 Jogadores (Edge Case Tratado):** Se Y acusa e erra, num jogo de 2, Y perde automaticamente e X vence.

## 10. Plataformas e Tecnologias

A stack solicitada é ideal para um Web App moderno e escalável:

* **Frontend (Cliente):** Next.js (React). Foco em Server-Side Rendering (SSR) para SEO da landing page e Single Page Application (SPA) para a área *in-game*. Uso de Tailwind CSS para UI responsiva (mobile-first).
* **Backend (Servidor):** NestJS (Node.js). Arquitetura modular.
  * *Módulo de Auth:* JWT para login/registro de usuários.
  * *Módulo de Matchmaking:* Gerenciamento de filas.
  * *Módulo de Game State:* Lógica do jogo rodando no servidor.
* **Tempo Real:** Socket.io (integrado nativamente ao NestJS via WebSockets).
* **Banco de Dados:** MySQL ou MariaDB. Armazena perfis de usuários, estatísticas (vitórias, derrotas, personagens favoritos) e inventário de cosméticos. Relacional (TypeORM ou Prisma).
* **Documentação da API REST:** Swagger (OpenAPI) configurado no NestJS para documentar as rotas de Auth, Histórico e Loja.

## 11. Cronograma de Desenvolvimento (Estimativa: 3 Meses)

* **Mês 1: Planejamento e Backend Base**
  * Design de UI/UX (Figma).
  * Setup da infraestrutura (NestJS, Banco de Dados MySQL).
  * Documentação Swagger.
  * Lógica central de Game State no Backend (sem UI, testado via API/Sockets).
* **Mês 2: Frontend e Multiplayer**
  * Desenvolvimento do Frontend em Next.js.
  * Integração com WebSockets (Criação de Salas, Lobby, Chat).
  * Implementação do "Core Loop" no cliente (fazer pergunta, mostrar carta).
* **Mês 3: Polimento, Áudio e Lançamento**
  * Integração de artes finais e animações (Framer Motion ou CSS puro).
  * SFX e Música.
  * Testes de QA rigorosos (Bug hunting em cenários de queda de conexão).
  * Deploy (Vercel para Next.js, AWS/Railway para NestJS + DB).

## 12. Equipe e Recursos Necessários

**Equipe Mínima (Enxuta):**

* **1 Full-Stack Developer** (Especialista em TypeScript, Next, Nest, WebSockets).
* **1 UI/UX Designer / Artista 2D** (Criação de telas, ícones e cartas).
* **1 Sound Designer** (Freelance, para criar/licenciar os áudios adequados).
* **1 QA/Tester** (Foco em testar cenários de desconexão e regras do jogo).

**Softwares e Ferramentas:**

* *Design:* Figma, Adobe Illustrator.
* *Dev:* VS Code, Git/GitHub, Docker (para conteinerizar o banco MariaDB/MySQL localmente).
* *Gerenciamento:* Trello, Jira ou Notion.
* *Comunicação API:* Postman/Insomnia (e o próprio Swagger gerado pelo NestJS).