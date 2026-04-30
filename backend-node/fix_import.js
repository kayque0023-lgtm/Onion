const { getDb, runSql, saveDb, queryOne } = require('./src/database/setup');

const text = `01 - Títulos originados no faturamento aparecem no monitor com portador correto
- Emitir notas fiscais no módulo de faturamento para clientes com portador definido no cadastro de clientes
- Aguardar a integração das duplicatas no Contas a Receber
- Abrir o monitor de envio de cobrança escritural
- Verificar os títulos listados e seus respectivos portadores (Santander, Itaú ou Bradesco)
- Todos os títulos gerados pelo faturamento aparecem no monitor com o portador já atribuído conforme cadastro de clientes, sem necessidade de ajuste manual pelo financeiro (resultado esperado)
02 - Nosso-Número gerado e mantido pelo padrão Datasul
- Emitir duplicata no faturamento e aguardar integração no Contas a Receber
- Verificar o campo Nosso-Número na duplicata integrada
- Abrir o monitor e localizar o título
- Nosso-Número está preenchido conforme geração padrão do Datasul, sem alteração, e segue para o banco exatamente como gerado na integração da duplicata (resultado esperado)
03 - Filtros do monitor restringem corretamente os títulos exibidos
- Abrir o monitor de envio de cobrança escritural
- Aplicar filtro por instituição financeira (ex.: somente Bradesco)
- Aplicar filtro por cliente específico
- Aplicar filtro por data de vencimento
- Aplicar filtro por tipo de movimentação (ex.: Implantação)
- Cada filtro reduz os títulos exibidos no grid e a combinação de filtros mostra somente os títulos que atendem a todos os critérios aplicados ao mesmo tempo (resultado esperado)
04 - Filtro por situação exibe somente títulos registrados, pendentes ou liquidados
- Abrir o monitor com a base carregada
- Filtrar exibindo somente títulos com situação Implantação (pendentes de envio)
- Alterar filtro para Entrada Confirmada (registrados no banco)
- Alterar filtro para liquidados
- Cada situação exibe exclusivamente os títulos correspondentes, sem misturar status diferentes no grid (resultado esperado)
05 - Envio de título de implantação para o banco via monitor
- Abrir o monitor e localizar um título com situação Implantação ainda não enviado
- Selecionar o título no grid
- Clicar no botão Enviar
- Confirmar o envio
- Aguardar o processamento pelo banco dentro da janela informada pela instituição
- O título é enviado via JSON para a instituição financeira, a ocorrência bancária é gravada nas tabelas do Datasul (movto_ocor_bcia), o log de envio registra data, hora e retorno, e o status do título no monitor passa para Entrada Confirmada após retorno do banco (resultado esperado)
06 - Envio em massa de múltiplos títulos pelo monitor
- Abrir o monitor e aplicar filtro por instituição financeira desejada
- Selecionar múltiplos títulos com situação Implantação
- Clicar em Enviar
- Aguardar processamento e conferir o resultado no monitor
- Todos os títulos selecionados são enviados em lote para a instituição financeira, cada um recebe log individual de envio, os processados com sucesso atualizam status para Entrada Confirmada e os recusados ficam identificados para correção (resultado esperado)
07 - Título recusado pelo banco é sinalizado para correção
- Enviar um título com alguma informação incorreta (ex.: dados de cliente divergentes)
- Aguardar o retorno da instituição financeira
- Verificar o status do título no monitor
- O título recusado é destacado no monitor com indicação de erro, o log registra o motivo da recusa informado pelo banco, e o título fica disponível para que o usuário corrija a informação e reenvie manualmente (resultado esperado)
08 - Temporizador automático atualiza status dos títulos no monitor
- Abrir o monitor de envio
- Habilitar o temporizador automático de atualização
- Definir o período de atualização desejado
- Aguardar o intervalo configurado
- O monitor busca automaticamente o status atualizado dos títulos junto à instituição financeira no período configurado, refletindo eventuais confirmações ou recusas sem que o usuário precise acionar manualmente (resultado esperado)
09 - Atualização manual de status via botão no monitor
- Abrir o monitor sem ativar o temporizador automático
- Aguardar tempo suficiente para que o banco tenha processado algum título
- Clicar no botão de atualização manual
- O monitor busca o retorno atualizado da instituição financeira imediatamente e reflete os novos status no grid, equivalendo ao resultado da atualização automática porém acionado pelo usuário (resultado esperado)
10 - Ocorrência de baixa gerada pelo padrão Datasul aparece no monitor para envio
- Com um título já registrado no banco (flag Cobrança Escritural marcado no Datasul), realizar uma baixa pelo processo padrão do Contas a Receber
- Abrir o monitor de cobrança
- Verificar se a ocorrência de Pedido de Baixa aparece disponível para envio
- A ocorrência de baixa é listada no monitor com situação Pedido de Baixa, aguardando que o usuário acione o envio manualmente, sem automação por trigger (resultado esperado)
11 - Concessão de abatimento gerada pelo padrão aparece no monitor para envio
- Com título já registrado no banco, registrar uma concessão de abatimento pelo processo padrão do Contas a Receber
- Abrir o monitor de cobrança
- Verificar se a ocorrência aparece disponível para envio
- Clicar em Enviar para a ocorrência de Concessão de Abatimento
- A ocorrência é enviada via API para o banco, o log é gravado com os dados do envio e o status no monitor é atualizado conforme retorno da instituição financeira (resultado esperado)
12 - Alteração de vencimento de título registrado no banco
- Com título já registrado no banco, alterar o vencimento pelo processo padrão do Datasul
- Abrir o monitor e localizar a ocorrência de alteração de vencimento gerada
- Selecionar a ocorrência e clicar em Enviar
- A ocorrência de alteração de vencimento é enviada ao banco via API, o log registra o envio e o retorno, e o título no Datasul permanece com o flag de Cobrança Escritural marcado, sensibilizando as tabelas movto_ocor_bcia conforme padrão (resultado esperado)
13 - Envio de título de espécie NX (nota denegada) pelo monitor
- Garantir que existe título de espécie NX (relacionado a nota denegada) gerado no Contas a Receber
- Abrir o monitor e filtrar por tipo de movimentação ou espécie NX
- Selecionar o título e clicar em Enviar
- O título NX é enviado via API para a instituição financeira correta conforme portador, o log de envio é gravado e o status é atualizado no monitor após retorno do banco (resultado esperado)
14 - Envio de título de espécie MU (multa contratual) pelo monitor
- Garantir que existe título de espécie MU gerado no Contas a Receber
- Abrir o monitor e localizar o título MU
- Selecionar e clicar em Enviar
- O título de multa contratual é enviado corretamente à instituição financeira via API, log é gravado e status reflete o retorno do banco no monitor (resultado esperado)
15 - Envio de título de espécie TR (taxa de recusa logística) pelo monitor
- Garantir que existe título de espécie TR gerado no Contas a Receber
- Abrir o monitor e localizar o título TR
- Selecionar e clicar em Enviar
- O título de taxa de recusa é enviado corretamente à instituição financeira via API, log é gravado e status reflete o retorno do banco no monitor (resultado esperado)
16 - Log de envio registra todas as operações realizadas pelo monitor
- Executar previamente envios de implantação, baixa, abatimento e alteração de vencimento pelo monitor
- Acessar o log específico de envio do monitor
- Consultar por título, por data e por instituição financeira
- Cada operação possui log com data, hora, usuário, título, tipo de ocorrência, JSON enviado, retorno recebido da instituição financeira e status resultante, consultável por título, data e banco (resultado esperado)
17 - Liquidação de título via monitor com validação de data
- Localizar no monitor um título com retorno de liquidação do banco
- Verificar que o monitor exibe data de liquidação e data de crédito informadas pela instituição financeira
- Selecionar o título liquidado e acionar a baixa pelo monitor
- O monitor valida que a data de liquidação e a data de crédito estão coerentes antes de permitir a baixa no Datasul, e a baixa é efetivada no Contas a Receber somente quando as datas estiverem consistentes (resultado esperado)
18 - Liquidação em massa para bancos que oferecem API de listagem
- Abrir o monitor e filtrar títulos com situação de liquidação para um banco que oferece API de listagem (ex.: Itaú ou Bradesco)
- Selecionar múltiplos títulos liquidados
- Acionar a baixa em massa
- Os títulos com liquidação confirmada são baixados em lote no Contas a Receber, cada um com log individual, e títulos com divergência de data ficam retidos para análise manual (resultado esperado)
19 - Santander com consulta título a título no monitor
- Abrir o monitor e filtrar títulos do portador Santander
- Acionar a consulta de status dos títulos
- Verificar que o retorno ocorre individualmente para cada título
- O monitor consulta o Santander título a título via API, atualiza o status de cada um separadamente e não realiza liquidação em massa, respeitando a limitação da API desse banco (resultado esperado)
20 - Títulos não processados ficam visíveis no monitor para gestão
- Enviar um lote de títulos pelo monitor
- Aguardar o retorno dentro da janela de processamento do banco
- Filtrar no monitor por títulos ainda não processados (sem retorno)
- O monitor exibe claramente todos os títulos enviados que ainda não receberam retorno do banco, permitindo ao usuário identificar pendências e tomar ação sem necessidade de consulta externa ao sistema (resultado esperado)`;

async function run() {
  await getDb();
  
  // Find project 3 or find by name
  let projectId = 3;
  const project = queryOne('SELECT id FROM projects WHERE name LIKE ?', ['%F729%']);
  if (project) projectId = project.id;
  
  console.log(`Using Project ID: ${projectId}`);
  
  const lines = text.split('\n');
  const testCases = [];
  let currentTestCase = null;
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    if (line.match(/^\d{2}\s+-/)) {
      currentTestCase = { name: line, steps: [] };
      testCases.push(currentTestCase);
    } else if (line.startsWith('-')) {
      if (currentTestCase) currentTestCase.steps.push(line.substring(1).trim());
    } else {
      if (currentTestCase && currentTestCase.steps.length > 0) {
        currentTestCase.steps[currentTestCase.steps.length - 1] += " " + line;
      }
    }
  }
  
  // Clear existing sprints for this project to avoid duplicates
  runSql('DELETE FROM sprints WHERE project_id = ?', [projectId]);
  
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const sprintRes = runSql(
      'INSERT INTO sprints (project_id, name, status, order_index) VALUES (?, ?, ?, ?)',
      [projectId, tc.name, "pending_approval", i]
    );
    const sprintId = sprintRes.lastInsertRowid;
    for (let j = 0; j < tc.steps.length; j++) {
      runSql(
        'INSERT INTO steps (sprint_id, description, status, order_index) VALUES (?, ?, ?, ?)',
        [sprintId, tc.steps[j], "pending", j]
      );
    }
  }
  
  saveDb();
  console.log('Import complete');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
