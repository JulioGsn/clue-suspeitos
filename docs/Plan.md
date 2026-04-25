# Plan: Detetive - Arquivo Secreto

## 1. Arquitetura Técnica

### Stack Tecnológica

* **Backend:** NestJS (Node.js) com TypeScript.

* **Frontend:** Next.js 14+ (App Router) com Tailwind CSS e Framer Motion (animações).

* **Base de Dados Principal (Main DB):** MySQL/MariaDB.

* **Base de Dados de Auditoria (Logs DB):** MySQL (Instância ou base separada).

* **ORM:** TypeORM (suporte multi-connection).

* **Comunicação em Tempo Real:** Socket.io (WebSockets).

* **Armazenamento de Ficheiros:** Multer (Local Storage em `/public/uploads/cards`).

* **Autenticação:** Passport.js + JWT.

### High-Level Design

1. **Multi-Database Connection:** O NestJS terá duas fontes de dados configuradas. O `MainModule` acede à base principal e o `AuditModule` acede à base de logs.

2. **Audit Interceptor:** Um interceptor global capturará as respostas de sucesso de rotas decoradas com `@Audit()`, extraindo o payload e enviando-o de forma assíncrona para o Logs DB.

3. **Game State Engine:** O estado da partida será mantido na base de dados, mas a coordenação dos turnos será feita via `Gateways` do Socket.io.

## 2. Estrutura de Pastas Proposta

```
/apps
  /server (NestJS)
    /src
      /modules
        /auth
        /users
        /perfis
        /amizades (Roadmap)
        /cartas (Admin CRUD + Upload)
        /partidas (Lobby + Game Logic)
        /audit (Logs DB logic)
      /gateways (Socket.io)
      /common (Interceptors, Filters)
  /client (Next.js)
    /src
      /app
        /(auth) /login /register
        /(dashboard) /home /ranking /amigos
        /(game) /lobby /partida
        /(admin) /cartas
      /components
        /ui (Modais customizados, Toasts, Buttons)
        /game (Board, Hand, Notebook, Card)
      /hooks (useSocket, useAuth, useTheme)
      /styles (globals.css, Tailwind config)

```

## 3. Modelagem de Dados (Schema Físico)

### Main DB

#### Tabela: `usuarios`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| email | VARCHAR(255) | UNIQUE, NOT NULL | 
| password_hash | VARCHAR(255) | NOT NULL | 
| role | ENUM('ADMIN', 'PLAYER') | DEFAULT 'PLAYER' | 
| created_at | DATETIME | DEFAULT NOW() | 

#### Tabela: `perfis`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| user_id | UUID | FK (usuarios.id), UNIQUE | 
| username | VARCHAR(50) | NOT NULL | 
| avatar_url | VARCHAR(255) |  | 
| vitorias | INT | DEFAULT 0 | 
| derrotas | INT | DEFAULT 0 | 

#### Tabela: `amizades` (Roadmap)

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| perfil_id_1 | UUID | FK (perfis.id) | 
| perfil_id_2 | UUID | FK (perfis.id) | 
| status | ENUM('PENDING','ACCEPTED') | DEFAULT 'PENDING' | 
| created_at | DATETIME | DEFAULT NOW() | 

#### Tabela: `cartas`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| nome | VARCHAR(100) | NOT NULL | 
| tipo | ENUM('SUSPEITO','ARMA','LUGAR') | NOT NULL | 
| image_url | VARCHAR(255) | NOT NULL | 

#### Tabela: `partidas`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| codigo | VARCHAR(10) | UNIQUE (Para salas privadas) | 
| host_id | UUID | FK (perfis.id), NOT NULL | 
| tipo | ENUM('PUBLICA','PRIVADA') | DEFAULT 'PUBLICA' | 
| status | ENUM('LOBBY','EM_ANDAMENTO','FINALIZADA') | DEFAULT 'LOBBY' | 
| dificuldade | ENUM('NORMAL','DIFICIL') | DEFAULT 'NORMAL' | 
| modo_jogo | ENUM('CLASSICO','AVANCADO') | DEFAULT 'CLASSICO' | 
| config_notebook | ENUM('NONE','MANUAL','AUTO') | DEFAULT 'MANUAL' | 
| vencedor_id | UUID | FK (perfis.id), NULLABLE | 
| suspeito_crime_id | UUID | FK (cartas.id), NULLABLE (Oculto) | 
| arma_crime_id | UUID | FK (cartas.id), NULLABLE (Oculto) | 
| local_crime_id | UUID | FK (cartas.id), NULLABLE (Oculto) | 
| created_at | DATETIME | DEFAULT NOW() | 

#### Tabela: `jogadores`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| partida_id | UUID | FK (partidas.id) | 
| perfil_id | UUID | FK (perfis.id), NULLABLE (Se bot) | 
| is_bot | BOOLEAN | DEFAULT FALSE | 
| is_eliminated | BOOLEAN | DEFAULT FALSE | 
| ordem_turno | INT | NULLABLE (Definido ao iniciar) | 
| notebook_data | JSON | Estado do bloco de notas | 

#### Tabela: `mao_cartas`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| jogador_id | UUID | FK (jogadores.id) | 
| carta_id | UUID | FK (cartas.id) | 

#### Tabela: `perguntas` (Log de Ações In-Game)

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| partida_id | UUID | FK (partidas.id) | 
| asker_id | UUID | FK (jogadores.id) | 
| target_id | UUID | FK (jogadores.id) | 
| item1_id | UUID | FK (cartas.id) | 
| item2_id | UUID | FK (cartas.id) | 
| revealed_card_id | UUID | FK (cartas.id), NULLABLE | 
| created_at | DATETIME | DEFAULT NOW() | 

#### Tabela: `mensagens_chat` (Apagadas ao fim da partida)

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | UUID | PK | 
| partida_id | UUID | FK (partidas.id) | 
| perfil_id | UUID | FK (perfis.id) | 
| predefined_text_id | VARCHAR(50) | Ex: 'MSG_HELLO', 'MSG_GG' | 
| created_at | DATETIME | DEFAULT NOW() | 

### Logs DB

#### Tabela: `auditoria`

| Coluna | Tipo | Constraints | 
 | ----- | ----- | ----- | 
| id | BIGINT | PK, AUTO_INCREMENT | 
| timestamp | DATETIME | DEFAULT NOW() | 
| tabela | VARCHAR(50) |  | 
| operacao | VARCHAR(10) |  | 
| payload_anterior | JSON |  | 
| payload_novo | JSON |  | 
| responsavel_id | UUID | FK (usuarios.id) | 

## 4. Design da API (Endpoints e WebSockets)

### API REST (HTTP)

#### Auth, Utilizadores & Perfil

* `POST /auth/register`: Registo de utilizador.

* `POST /auth/login`: Login e retorno de Token JWT.

* `GET /perfil/me`: Dados do perfil autenticado.

* `GET /perfil/ranking`: Top 5 vencedores.

#### Amizades (Roadmap)

* `POST /amizades/solicitar`: Envia pedido de amizade.

* `POST /amizades/aceitar/:id`: Aceita pedido.

* `GET /amizades`: Lista amigos.

* `GET /amizades/:id/historico`: Histórico de partidas jogadas com o amigo.

#### Admin (Protected by Role 'ADMIN')

* `POST /admin/cartas`: Upload de imagem (Multipart) + metadados da carta.

* `PUT /admin/cartas/:id`: Atualização de metadados.

* `DELETE /admin/cartas/:id`: Exclusão de carta.

#### Partidas (Lobby)

* `POST /partidas`: Cria lobby (Pública/Privada, Clássico/Avançado) e devolve o ID/Código.

* `GET /partidas`: Lista salas públicas (Aguardando jogadores).

* `GET /partidas/:id`: Devolve os detalhes da sala e a lista de jogadores.

* `POST /partidas/:id/entrar`: Entra numa sala existente.

* `POST /partidas/:id/add-bot`: Host adiciona um bot para preencher uma vaga.

* `GET /partidas/:id/checkpoint`: Recupera dados do Bloco de Notas para reconexões.

### Eventos de WebSocket (Socket.io Namespace: `/game`)

#### Client to Server (Ações do Jogador)

* `emit('join_room', { partida_id })`

* `emit('start_game')`

* `emit('make_callout', { target_id, item1_id, item2_id })`

* `emit('make_accusation', { suspeito_id, arma_id, local_id })`

* `emit('update_notebook', { notebook_data })`

* `emit('send_chat', { predefined_text_id })`

#### Server to Client (Respostas e Atualizações)

* `on('lobby_updated', { jogadores })`

* `on('game_started', { mao_jogador, mesa_sobras })`

* `on('turn_changed', { current_jogador_id, timeout_timestamp })`

* `on('callout_result', { asker_id, target_id, revealed_card_id })`

* `on('accusation_result', { is_correct, jogador_id, cartas_crime })`

* `on('chat_message_received', { perfil_id, predefined_text_id })`

## 5. Estratégia de Implementação

1. **Setup Dual DB:** Configurar as conexões `Main DB` e `Logs DB` no NestJS.

2. **Audit Logic:** Criar o Interceptor `@Audit()` para capturar alterações no Main DB.

3. **Lobby & REST APIs:** Desenvolver Autenticação, CRUD de Cartas e mecânica de salas.

4. **Game Loop (Sockets):** Sorteio, controlo de turnos, lógica de IA.

5. **Frontend:** Interface "Noir", Socket.io, Bloco de Notas dinâmico.

## 6. Especificações de UI/UX (Frontend Architecture)

### 6.1. Identidade Visual e Temas (Tailwind)

O sistema suportará Modo Claro e Escuro, com alternância no perfil do utilizador.

* **Dark Mode (Modern Noir - Default):**

  * Fundo/Mesa: Verde feltro escuro (`#1a3b2b`) ou Madeira escura (`#2c1e16`).

  * Cartas e Papéis: Creme/Papel envelhecido (`#f4eedc`) com tipografia em carvão.

  * Destaques e UI: Laranja (Evidência), Dourado (Ações) e Vermelho escuro (Alertas/Suspeitos).

* **Light Mode (Gabinete de Investigação):**

  * Fundo: Bege claro textura papel (`#fdfbf7`) ou Madeira clara (`#d4b483`).

  * Paineis: Branco com sombras suaves (Drop-shadow suave).

  * Destaques: Azul Marinho (Botões primários) e Laranja clássico.

### 6.2. Navegação e Interação

* **Global:** Não haverá recarregamento de página (SPA feeling via Next.js).

* **Navegação Principal:** \* *Desktop:* Sidebar esquerda fixa para navegação global (Home, Ranking, Amigos, Sair).

  * *Mobile:* Bottom Navigation Bar com ícones (Lucide React).

* **Bloqueio de Prompts Nativos:** Fica **estritamente proibido** o uso de `alert()`, `confirm()` ou `prompt()` do JavaScript.

  * *Substituição:* Componentes customizados via Radix UI ou Headless UI para *Dialogs* (Modais) e *Toasts* (Notificações).

### 6.3. Feedback Visual (Framer Motion)

* Cartas a serem distribuídas devem "voar" do centro para a borda inferior.

* Borda do ecrã pulsa suavemente em dourado durante o turno.

* Modais de Acusação escurecem totalmente o fundo (backdrop-blur).

## 7. Mapeamento de Telas (Views & Flows)

### Tela 1: Login / Registro (Auth)

* **Fluxo:** Tela inicial para visitantes.

* **Layout:** Card centralizado flutuando sobre um fundo misterioso. Formulário simples (Email/Senha).

* **Dados:** `POST /auth/login` ou `POST /auth/register`.

### Tela 2: Dashboard (Home Central)

* **Fluxo:** Acessada após o login.

* **Layout:** \* Header com Avatar, Username, Vitórias/Derrotas e Toggle Claro/Escuro.

  * Painel principal com "Criar Sala Privada" e "Criar Sala Pública".

  * Lista de Salas Públicas (Aguardando Jogadores).

* **Dados:** `GET /perfil/me`, `GET /partidas`.

### Tela 3: Lobby de Espera

* **Fluxo:** Usuário criou ou entrou numa sala.

* **Layout:** Código da Sala (ex: `AX72J`), botão "Copiar Link". Lista de jogadores e botão "+ Adicionar Bot". Painel de Configuração do Host.

* **Dados:** Sockets (`lobby_updated`), `POST /partidas/:id/add-bot`.

### Tela 4: Mesa de Jogo (In-Game Board)

* **Fluxo:** O Core Loop da partida.

* **Layout:**

  * *Centro:* "Arquivo Confidencial" oculto. Avatares em semicírculo.

  * *Rodapé:* "Mão" do jogador (cartas expansíveis).

  * *Bloco de Notas (Drawer Lateral):* No Desktop fica acoplado à direita. No Mobile, é uma gaveta deslizante ("Slide-in Drawer") que vem da lateral ao clicar num botão "Prancheta", permitindo uso prático.

  * *Chat (Log de Ações):* Canto inferior esquerdo (ou aba na Bottom Bar em mobile).

* **Dados:** WebSockets (`/game` namespace).

### Tela 5: Fim de Jogo (Resultados)

* **Fluxo:** Disparado pelo evento `accusation_result`.

* **Layout:** Overlay dramático. Animação de "CASO ENCERRADO" e Avatar do Vencedor.

### Tela 6: Ranking Geral (Top 5)

* **Fluxo:** Via menu lateral/bottom.

* **Layout:** Pódio visual com os melhores detetives.

* **Dados:** `GET /perfil/ranking`.

### Tela 7: Painel Admin (Gestão de Cartas)

* **Fluxo:** Se `role === 'ADMIN'`.

* **Layout:** Tabela de dados listando cartas. Modal com Dropzone para Upload de Imagem.

* **Dados:** CRUD em `/admin/cartas`.

### Tela 8: Amigos e Histórico (Roadmap Futuro)

* **Fluxo:** Via menu principal.

* **Layout:** Abas de "Lista de Amigos" e "Histórico de Partidas".

* **Dados:** `GET /amizades`, `GET /amizades/:id/historico`.