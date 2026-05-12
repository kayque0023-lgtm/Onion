# QualiQA — Sistema de Gerenciamento de Testes QA/Dev

## 📋 Stack

| Camada | Tecnologia | Porta |
|--------|-----------|-------|
| Frontend | React + Vite | 5173 |
| Backend API | Node.js + Express | 3001 |
| Analytics/Uploads | Python + FastAPI | 8000 |
| Banco de Dados | SQLite (sql.js) | — |

---

## 📦 Pré-requisitos

Antes de iniciar, certifique-se de ter instalado:

| Ferramenta | Versão mínima | Download |
|------------|--------------|----------|
| **Node.js** | 18+ | https://nodejs.org/ |
| **Python** | 3.10+ | https://www.python.org/downloads/ |
| **Git** | 2.30+ | https://git-scm.com/downloads |

> **Dica:** Durante a instalação do Node.js e Python, marque a opção **"Adicionar ao PATH"**.

---

## 🚀 Como Clonar e Configurar o Projeto

### 1. Clonar o repositório

```bash
git clone https://github.com/kayque0023-lgtm/Onion.git
cd Onion
```

### 2. Instalar dependências do Backend Node.js

```bash
cd backend-node
npm install
cd ..
```

### 3. Instalar dependências do Backend Python

```bash
cd backend-python
pip install -r requirements.txt
cd ..
```

### 4. Instalar dependências do Frontend

```bash
cd frontend
npm install
cd ..
```

---

## ▶️ Como Iniciar o Projeto

### Opção 1: Script automático (recomendado — Windows PowerShell)

Abra o PowerShell na pasta do projeto e execute:

```powershell
.\start.ps1
```

Isso abrirá 3 janelas automaticamente:
- **Node API** → http://localhost:3001
- **Python API** → http://localhost:8000
- **Frontend** → http://localhost:5173

> **Nota:** Se aparecer um erro de permissão, execute primeiro:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```

---

### Opção 2: Iniciar manualmente (qualquer sistema operacional)

Abra **3 terminais** e execute em cada um:

**Terminal 1 — Backend Node.js:**
```bash
cd backend-node
npm run dev
```

**Terminal 2 — Backend Python:**
```bash
cd backend-python
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 3 — Frontend React:**
```bash
cd frontend
npm run dev
```

---

## 🔐 Primeiro Acesso

1. Abra http://localhost:5173
2. Clique em **"Criar conta"**
3. Preencha nome, email e senha (mín. 6 caracteres)
4. Pronto! Você será redirecionado ao Dashboard

---

## 🛑 Como Parar

- **Script automático:** Feche as 3 janelas do PowerShell que foram abertas
- **Manual:** Pressione `Ctrl + C` em cada terminal

---

## 📁 Estrutura do Projeto

```
Onion/
├── backend-node/       # API principal (Express + SQLite)
│   ├── src/
│   │   ├── server.js   # Ponto de entrada
│   │   ├── routes/     # Rotas da API
│   │   └── db/         # Configuração do banco
│   └── package.json
├── backend-python/     # API de analytics/uploads (FastAPI)
│   ├── app/
│   │   └── main.py     # Ponto de entrada
│   ├── uploads/        # Pasta de uploads
│   └── requirements.txt
├── frontend/           # Interface React + Vite
│   ├── src/
│   │   ├── pages/      # Páginas da aplicação
│   │   ├── components/ # Componentes reutilizáveis
│   │   ├── context/    # Contextos React (Auth, etc.)
│   │   └── services/   # Serviços de API
│   └── package.json
├── start.ps1           # Script de inicialização (Windows)
└── README.md
```
