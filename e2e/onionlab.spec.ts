import { test, expect, Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────
// Dados de teste — ALTERE AQUI se quiser exercitar valores diferentes.
// Tudo é parametrizável via env (.env), com fallback hardcoded para começar rápido.
// ─────────────────────────────────────────────────────────────────────────
const TIMESTAMP = Date.now();

const TEST_USER = {
  name:     process.env.TEST_NAME     || `QA Bot ${TIMESTAMP}`,
  // Se TEST_EMAIL estiver vazio, geramos um único por execução pra evitar colisão.
  email:    process.env.TEST_EMAIL    || `qa.bot.${TIMESTAMP}@onionlab.test`,
  password: process.env.TEST_PASSWORD || 'Teste1234!',
};

const PROJECT = {
  name:            `Projeto E2E ${TIMESTAMP}`,
  proposalNumber:  `E2E-${TIMESTAMP}`,
  scopeSummary:    'Cenário automatizado de QA: cobertura ponta a ponta do fluxo de criação.',
  // Datas relativas a hoje — ajuste se precisar testar cores de proximidade
  ktDate:          isoLocalDateTime(daysFromNow(10), '09:00'),   // próximo (amarelo)
  testDate:        isoLocalDateTime(daysFromNow(20), '14:30'),   // próximo (amarelo)
};

// Lista de test cases — adicione/remova quantos quiser.
// Cada item vira um card "Test Case" no Step 3 do wizard, com seus respectivos steps.
const TEST_CASES = [
  {
    name:  'Login - fluxo feliz',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 2',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 3',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 4',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 5',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 6',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
  {
    name:  'Login - fluxo feliz 7',
    steps: [
      'Abrir a página inicial da aplicação',
      'Preencher email com user@x.com',
      'Preencher senha com 12345',
      'Clicar no botão Entrar',
      'Validar que o dashboard é exibido',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function daysFromNow(d: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date;
}

// Converte Date + hora "HH:mm" no formato exigido pelo <input type="datetime-local">
function isoLocalDateTime(date: Date, time: string): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${time}`;
}

async function registerOrLogin(page: Page) {
  await page.goto('/');
  // Se já estiver logado por sessão prévia, o app redireciona pro dashboard — verifica isso.
  if (await page.getByText('Sistema de Gerenciamento de Testes').isVisible({ timeout: 2000 }).catch(() => false)) {
    return; // já dentro do app
  }

  // Tela de login. Se TEST_EMAIL veio do env, tenta logar; senão registra um novo.
  if (process.env.TEST_EMAIL) {
    await page.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
    await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
    await page.getByRole('button', { name: /entrar/i }).click();
  } else {
    // Alterna pra modo "Criar conta" (link no rodapé do formulário)
    await page.getByRole('link', { name: /criar conta|cadastre-se/i }).first().click();
    await page.getByPlaceholder('Seu nome').fill(TEST_USER.name);
    await page.getByPlaceholder('seu@email.com').fill(TEST_USER.email);
    await page.getByPlaceholder('••••••••').fill(TEST_USER.password);
    await page.getByRole('button', { name: /criar conta/i }).click();
  }

  // Aguarda o app entrar — usuário precisa ser admin/editor para ver "Novo Projeto".
  // Viewers (default no register) não enxergam o link — nesse caso, falha cedo com
  // mensagem útil ao invés de timeout cego.
  const novoProjeto = page.getByRole('link', { name: /novo projeto/i });
  await expect(novoProjeto, [
    'Link "Novo Projeto" não apareceu após autenticação.',
    'Causa provável: o usuário tem role "viewer".',
    'Soluções:',
    '  1) Use TEST_EMAIL/TEST_PASSWORD apontando para um admin existente, OU',
    '  2) Garanta que esta é a 1ª conta do sistema (o 1º registro vira admin automaticamente).',
  ].join('\n')).toBeVisible({ timeout: 15_000 });
}

// ─────────────────────────────────────────────────────────────────────────
// Spec
// ─────────────────────────────────────────────────────────────────────────
test.describe('OnionLAB — fluxo completo', () => {
  test('cria usuário, projeto, test cases e steps', async ({ page }) => {

    // 1) Registro/Login
    await test.step('Autenticação', async () => {
      await registerOrLogin(page);
    });

    // 2) Abre o wizard de Novo Projeto
    await test.step('Abrir wizard Novo Projeto', async () => {
      await page.getByRole('link', { name: /novo projeto/i }).click();
      await expect(page.getByRole('heading', { name: /novo projeto/i })).toBeVisible();
    });

    // 3) Step 1 — Informações
    await test.step('Preencher informações do projeto (Step 1)', async () => {
      await page.locator('#project-name').fill(PROJECT.name);
      await page.locator('#project-proposal').fill(PROJECT.proposalNumber);

      // Datas (datetime-local). Os inputs não têm id, mas estão dentro de labels.
      const ktInput = page.locator('input[type="datetime-local"]').nth(0);
      const testInput = page.locator('input[type="datetime-local"]').nth(1);
      await ktInput.fill(PROJECT.ktDate);
      await testInput.fill(PROJECT.testDate);

      await page.getByRole('button', { name: /próximo/i }).click();
    });

    // 4) Step 2 — Escopo
    await test.step('Preencher escopo (Step 2)', async () => {
      await page.getByPlaceholder(/descreva o escopo/i).fill(PROJECT.scopeSummary);
      await page.getByRole('button', { name: /próximo/i }).click();
    });

    // 5) Step 3 — Test cases e steps (vários!)
    await test.step('Adicionar test cases e steps (Step 3)', async () => {
      for (const tc of TEST_CASES) {
        // Cria o test case
        await page.getByPlaceholder(/nome do test case/i).fill(tc.name);
        await page.getByRole('button', { name: /adicionar/i }).click();

        // Confirma que o card desse test case apareceu
        await expect(page.getByText(tc.name, { exact: false })).toBeVisible();

        // Pega o input de step DESSE test case (o último adicionado fica visível no fundo).
        // .last() porque novos cards entram embaixo da lista.
        const stepInput = page.getByPlaceholder(/descreva o passo de teste/i).last();
        for (const desc of tc.steps) {
          await stepInput.fill(desc);
          await stepInput.press('Enter');
          // Espera o step entrar na lista antes do próximo Enter
          await expect(page.getByText(desc, { exact: false }).first()).toBeVisible();
          // Confirma que o input ficou limpo
          await expect(stepInput).toHaveValue('');
        }
      }

      await page.getByRole('button', { name: /finalizar projeto/i }).click();
    });

    // 6) Verificações na tela de detalhes
    await test.step('Verificar projeto criado', async () => {
      await expect(page.getByRole('heading', { name: new RegExp(PROJECT.name, 'i') })).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(PROJECT.proposalNumber)).toBeVisible();
      // Confirma que TODOS os test cases aparecem na tela de detalhes
      for (const tc of TEST_CASES) {
        await expect(page.getByText(tc.name).first()).toBeVisible();
      }
    });
  });
});
