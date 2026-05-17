# 💈 Dom Barbershop | Barber Manager

![Status](https://img.shields.io/badge/Status-Concluído-success)
![Docker](https://img.shields.io/badge/Docker-Microservices-blue)
![Python](https://img.shields.io/badge/Backend-Python_FastAPI-green)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-blueviolet)

O **Barber Manager** é um sistema web completo de gestão desenvolvido para barbearias de alto padrão. O seu objetivo é unificar o controle de clientes, o catálogo de serviços e a agenda de marcações em uma plataforma moderna, intuitiva e altamente resiliente.

Este projeto foi construído para atender aos requisitos práticos da disciplina de Arquitetura de Software, adotando o paradigma de **Microsserviços** sob o padrão arquitetural **MVC (Model-View-Controller)**.

---

## 🏗️ Arquitetura do Sistema

Em vez de uma abordagem monolítica tradicional, o ecossistema do Barber Manager foi segmentado em microsserviços totalmente independentes e isolados através de contêineres Docker. 

O sistema implementa o padrão **Database-per-Service**, garantindo que cada domínio da aplicação possua a sua própria persistência de dados.

### 🧩 Mapa de Microsserviços
| Serviço | Porta (Host) | Banco de Dados | Porta DB (Host) |
| :--- | :---: | :--- | :---: |
| **Serviços API** | `8000` | `db_servicos` | `5432` |
| **Clientes API** | `8001` | `db_clientes` | `5433` |
| **Agendamentos API** | `8002` | `db_agendamentos` | `5434` |

### 🌟 Destaques Arquiteturais:
* **Desacoplamento Total:** Uma falha ou manutenção no banco de *Clientes* não interrompe a operação da API de *Agendamentos*.
* **Isolamento e Orquestração:** Todo o ambiente local é gerido via `docker-compose`, permitindo que a aplicação suba de forma padronizada em qualquer máquina.
* **Auto-Healing (Resiliência):** Todos os contêineres utilizam políticas de reinicialização automática (`restart: always`), garantindo alta disponibilidade diante de anomalias internas.

---

## 🛠️ Tecnologias Utilizadas

**Frontend (View)**
* HTML5 & CSS3 (Design responsivo e paleta premium)
* JavaScript (ES6) com Fetch API centralizada
* Flatpickr (Biblioteca de seleção de data/hora)

**Backend (Controller & Model)**
* Python 3
* FastAPI / Uvicorn (APIs RESTful assíncronas e de alta performance)
* SQLAlchemy (Mapeamento Objeto-Relacional - ORM)

**Infraestrutura & Banco de Dados**
* Docker & Docker Compose
* PostgreSQL (Imagens baseadas em Alpine Linux para otimização de recursos)

---

## 🚀 Como Configurar e Executar o Projeto

Para testar o projeto localmente, o ambiente requer apenas o Docker instalado. Siga o passo a passo abaixo:

### Pré-requisitos
1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução.
2. Navegador web atualizado.

### Passo 1: Clonar o Repositório
Abra o terminal e clone o projeto:
```bash
git clone https://github.com/viniscastro/barber-manager.git
cd barber-manager
```

### Passo 2: Subir a Infraestrutura
Na raiz do projeto (onde está o arquivo `docker-compose.yml`), execute o comando para construir e iniciar os 6 contêineres em segundo plano:
```bash
docker compose up -d
```
> *Dica: Aguarde alguns instantes na primeira execução para que o Docker baixe as imagens Alpine e compile o backend.*

### Passo 3: Acessar o Sistema
Com os contêineres em execução (`docker ps` para verificar), você pode iniciar a interface de duas formas:
* **Automática (Windows):** Dê um duplo clique no script `Iniciar_Barber_Manager.bat` localizado na raiz do projeto.
* **Manual:** Abra o arquivo `frontend/login.html` no seu navegador.

---

## 🔄 Funcionalidades e CRUD

O sistema cobre integralmente as 4 operações de persistência (Criação, Leitura, Atualização e Deleção) sobre as três entidades do domínio:

👥 **1. Clientes**
* Cadastro com Nome, Telefone e E-mail.
* Validação e formatação automática de WhatsApp.
* Edição cadastral e exclusão de registros.

✂️ **2. Serviços**
* Gestão do catálogo da barbearia.
* Inserção de novos cortes, edição de valores e remoção de serviços descontinuados.

📅 **3. Agendamentos (Dashboard)**
* Cruzamento de dados entre Clientes, Serviços e Profissionais.
* Regras de negócio: bloqueio de agendamento duplo para o mesmo barbeiro no mesmo horário.
* Alteração de status (Pendente, Concluído, Faltou).

---

Markdown
## 🧪 Teste Prático de Resiliência (Auto-Healing)

O sistema foi desenhado para tolerar falhas. O ecossistema possui a diretiva `restart: always` em todos os serviços. Para simular um crash interno e validar a autorrecuperação automatizada, execute a sequência de passos abaixo:

**1. Acesse o terminal interativo do contêiner da API de agendamentos:**

```bash
docker exec -it agendamentos_api sh
```

**2. Já dentro do ambiente isolado do contêiner, force a finalização do processo principal (PID 1):**

```Bash
kill 1
```
**3. A conexão cairá. No seu terminal principal, verifique que o Docker reiniciou a API automaticamente:**

```Bash
docker ps
```

**Resultado Esperado: O painel mostrará que o contêiner agendamentos_api possui o status Up 1 second ou Up 2 seconds, comprovando em tempo real que o Docker detectou a morte do processo e subiu uma nova instância limpa de forma totalmente autônoma, mantendo a aplicação viva.**

## 👥 Desenvolvedores

* **Arthur** - Arquitetura Backend, Docker, Bancos de Dados.
* **Vinícius** - Desenvolvimento Frontend, Integração de APIs e UI/UX.
