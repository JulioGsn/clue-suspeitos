# Project Constitution: Detetive - Arquivo Secreto (Web Edition)

## 1. Vision & North Star
Transpor a experiência tátil e psicológica do jogo de cartas "Clue Suspeitos" para uma plataforma web moderna. O foco é a dedução lógica e o blefe em tempo real, garantindo partidas rápidas e seguras.

## 2. Core Values (Maxims)
1. **Fidelidade e Consistência:** A lógica de interrogação deve ser impecável. O sistema deve sustentar o "Memory Mode" em dificuldades altas para evitar que informações sigilosas vazem sem necessidade.
2. **Sincronização em Tempo Real:** O servidor (NestJS) é o árbitro absoluto. Eventos de Socket.io devem manter todos os clientes sincronizados.
3. **Privacidade por Design:** Jogadores nunca recebem via rede dados que não deveriam ver (ex: cartas dos oponentes).
4. **Comunicação Controlada:** O uso exclusivo de frases pré-definidas elimina toxicidade e mantém o foco na estratégia.
5. **Acessibilidade de Auxílio:** Oferecer diferentes níveis de suporte investigativo (Bloco de Notas) para atender desde jogadores casuais até veteranos.

## 3. Scope Definition (The "What")

### MVP (Fase 1)
- **Sistema de Usuários:** Login JWT, perfil e estatísticas.
- **Lobby:**
  - Salas Públicas: Listadas por ordem de criação (mais antiga para mais recente).
  - Salas Privadas: Acesso via link e código gerado automaticamente.
- **Gameplay (Modo Clássico):**
  - Fluxo de Interrogação com resposta inteligente (Normal vs Difícil).
  - Bloco de Notas: 3 modos (Sem bloco, Manual, Automático).
  - Abandono: Bot assume após alguns segundos de inatividade.
- **Comunicação:** Sistema de Chat por categorias (Cumprimentos, Estratégia, Reações, Tempo, Fim).

### Roadmap (Futuro)
- **Modo Avançado:** Inclusão de novas cartas (15 no total).
- **Expansão de Lobby:** Suporte para até 5 jogadores.
- **Sistema de Skins/Loja:** Personalização de avatares e versos de cartas.
- **Amizades:** Sistema de adicionar amigos e ver histórico.

## 4. Constraints (Restrições)
- **Stack:** NestJS + Next.js + Socket.io + MySQL/MariaDB.
- **Resiliência:** Jogadores eliminados ou desconectados devem continuar respondendo automaticamente para não invalidar a partida alheia.