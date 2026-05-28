# E2E Tests — OnionLAB

Testes Playwright que exercitam o fluxo completo do app: registro de usuário,
criação de projeto, adição de test case e steps, validação na tela de detalhes.

---

## ⚡ Quickstart (já instalado)

Se você já rodou `npm install` aqui e `npx playwright install chromium` uma vez,
e o backend + frontend estão de pé, vá direto pra:

```powershell
cd c:\Users\Work\Desktop\ALMonion\e2e

# Credenciais (1ª vez por terminal). Use um admin/editor existente:
$env:TEST_EMAIL = "kayque@teste.com"
$env:TEST_PASSWORD = "123456"

# Inicia a interface visual interativa (recomendado)
npm run test:ui
```

Janela do **Playwright UI** abre. Clica no nome do teste → ▶.

> Não tem `npm` instalado, deu "Missing script: test:ui", ou nunca rodou aqui? Vai pro **Setup do zero** abaixo.

### Outros modos

```powershell
npm test                # headless (rápido, sem janela)
npm run test:headed     # mostra o Chromium executando
npm run test:ui         # interface visual interativa  ← o que você quer pra debugar
npm run report          # abre o HTML report da última execução
```

---

## 🛠 Setup do zero

### 1. Pré-requisitos

Backend e frontend precisam estar rodando localmente antes do teste:

```powershell
# Terminal 1 — backend Node
cd backend-node
npm install
npm start          # http://localhost:3001

# Terminal 2 — backend Python (analytics + uploads, opcional)
cd backend-python
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Terminal 3 — frontend
cd frontend
npm install
npm run dev        # http://localhost:5173
```

> Atalho: na raiz do repo existe `start.ps1` que sobe os três.

### 2. Instalar dependências dos testes

```powershell
cd e2e
npm install
npx playwright install chromium       # baixa o browser (~150 MB) — só na 1ª vez
```

### 3. Rodar os testes

```powershell
# Modo headless (padrão, mais rápido)
npm test

# Modo headed (vendo o Chromium na tela)
npm run test:headed

# Modo UI interativo (debug visual, ótimo pra desenvolver novos cenários)
npm run test:ui

# Ver o relatório HTML após uma execução
npm run report
```

## ⚠️ Importante: roles

O OnionLAB tem 3 roles: `admin`, `editor`, `viewer`. **Apenas admin/editor**
enxerga o link "Novo Projeto" na navbar. Comportamento do registro:

- O **1º usuário** que se registra no sistema vira `admin` automaticamente.
- Os **subsequentes** viram `viewer` (precisam ser promovidos por um admin).

### Dois jeitos de rodar:

**A) Banco recém-criado (fluxo do README "Setup do zero"):** Deixe `TEST_EMAIL`
vazio. O spec registra um usuário novo que vira o admin do sistema.

**B) Banco já com usuários:** Defina `TEST_EMAIL`/`TEST_PASSWORD` apontando
para um admin/editor existente. O spec faz login direto.

Se o spec falhar com a mensagem _"Link Novo Projeto não apareceu"_, é porque o
usuário usado caiu como viewer.

## Como customizar o cenário

Os dados de entrada estão no topo de [`onionlab.spec.ts`](./onionlab.spec.ts), na
seção **"Dados de teste"**. Edite diretamente o arquivo para testar com outros
valores:

```ts
const PROJECT = {
  name:           `Meu Projeto Customizado`,
  proposalNumber: `PROP-2026-001`,
  scopeSummary:   'Escopo que eu quero validar...',
  ktDate:         isoLocalDateTime(daysFromNow(5),  '09:00'),  // 5 dias
  testDate:       isoLocalDateTime(daysFromNow(12), '14:00'),  // 12 dias
};

const TEST_CASE = {
  name: 'Meu fluxo',
  steps: [
    'Primeiro passo',
    'Segundo passo',
    // ...adicione quantos quiser
  ],
};
```

Também dá pra passar valores via variáveis de ambiente (sem alterar o spec):

```powershell
# Opção A — definir no shell
$env:BASE_URL = "http://localhost:5174"      # se o Vite subiu em outra porta
$env:TEST_EMAIL = "admin@onionlab.local"     # usar usuário existente em vez de registrar
$env:TEST_PASSWORD = "MinhaSenha"
npm test

# Opção B — copiar .env.example para .env e editar
cp .env.example .env
# (edite .env com os valores)
npm test
```

| Variável         | Default                                       | Para que serve                                                                 |
|------------------|-----------------------------------------------|--------------------------------------------------------------------------------|
| `BASE_URL`       | `http://localhost:5173`                       | Endereço do frontend                                                           |
| `TEST_EMAIL`     | *(vazio → registra usuário novo a cada run)*  | Se preenchido, faz login em vez de registrar                                   |
| `TEST_PASSWORD`  | `Teste1234!`                                  | Senha usada no login/registro                                                  |
| `TEST_NAME`      | `QA Bot <timestamp>`                          | Nome usado no registro                                                         |

## O que o spec faz, passo a passo

1. **Autenticação** — se `TEST_EMAIL` não estiver definido, registra um usuário
   novo único por execução (`qa.bot.<timestamp>@onionlab.test`).
2. **Abre o wizard Novo Projeto** clicando no link da navbar.
3. **Step 1 — Informações:** preenche nome, número da proposta, datas de KT e
   Testes.
4. **Step 2 — Escopo:** preenche o resumo do escopo e avança.
5. **Step 3 — Test cases:** cria um test case, adiciona N steps via Enter, e
   clica em "Finalizar Projeto".
6. **Verificações:** confirma que a tela de detalhes exibe o nome do projeto,
   o número da proposta, e o test case criado.

## Artefatos

Após cada execução:

- `playwright-report/index.html` — relatório HTML interativo (`npm run report`)
- `test-results/` — screenshots, vídeos (em runs com falha) e traces

## Adicionando novos cenários

Crie um arquivo `<nome>.spec.ts` ao lado do `onionlab.spec.ts`. Bom padrão:

```ts
import { test, expect } from '@playwright/test';

test.describe('Bugs - criação', () => {
  test('cria bug via UI', async ({ page }) => {
    // ...
  });
});
```

Use `page.getByRole`, `getByPlaceholder`, `getByText` em vez de seletores CSS
quando possível — fica menos frágil a mudanças de UI.

## Problemas comuns

- **`Cannot find module '@playwright/test'`** → você esqueceu de rodar `npm install` na pasta `e2e/`.
- **`browserType.launch: Executable doesn't exist`** → faltou rodar `npx playwright install chromium`.
- **Login falha com 401** → o backend não está rodando ou está em outra porta. Cheque `backend-node/src/server.js` (PORT padrão 3001).
- **Timeout no `Próximo` da Step 1** → o backend retornou erro ao criar o projeto. Olhe o log do backend e o vídeo do teste (em `test-results/`).
- **"email já cadastrado"** → você está reusando `TEST_EMAIL` com um email já existente. Deixe `TEST_EMAIL` vazio para gerar único, ou apague o usuário no banco.
