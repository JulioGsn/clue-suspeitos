# Spec: Detetive - Arquivo Secreto

## 1. Visão Geral
O sistema é um jogo multiplayer de dedução baseado em turnos. O objetivo é descobrir o Suspeito, a Arma e o Local escondidos no "Arquivo Confidencial". O sistema gerencia o ciclo de vida das partidas, desde a criação do lobby com bots até a resolução do crime, utilizando WebSockets para comunicação em tempo real. Inclui um sistema de auditoria externa para logs de banco de dados.

## 2. User Stories & Fluxos

### Epic 1: Autenticação & Perfil (RF01)
- **Story 1.1:** Como usuário, quero me cadastrar com email e senha (Usuario) e configurar meu nome de exibição e avatar (Perfil).
- **Story 1.2:** Como usuário, quero ver meu histórico de vitórias/derrotas e gerenciar minha lista de amigos (Roadmap).

### Epic 2: Gestão de Salas & Lobby (RF03, RF04)
- **Story 2.1:** Como host, quero criar uma sala pública ou privada, escolhendo a dificuldade e a quantidade de bots.
- **Story 2.2:** Como usuário, quero ver uma lista de salas públicas ordenadas por tempo de criação.

### Epic 3: Core Gameplay (RF05, RF06, RF07, RF08)
- **Story 3.1:** Como jogador, quero interrogar outros jogadores. O sistema deve processar a resposta automaticamente (Normal: Aleatório / Difícil: Estratégico com Memória).
- **Story 3.2:** Como jogador, quero usar um Bloco de Notas (Manual ou Automático) que persiste mesmo se eu atualizar a página (RF09).

### Epic 4: Administração & Auditoria (RF02)
- **Story 4.1:** Como administrador, quero cadastrar novas cartas fazendo upload das imagens diretamente para o servidor.
- **Story 4.2:** Como gestor do sistema, quero que toda alteração no banco de dados principal seja registrada em um banco de logs independente.

## 3. Requisitos Funcionais (RFs)
- **RF01 - Autenticação:** Cadastro e Login utilizando JWT.
- **RF02 - Gestão de Cartas (Admin):** CRUD de cartas com upload de imagens para o servidor.
- **RF03 - Criar Partida:** Criação de Lobby (Público/Privado) com slots para humanos e bots.
- **RF04 - Entrar em Partida:** Entrada via lista ou link/código.
- **RF05 - Sorteio e Distribuição:** Animação inicial e revelação de cartas sobressalentes.
- **RF06 - Realizar Pergunta:** Registro de palpite (Asker, Target, 2 Itens).
- **RF07 - Resposta Automática:** Revelação de carta baseada na lógica de dificuldade da sala.
- **RF08 - Acusação:** Mecânica de vitória ou eliminação (bot passivo).
- **RF09 - Bloco de Notas:** Persistência de marcações por jogador.
- **RF10 - Ranking:** Top 5 usuários com mais vitórias.

## 4. Modelo de Dados (Conceitual)
### Banco de Dados Principal (Main DB)
- **Usuario:** id, email, password_hash, role.
- **Perfil:** id, user_id, username, avatar_url, vitorias, derrotas.
- **Carta:** id, nome, tipo, image_url.
- **Partida:** id, codigo, host_id, tipo, status, dificuldade, vencedor_id.
- **Jogador:** id, partida_id, perfil_id, is_bot, is_eliminated, notebook_data.
- **MaoDeCartas:** id, jogador_id, carta_id.
- **Pergunta:** id, partida_id, asker_id, target_id, item1_id, item2_id, revealed_card_id.
- **MensagemChat:** id, partida_id, perfil_id, predefined_text_id.

### Banco de Dados de Auditoria (Logs DB)
- **LogAuditoria:** id, timestamp, tabela_afetada, operacao, payload_anterior, payload_novo, usuario_responsavel_id.

## 5. Regras de Negócio & Casos de Borda
- **Auditoria Obrigatória:** Nenhuma transação no Main DB deve ser concluída sem o disparo do log para o Logs DB.
- **Chat Efêmero:** Mensagens de chat são armazenadas apenas para consulta durante a sessão ativa da partida.
- **Upload de Imagens:** O servidor deve validar o tipo de arquivo e redimensionar imagens de cartas para manter a performance.