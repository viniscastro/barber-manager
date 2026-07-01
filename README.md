# 💈 Dom Barbershop | Barber Manager

![Status](https://img.shields.io/badge/Status-Concluído-success)
![Docker](https://img.shields.io/badge/Docker-Microservices-blue)
![Python](https://img.shields.io/badge/Backend-Python_FastAPI-green)
![AWS](https://img.shields.io/badge/Cloud-AWS_EC2-orange)
![Nginx](https://img.shields.io/badge/Gateway-Nginx-brightgreen)

O **Barber Manager** é um sistema web de gestão para barbearias de alto padrão. O sistema unifica o controle de clientes, catálogo de serviços e agenda de marcações em uma plataforma resiliente, utilizando microsserviços isolados.

---

## 🏗️ Arquitetura do Sistema

O ecossistema utiliza o padrão **Database-per-Service** com persistência isolada. O tráfego externo é gerenciado por um **Nginx API Gateway**, que atua como ponto único de entrada, roteando as requisições para os microsserviços internos.

### 🧩 Mapa de Microsserviços
| Serviço | Rota (API Gateway) | Banco de Dados |
| :--- | :---: | :--- |
| **Serviços API** | `/api/servicos/` | `db_servicos` |
| **Clientes API** | `/api/clientes/` | `db_clientes` |
| **Agendamentos API** | `/api/agendamentos/` | `db_agendamentos` |

### 🌟 Destaques Arquiteturais:
* **API Gateway (Nginx):** Centralização de rotas, controle de CORS e balanceamento, garantindo que o front-end acesse uma única porta (`80`).
* **Cloud Ready:** Arquitetura validada em produção (AWS EC2) com IP Elástico (IP fixo).
* **Auto-Healing:** Contêineres com política `restart: always`, garantindo recuperação automática de falhas.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend:** HTML5, CSS3, JavaScript (Fetch API).
* **Backend:** Python 3, FastAPI, SQLAlchemy (ORM).
* **Infraestrutura:** Docker, Docker Compose, Nginx (Gateway).
* **Banco de Dados:** PostgreSQL (Alpine Linux).

---

## 🚀 Como Executar

### Desenvolvimento Local
1. Clone o repositório: `git clone https://github.com/viniscastro/barber-manager.git`
2. Na raiz, execute: `docker compose up -d`
3. Acesse via `http://localhost`.

### Deploy em Produção (AWS)
O sistema está configurado para rodar via AWS EC2 com um Nginx Gateway configurado para receber requisições na porta 80.
1. Configure o Security Group da instância para permitir tráfego nas portas 80 (HTTP) e 22 (SSH).
2. Utilize **IP Elástico** para garantir a persistência do endereço público.
3. Certifique-se de que o arquivo `nginx.conf` esteja mapeado corretamente para gerenciar as rotas dos serviços backend.

---

## 🔄 Funcionalidades e CRUD

* 👥 **Clientes:** Cadastro, validação de WhatsApp, exclusão e gestão de perfil.
* ✂️ **Serviços:** Catálogo dinâmico de cortes e procedimentos.
* 📅 **Agendamentos:** Dashboard inteligente com validação de horários e status (Pendente/Concluído/Faltou).

---

## 🧪 Teste de Resiliência
O sistema possui a diretiva `restart: always`.
**Teste:**
1. `docker exec -it <nome_do_container> sh`
2. `kill 1`
3. Observe que o Docker recria a instância do contêiner instantaneamente, mantendo a aplicação online sem intervenção manual.

---

## 👥 Desenvolvedores

* **Arthur** - Arquitetura Backend, Infraestrutura, Cloud & Bancos de Dados.
* **Vinícius** - Desenvolvimento Frontend, Integração de APIs e UI/UX.
