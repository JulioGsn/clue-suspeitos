# Tasks: Detetive - Arquivo Secreto (AI Prompts)

> **Instrução Geral para o Agente de IA:** Para cada tarefa abaixo, crie o código, implemente tratamento de erros, adicione os tipos TypeScript rigorosos e retorne APENAS os arquivos modificados/criados em blocos de código claros.

## Epic 1: Infraestrutura e Setup Base

### [x] Task 1.1: Setup do Backend (NestJS + Dual DB TypeORM)
* **Papel:** Backend Developer.
* **Ação:** Inicializar projeto NestJS. Configurar o TypeORM com duas conexões simultâneas (Main DB e Logs DB) usando MySQL.
* **Arquivos alvo:** `app.module.ts`, `.env`, `database.config.ts`.
* **Requisitos:**
  * Criar esquema do banco nas configs (sincronização automática para ambiente de dev).
  * Integrar Swagger (`@nestjs/swagger`) no `main.ts`.
* **Testes:** Criar `app.controller.spec.ts` garantindo que o servidor sobe e o healthcheck responde 200 OK.

### [ ] Task 1.2: Setup do Frontend (Next.js + Tailwind Noir)
* **Papel:** Frontend Developer.
* **Ação:** Inicializar Next.js 14 (App Router). Configurar o Tailwind CSS com a paleta "Modern Noir" e "Gabinete de Investigação" especificada no Plan.md.
* **Arquivos alvo:** `tailwind.config.ts`, `globals.css`, `layout.tsx`.
* **Requisitos:**
  * Adicionar cores customizadas (`#1a3b2b`, `#2c1e16`, `#f4eedc`, etc.).
  * Instalar `lucide-react` e `framer-motion`.

## Epic 2: Autenticação, Perfis & Seeder (Fatia Vertical)

### [ ] Task 2.1: Backend - Entidades e Auth
* **Papel:** Backend Developer.
* **Ação:** Criar entidades TypeORM (`Usuario`, `Perfil`), lógica de JWT e Auth Guards.
* **Arquivos alvo:** `usuario.entity.ts`, `perfil.entity.ts`, `auth.module.ts`, `auth.service.ts`, `auth.controller.ts`, `jwt.strategy.ts`.
* **Inputs/Outputs:**
  * `POST /auth/register` (body: email, password, username) -> Return JWT.
  * O registro deve hashear a senha (bcrypt) e criar o `Usuario` e o `Perfil` em uma transaction.
* **Testes:** Criar `auth.service.spec.ts` cobrindo sucesso no registro e falha no login com senha incorreta.

### [ ] Task 2.2: Backend - Seeder de Dados
* **Papel:** Backend Developer.
* **Ação:** Criar um script de Seed para popular o Main DB.
* **Arquivos alvo:** `seed.service.ts`, `cartas.seed.ts`.
* **Requisitos:**
  * Inserir 1 usuário Admin padrão (`admin@detetive.com`, senha `admin123`, role `ADMIN`).
  * Inserir as 21 cartas base (6 suspeitos, 6 armas, 9 locais) na tabela `cartas`.

### [ ] Task 2.3: Frontend - Telas de Login/Registro
* **Papel:** Frontend Developer.
* **Ação:** Criar a UI de autenticação conectada à API do NestJS.
* **Arquivos alvo:** `app/(auth)/login/page.tsx`, `app/(auth)/register/page.tsx`, `services/api.ts`.
* **Requisitos:**
  * Estilizar conforme a paleta Dark Noir.
  * Salvar JWT nos cookies (`js-cookie` ou Next-Auth).
  * Sem `alert()`. Usar toasts para erros (ex: Sonner).

## Epic 3: Auditoria e Gestão de Cartas (Fatia Vertical)

### [ ] Task 3.1: Backend - Interceptor de Auditoria e CRUD Cartas
* **Papel:** Backend Developer.
* **Ação:** Criar tabela `Auditoria` (Logs DB) e Interceptor Global. Criar CRUD de Cartas com upload local.
* **Arquivos alvo:** `audit.interceptor.ts`, `cartas.controller.ts`, `cartas.service.ts`.
* **Requisitos:**
  * O Interceptor deve interceptar rotas `@Audit()` e salvar o payload novo/velho no Logs DB de forma assíncrona.
  * Endpoint `POST /admin/cartas` deve usar `Multer` para salvar a imagem em `/public/uploads/cards`.
* **Testes:** Criar `cartas.service.spec.ts` mockando o upload de arquivos.

### [ ] Task 3.2: Frontend - Painel Admin
* **Papel:** Frontend Developer.
* **Ação:** Criar Tela 7 (Gestão de Cartas).
* **Arquivos alvo:** `app/(admin)/cartas/page.tsx`, `components/ui/Dropzone.tsx`.
* **Requisitos:**
  * Data Grid mostrando as cartas.
  * Modal para criar nova carta com input de arquivo (Dropzone).

## Epic 4: Lobby e Salas (Fatia Vertical)

### [ ] Task 4.1: Backend - APIs de Partida (Lobby)
* **Papel:** Backend Developer.
* **Ação:** Criar entidades `Partida`, `Jogador` e endpoints REST de criação de sala.
* **Arquivos alvo:** `partida.entity.ts`, `jogador.entity.ts`, `partidas.controller.ts`, `partidas.service.ts`.
* **Requisitos:**
  * `POST /partidas`: Cria sala, gera código UUID ou 6 chars (se privada), define host.
  * `POST /partidas/:id/entrar`: Associa o Perfil logado a um slot de Jogador da partida.
  * `POST /partidas/:id/add-bot`: Preenche um slot com Bot.
* **Testes:** Testar limite máximo de 4 jogadores no `partidas.service.spec.ts`.

### [ ] Task 4.2: Frontend - Dashboard e Tela de Lobby
* **Papel:** Frontend Developer.
* **Ação:** Implementar as Telas 2 (Dashboard) e 3 (Lobby).
* **Arquivos alvo:** `app/(dashboard)/home/page.tsx`, `app/(game)/lobby/[id]/page.tsx`.
* **Requisitos:**
  * Dashboard lista as salas abertas usando requisição fetch regular.
  * Tela de Lobby exibe avatares conectados e botão "Adicionar Bot" visível apenas para o Host.

## Epic 5: Core Game Loop (WebSockets - Sockets Vertical)

### [ ] Task 5.1: Backend - Gateway e Distribuição de Cartas
* **Papel:** Backend Developer.
* **Ação:** Criar o `GameGateway` e a lógica de sorteio.
* **Arquivos alvo:** `game.gateway.ts`, `game.engine.service.ts`, `mao_cartas.entity.ts`.
* **Requisitos:**
  * Evento `start_game` (emitido pelo host).
  * O serviço deve separar 1 suspeito, 1 arma e 1 local aleatórios e gravar no registro da Partida (oculto).
  * Embaralhar e distribuir o restante e emitir o evento `game_started` com a mão de cada jogador.

### [ ] Task 5.2: Backend - Turnos, Interrogatório e Bots
* **Papel:** Backend Developer.
* **Ação:** Lógica de responder interrogatório.
* **Arquivos alvo:** `game.gateway.ts`, `perguntas.entity.ts`.
* **Requisitos:**
  * Processar evento `Phoneout`. Verificar se o `target` possui as cartas.
  * Lógica Difícil (IA): Se o target for bot e dificuldade=DIFICIL, verificar a tabela `perguntas` para tentar mostrar uma carta já revelada antes para o mesmo Asker.
  * Emitir `callout_result`.

### [ ] Task 5.3: Frontend - Mesa de Jogo (In-Game Board)
* **Papel:** Frontend Developer.
* **Ação:** Criar Tela 4 (A Mesa).
* **Arquivos alvo:** `app/(game)/partida/[id]/page.tsx`, `hooks/useSocket.ts`.
* **Requisitos:**
  * Renderizar a Mão no rodapé. Animações Framer Motion.
  * Modais customizados para "Fazer Pergunta" e "Responder Pergunta".

## Epic 6: Auxiliares e Encerramento (UI & Polimento)

### [ ] Task 6.1: Fullstack - Bloco de Notas (Gaveta Lateral Mobile)
* **Papel:** Full-stack Developer.
* **Ação:** Criar o Bloco de Notas interativo.
* **Frontend:** Componente `SlideInDrawer` que empurra a tela (Desktop) ou sobrepõe (Mobile).
* **Backend:** Ouvir o socket `update_notebook` e salvar o JSON no campo `notebook_data` da tabela `jogadores`.

### [ ] Task 6.2: Fullstack - Acusação, Chat e Vitória
* **Papel:** Full-stack Developer.
* **Ação:** Finalizar o fluxo de vitória.
* **Arquivos alvo:** `game.gateway.ts`, `mensagens_chat.entity.ts`, `app/(game)/partida/[id]/page.tsx`.
* **Requisitos:**
  * `make_accusation`: Se correto, atualizar status da partida, registrar vencedor e emitir `accusation_result`.
  * Frontend deve exibir a Tela de Vitória (Overlay) impedindo novas ações.
  * Chat efêmero (UI no canto inferior com botões de frases prontas).