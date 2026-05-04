# Divisão de Tarefas Backend

## Proposta de Divisão (2 devs backend, trabalho assíncrono)

A maneira que funciona melhor para trabalho assíncrono em projeto pequeno é **dividir por domínio vertical**, não por camada (REST vs WebSocket). Camadas geram acoplamento constante; domínios geram contratos discutidos uma vez e depois cada um trabalha em paz.

A Task 1.1 (setup do NestJS + dual DB) já está concluída, então o ponto de partida é igual para os dois. A divisão proposta:

**Dev A — "Identidade & Catálogo"**
Cuida de tudo que envolve quem é o usuário e o que existe no jogo enquanto entidade fixa: autenticação JWT, perfis, seeder, CRUD de cartas com upload, e o **interceptor de auditoria global** (que é a peça mais transversal do backend e precisa de um dono claro para não virar terra de ninguém). É um escopo bem REST/segurança/dados, com testes unitários previsíveis.

**Dev B — "Partidas & Game Engine"**
Cuida do que é dinâmico e em tempo real: lobby (criação de salas, entrar, adicionar bot), o `GameGateway` do Socket.io, sorteio das cartas do crime, distribuição de mãos, lógica de turnos, interrogatório, IA do bot em modo Difícil, acusação e fim de partida. É o coração do jogo e tem complexidade de estado/concorrência.

**Por que essa divisão funciona bem assíncrona:**
- Os pontos de contato são poucos e contratuais: Dev B consome o JWT/Guards do Dev A e referencia a entidade `Carta` (cujo schema o Dev A define no seeder). Depois disso, podem ir em paralelo por semanas.
- Dev A tem trabalho mais "amarelo" (CRUD, segurança, testes diretos) — bom para quem prefere ritmo previsível.
- Dev B tem trabalho mais "vermelho" (estado distribuído, sockets, lógica de jogo) — bom para quem topa pensar mais e debugar mais.
- O esforço fica equilibrado: ~3 tasks principais + meia fullstack para cada lado (chat/acusação para A, notebook em tempo real para B, ambos pelo viés backend).

**Riscos a mitigar logo na semana 1 (combinar antes de cada um sair codando):**
1. **Schema das entidades compartilhadas** (`Usuario`, `Perfil`, `Carta`) — Dev A escreve, Dev B revisa antes do merge.
2. **Contrato do Auth Guard para WebSocket** — como o Dev B vai autenticar conexões socket usando o JWT do Dev A.
3. **Convenção do `@Audit()` decorator** — Dev B vai precisar aplicá-lo em algumas rotas de partidas, então precisa estar pronto cedo (priorizar Task 3.1 do Dev A).

---

## Dev A — Identidade, Catálogo & Auditoria

Foco: REST, persistência, segurança. Estabelece os contratos que o Dev B vai consumir.

### A1 — Entidades base + Auth (Task 2.1)
**Prioridade:** Crítica — bloqueia o Dev B.
**Entregáveis:**
- Entidades `Usuario`, `Perfil` com TypeORM (Main DB).
- `AuthModule` com Passport-JWT, `JwtStrategy`, guards (`JwtAuthGuard`, `RolesGuard`).
- `POST /auth/register`: hash bcrypt + cria `Usuario` + `Perfil` em transaction.
- `POST /auth/login`: retorna JWT.
- `JwtAuthGuard` exportado de forma reutilizável (Dev B precisa para WebSocket).
- Testes: `auth.service.spec.ts` (registro OK, login com senha errada).

### A2 — Seeder (Task 2.2)
**Depende de:** A1 (precisa das entidades).
**Entregáveis:**
- `seed.service.ts` + script CLI (ex: `pnpm seed`).
- Admin padrão `admin@detetive.com` / `admin123` com role `ADMIN`.
- 21 cartas base: 6 suspeitos, 6 armas, 9 locais (com `image_url` placeholder).
- Idempotente — rodar 2x não duplica.

### A3 — Audit Interceptor + CRUD Cartas (Task 3.1)
**Prioridade:** Alta — Dev B vai precisar do `@Audit()` para auditar partidas.
**Entregáveis:**
- Conexão `LogsDB` (verificar se já está no setup) + entidade `Auditoria`.
- Decorator `@Audit()` + `AuditInterceptor` global: captura payload antes/depois de rotas decoradas e grava no LogsDB de forma assíncrona (não bloquear request).
- `CartasModule`: CRUD completo (`POST/PUT/DELETE /admin/cartas`) protegido por `RolesGuard('ADMIN')`.
- Upload com Multer em `/public/uploads/cards`.
- Testes: `cartas.service.spec.ts` mockando upload.

### A4 — Perfil & Ranking
**Entregáveis:**
- `GET /perfil/me` (dados do perfil autenticado).
- `GET /perfil/ranking` (top 5 por vitórias).
- Service `PerfilService.incrementarVitoria(perfilId)` / `incrementarDerrota` — Dev B chama isso quando partida termina.

### A5 — Persistência de Notebook & Chat (parte backend de 6.1 e 6.2)
**Depende de:** B2 (gateway existindo).
**Entregáveis:**
- Listener no gateway para `update_notebook` → salva JSON em `jogadores.notebook_data`.
- Persistir `mensagens_chat` quando o gateway recebe `send_chat`.
- `GET /partidas/:id/checkpoint`: devolve `notebook_data` do jogador para reconexão.

> **Observação:** A5 mexe em arquivos do Dev B (gateway). Combinar PRs em sequência ou Dev B expõe hooks que A plug.

---

## Dev B — Partidas & Game Engine

Foco: Sockets, lógica de jogo, estado em tempo real. Pode adiantar trabalho mesmo sem A1 pronto.

### B0 — Trabalho de adiantamento (paralelo a A1)
Antes de A1 estar mergeado, dá para começar:
- Entidades `Partida`, `Jogador`, `MaoCartas`, `Perguntas`, `MensagensChat`.
- Estrutura de pastas `partidas/`, `gateways/game/`.
- Stub do `GameGateway` sem auth.
*Não mergear até A1 estar disponível para integração de auth.*

### B1 — APIs de Partida / Lobby (Task 4.1)
**Depende de:** A1 (JWT).
**Entregáveis:**
- `POST /partidas`: cria sala, gera código 6 chars (privadas) ou só ID (públicas), define host pelo JWT.
- `GET /partidas`: lista salas em status `LOBBY`.
- `GET /partidas/:id`: detalhes + lista de jogadores.
- `POST /partidas/:id/entrar`: associa perfil a slot livre (validar limite de 4).
- `POST /partidas/:id/add-bot`: só host, cria `Jogador` com `is_bot=true`.
- Testes: limite de 4 jogadores; só host adiciona bot.

### B2 — Game Gateway + Distribuição (Task 5.1)
**Depende de:** A2 (cartas no banco), B1 (partidas), A1 (JWT no handshake do socket).
**Entregáveis:**
- `GameGateway` no namespace `/game` com auth JWT no handshake.
- Evento `join_room` → entra na room do socket.io da partida.
- Evento `start_game` (só host): sorteia 1 suspeito + 1 arma + 1 local, grava em `partidas.suspeito_crime_id` etc. (oculto), embaralha o resto e cria `mao_cartas` para cada jogador.
- Emite `game_started` para cada jogador **só com a própria mão** (privacidade por design).
- `lobby_updated` ao entrar/sair.

### B3 — Turnos, Interrogatório & IA Bot (Task 5.2)
**Depende de:** B2.
**Entregáveis:**
- Controle de turnos com `ordem_turno` e timeout (emite `turn_changed`).
- Evento `make_callout`: valida turno, verifica se target tem alguma das cartas, escolhe carta a revelar, grava em `perguntas`, emite `callout_result` privado para asker e target (broadcast só do fato, sem a carta).
- **Lógica de IA do bot:**
  - **Normal:** revela carta aleatória dentre as que tem.
  - **Difícil:** consulta `perguntas` — se já revelou alguma das cartas para o mesmo asker antes, repete a mesma (memory mode).
- Bot responde automaticamente após N segundos se jogador humano não responder (Constitution requisita).

### B4 — Acusação, Chat & Encerramento (Task 6.2 backend)
**Depende de:** B3, A4 (`incrementarVitoria/Derrota`).
**Entregáveis:**
- Evento `make_accusation`: compara com `partidas.suspeito_crime_id/arma/local`.
  - Se correto: status `FINALIZADA`, `vencedor_id` setado, chama `PerfilService.incrementarVitoria` para vencedor e `incrementarDerrota` para os outros, emite `accusation_result { is_correct: true, ... }`.
  - Se errado: marca jogador como `is_eliminated=true`, emite `accusation_result { is_correct: false }` e segue partida.
- Evento `send_chat`: emite `chat_message_received` no namespace + dispara hook A5 para persistir.
- Limpar `mensagens_chat` da partida quando partida termina.

### B5 — Reconexão (parte sockets)
**Depende de:** B2.
**Entregáveis:**
- Ao receber `join_room` numa partida `EM_ANDAMENTO`, reenviar estado (mão, turno atual, jogadores eliminados) só para o socket reconectado.
- Integrar com `GET /partidas/:id/checkpoint` do Dev A para o frontend recuperar notebook.

---

## Ordem sugerida (dependências críticas)

```
Sem 1:  A1 (Auth) ────────────┐         B0 (entidades, stubs)
                              ↓
Sem 2:  A2 (Seeder)           ├──→ B1 (Lobby)
        A3 (Audit + Cartas) ──┘
Sem 3:  A4 (Perfil/Ranking)        B2 (Gateway + Distribuição)
Sem 4:                              B3 (Turnos + Bot IA)
Sem 5:  A5 (Persist Notebook/Chat) B4 (Acusação + Chat)
Sem 6:  Polimento/testes integrados  B5 (Reconexão)
```

## Pontos de sincronia (combinar 1x e seguir)

1. **Schema final de `Usuario`/`Perfil`/`Carta`** — A1/A2 fecha, B revisa antes de mergear.
2. **Como autenticar socket** — A1 expõe utilitário (`extractJwtFromHandshake`), B usa.
3. **Contrato do `@Audit()`** — A3 documenta, B aplica nas rotas críticas de partidas.
4. **Interface `PerfilService.incrementarVitoria`** — A4 expõe, B chama.
