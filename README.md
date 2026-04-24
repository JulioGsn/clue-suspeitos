# **Estratégia Técnica: Clue Suspeitos (Versão Card Game) \- Edição Dupla**

## **1\. Stack Tecnológica Confirmada**

* **Backend:** NestJs (NodeJs).  
* **Banco de Dados:** **MySQL/MariaDB**.  
* **Frontend:** NextJs  
* **Documentação:** Swagger (OpenAPI).

## **2\. Modelagem de Dados (8 Entidades Reais)**

Para garantir as relações obrigatórias (1:1, 1:N, N:N):

1. **Usuario:** Login, senha, perfil (ADMIN/PLAYER).  
2. **PerfilUsuario:** Bio, avatar\_url, total\_vitorias. *\[Relação 1:1 com Usuario\]*  
3. **Partida:** Status (LOBBY, EM\_ANDAMENTO, FINALIZADA), vencedor\_id.  
4. **Jogador:** Vincula Usuario à Partida. *\[Relação N:N entre Usuario e Partida\]*  
5. **Carta:** Cadastro de todas as cartas possíveis (Suspeito, Arma, Local).  
6. **MaoJogador:** Quais cartas cada jogador recebeu no início. *\[Relação 1:N com Jogador\]*  
7. **Pergunta:** Registro de cada palpite: Quem perguntou, para quem, e quais os 2 itens. *\[Relação 1:N com Partida\]*  
8. **MensagemChat:** Mensagens enviadas durante a partida. *\[Relação 1:N com Partida\]*

## **3\. Sugestão de 10 Requisitos Funcionais**

1. **RF01 \- Autenticação:** Cadastro e Login com JWT.  
2. **RF02 \- Gestão de Cartas (Admin):** CRUD de novas cartas (para o jogo avançado).  
3. **RF03 \- Criar Partida:** Usuário cria uma sala (Lobby).  
4. **RF04 \- Entrar em Partida:** Outros usuários entram na sala (até 4 jogadores).  
5. **RF05 \- Sorteio Automático:** O sistema separa 3 cartas para o crime e distribui o resto.  
6. **RF06 \- Realizar Pergunta:** Jogador A escolhe 2 itens e 1 alvo.  
7. **RF07 \- Resposta Automática:** O sistema revela 1 carta ao perguntador se o alvo a possuir.  
8. **RF08 \- Acusação:** Jogador tenta adivinhar o crime. Se errar, é eliminado mas continua respondendo perguntas (conforme regra).  
9. **RF09 \- Bloco de Notas:** Salvar marcações de "Inocente" para não perder o progresso se a página atualizar.  
10. **RF10 \- Ranking:** Visualizar os 5 usuários com mais vitórias.

## **4\. Divisão de Trabalho (Dupla)**

### **Membro A: Especialista em Dados e Segurança**

* Configuração do NestJs e JWT.  
* Modelagem das 8 Entidades (JPA) e Relacionamentos.  
* Criação dos CRUDs (6 entidades no total: Usuario, Perfil, Carta, Partida, Pergunta, Mensagem).  
* Implementação das Queries Personalizadas (Ranking e Histórico).  
* Configuração do Swagger e Profiles (Dev/Prod).

### **Membro B: Especialista em Lógica de Negócio e UI**

* Lógica do Jogo (Sorteio de cartas, validação de turnos, lógica de vitória).  
* Desenvolvimento do Frontend NextJs.  
* Consumo da API REST (Fetch API).  
* Gestão de Estado no Front (Atualizar o "Bloco de Notas" e a "Mão de Cartas").  
* Implementação do Chat e Feedback Visual das jogadas.

## **5\. Cronograma Recomendado**

* **25/04 (Amanhã):** Envio do Status Report (usar esta estrutura).  
* **26/04 a 02/05:** Desenvolvimento do Backend (Membro A) e Protótipo de Telas (Membro B).  
* **03/05 a 07/05:** Integração Front-Back e Lógica do Jogo.  
* **08/05:** Orientações com o professor e ajustes finais.  
* **09/05:** Apresentação.
