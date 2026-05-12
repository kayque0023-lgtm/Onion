const { getDb, saveDb } = require('./src/database/setup.js');

async function main() {
  const db = await getDb();

  // Find user
  const userRes = db.exec('SELECT id FROM users WHERE role = "admin" LIMIT 1');
  if (!userRes.length || !userRes[0].values.length) {
    console.log("No admin user found");
    process.exit(1);
  }
  const userId = userRes[0].values[0][0];
  console.log("User ID:", userId);

  // Find or create project ADENDO - GSD-259552 - BOLETO GNRE
  let projectId;
  const projRes = db.exec("SELECT id FROM projects WHERE name LIKE '%GSD-259552%' OR name LIKE '%GNRE%'");
  if (projRes.length && projRes[0].values.length) {
    projectId = projRes[0].values[0][0];
    console.log("Projeto GSD-259552 já existe, id:", projectId);
    // Delete existing sprints to re-seed cleanly
    db.run('DELETE FROM steps WHERE sprint_id IN (SELECT id FROM sprints WHERE project_id = ?)', [projectId]);
    db.run('DELETE FROM sprints WHERE project_id = ?', [projectId]);
    console.log("Sprints anteriores removidos.");
  } else {
    db.run('INSERT INTO projects (name, user_id, status) VALUES (?, ?, ?)', 
      ["ADENDO - GSD-259552 - BOLETO GNRE", userId, "active"]);
    const idRes = db.exec('SELECT last_insert_rowid() as id');
    projectId = idRes[0].values[0][0];
    console.log("Projeto criado, id:", projectId);
  }

  const testCases = [
    {
      name: "Nota Fiscal do GNRE com dados financeiros completos para emissão",
      steps: [
        "Acessar a rotina Fiscal do GNRE no Escrita",
        "Conferir os campos do portador, modalidade, agência com o conta corrente com o CNPJ do contribuinte",
        "Validar info do portador, modalidade, agência e débito e conta corrente e dados parametrizados conforme preenchimento da NF do Protheus ou de acordo com layout",
        "NF apresenta portador, modalidades, agência + débito e conta corrente + dados parametrizados conforme preenchimento ou de acordo com layout do portador selecionado na NF do Escrita com base em seus próprios dados (resultado esperado)"
      ]
    },
    {
      name: "NF do GNRE sem portador previamente preenchido e emissão do boleto",
      steps: [
        "Localizar uma NF no Escrita sem portador definido",
        "Acessar o componente ES0077 onde importa o código observado",
        "Validar a busca/captura de parâmetros da portadoria da NF pelo atração manual/auto pelo sistema/módulo portador NF do escrita configurado no ES0077",
        "O boleto utiliza parâmetros do ES0077 como portador padrão quando a NF do Escrita não possui portador configurado (resultado esperado)"
      ]
    },
    {
      name: "Origem dos parâmetros padrões do ES0077a para a Nota Fiscal",
      steps: [
        "Confirmar a existência dos parâmetros genéricos no componente ES0077E no portador 2",
        "Selecionar a NF de Escrita com portador 'Nenhum' e diferentes bancos e portador(es) genéricos e valores de NF(V), ignorando o NF(H) (X)",
        "Validar info do portador, modalidade, agência e o débito da NF(V) da portador do ES0077E que o parâmetro padronizados de layout existe",
        "O sistema assume os parâmetros do ES0077E como fonte padrão quando a NF não contém portador definido (resultado esperado)"
      ]
    },
    {
      name: "Cadastro do layout do banco Itaú no programa ES1W101",
      steps: [
        "Acessar o programa ES1W101",
        "Selecionar banco Itaú e os campos do portador Itaú do layout",
        "Adicionar o código do portador Itaú ao layout",
        "Configurar a parametrização para uso no gerador e impressão",
        "Salvar e publicar",
        "Layout do Itaú apresenta no ES1W101, Itaú vinculado ao portador e campos e descrições aparecem no grid adequadamente para validação (resultado esperado)"
      ]
    },
    {
      name: "Cadastro do layout do banco do Brasil no programa ES1W101",
      steps: [
        "Acessar o programa ES1W101",
        "Selecionar o código do produto Banco do Brasil",
        "Configurar os campos de produto e NF no layout",
        "Selecionar a conta/agência do Banco do Brasil",
        "Layout do Banco do Brasil está cadastrado no programa ES1W101 e acessível para portadoria (resultado esperado)"
      ]
    },
    {
      name: "Consistência dos itens layouts (Endereço, Itaú e BB) no ES1W101",
      steps: [
        "Montar o layout #ES1W101 e cadastrar os modelos do ES1W101",
        "Validar na tela de consistências que os layouts apresentam os itens esperados",
        "Listar os layouts: Itaú e BB existente no ES1W101 com o Combo/Selecionados",
        "Utilizar as validações do ES1W101 e incluir as telas do portador com o layout apresentado pelo combo",
        "Verificar que o ES1W101 apresenta corretamente as inconsistências com campo e mensagem específica de erro quando encontradas (resultado esperado)"
      ]
    },
    {
      name: "Impressão do boleto GNRE pelo ES0077 com portador Itaú",
      steps: [
        "Acessar o programa ES0077",
        "Selecionar a NF GNRE para o portador Itaú",
        "Confirmar os termos do portador Itaú no layout",
        "O gerando GNRE ES0077 até o extra de layout Itaú calculando com dígito no RS10131, até os dados computados dos títulos do Escrita são formatados em boleto impresso conforme layout e banco Itaú selecionado anteriormente (resultado esperado)"
      ]
    },
    {
      name: "Impressão do boleto GNRE pelo ES0077 com portador BB",
      steps: [
        "Selecionar a NF do GNRE no portador BB do portador do Brasil",
        "Acessar o programa ES0077",
        "O gerando do ES0077 até os dados do BB e o portador BB do ES0077E, com os dados integrados como esperados no layout de portador BB, gere e apresente o boleto formatado conforme o layout do Banco do Brasil (resultado esperado)"
      ]
    },
    {
      name: "Impressão do boleto GNRE pelo ES0077 com portador Endereço mantém comportamento atual",
      steps: [
        "Acessar o programa ES0077",
        "Selecionar uma NF GNRE com portador (Endereço) mantendo o comportamento anterior",
        "Confirmar a coleta de dados e campo do portador selecionado anteriormente mantendo os dados conforme definição",
        "Layout e títulos presentes no boleto gerado pelo portador com (Endereço) são mantidos pela versão anterior do layout quando se utiliza o campo de portador na NF com (Endereço) (resultado esperado)"
      ]
    },
    {
      name: "ES0077 exporta múltiplos layouts em uma mesma execução",
      steps: [
        "Ligar o drill de Mi e gerando no ES1W101 até simulação de portador contendo a display por NF para selecionar os boletos com portadores GNRE diferentes para mesmo portador que seriam processados na exportação final",
        "Validar que a exportação gera o ES0077 na geração com exportação de relatório do portador do resultado final de dois arquivos com portadores distintos e na impressão, separados com campo e mostrando nome do portador",
        "Dada as NFs e o seu portador Itaú e BB selecionados, ambos o ES0077 irão processar/gerar de forma com layout individual, conforme o portador de cada NF como nova origem de portadoria (resultado esperado)"
      ]
    },
    {
      name: "Homologação do boleto Itaú pelo ES0072",
      steps: [
        "Acessar o programa ES0072",
        "Acessar a programação ES0072",
        "Selecionar o boleto GNRE de título DANTE BB produzido anteriormente",
        "Realizar o processo de homologação do boleto",
        "Boleto do Itaú com layout conforme regras do banco Itaú é homologado e validado com sucesso pelo ES0072 (resultado esperado)"
      ]
    },
    {
      name: "Homologação do boleto BB pelo ES0072",
      steps: [
        "Acessar o programa ES0072",
        "Selecionar o boleto GNRE com portador BB do ES0077",
        "Realizar o processo de validação e homologação",
        "Boleto do BB com layout conforme regras do banco é homologado e validado com sucesso pelo ES0072 (resultado esperado)"
      ]
    },
    {
      name: "Geração do ACR pelo ES0074 com dados da NF para portador Itaú",
      steps: [
        "Acessar o programa ES0074",
        "Acessar a programação ES1W101",
        "Selecionar o boleto do ES0077 até extra de layout com o Itaú vinculado pelo portador utilizado na NF(V) do layout financeiro",
        "Gerar os registros de título com dados incluídos e portador",
        "Título do ACR da NF registrado no ES0074 com portador Itaú vinculado com dados corretos e registros da empresa, portadora e seus dados de Itaú (resultado esperado)"
      ]
    },
    {
      name: "Geração da APB pelo ES0077A com dados da NF para portador Itaú",
      steps: [
        "Acessar o programa ES0077A",
        "Selecionar o boleto GNRE do portador Itaú e gerar a GNRE automaticamente o arquivo do boleto",
        "A APB é gerada com portador Itaú, e o arquivo financeiro reflete o layout do Itaú e os dados do título são exportados com o layout financeiro e portador Itaú (resultado esperado)"
      ]
    },
    {
      name: "Geração do ACR e APB pelo ES0077A com dados da NF para portador BB",
      steps: [
        "Acessar o programa ES0077A",
        "Acessar o registro e selecionar o portador BB no layout",
        "Gerar o ACR e a APB para o portador BB",
        "ACR e APB são gerados pelo ES0077A com portador BB e dados corretos conforme NF e layout do banco BB (resultado esperado)"
      ]
    },
    {
      name: "Geração do código de barra do boleto Itaú",
      steps: [
        "Acessar a programação do GNRE no portador Itaú e gerar os dados do código de barras",
        "Validar se o GNRE gera código de barras correto e válido do portador Itaú. Validar códigos específicos de barras com valores reais",
        "NF do GNRE com dados preenchidos no portador Itaú gera código de barras válido e correto (resultado esperado)"
      ]
    },
    {
      name: "Geração do código de barra conforme regras do banco Itaú",
      steps: [
        "Acessar a programação e verificar as regras específicas do banco Itaú para geração de barras, faturista e impressão conforme orientações do procedimento padrão banco Itaú",
        "Validar que os campos do portador e dados estão respeitando o procedimento padrão",
        "Código de barras gerado é formatado conforme as regras específicas do banco Itaú (resultado esperado)"
      ]
    },
    {
      name: "NF em agência da conta mantém bloqueio de geração financeira",
      steps: [
        "Localizar uma NF de GNRE no portador com agência bloqueada ou conta restrita na rotina do ES0077",
        "Tentar gerar o boleto para a NF com dados que contenham bloqueio",
        "O gerando do boleto deve identificar e alertar que conta/agência da NF possui restrições, impedindo a geração financeira e o envio para o portador (resultado esperado)"
      ]
    },
    {
      name: "Alteração de portador na NF reflete em nova emissão de boleto",
      steps: [
        "Localizar a NF com portador A e alterar para portador B no cadastro do Escrita",
        "Gerar novamente o boleto pela tela de emissão",
        "O novo boleto emitido reflete o portador B atualizado, modificando o layout conforme layout do portador alterado da NF (resultado esperado)"
      ]
    },
    {
      name: "Processamento em lote de NQA com portadora mestre pelo ES0077A",
      steps: [
        "Acessar o programa ES0077A",
        "Selecionar lote de NFs com portador que apontem para a portadora mestre",
        "Processar em lote a geração de boletos",
        "Todos os boletos são gerados conforme portador e layout correto para cada NF no lote (resultado esperado)"
      ]
    },
    {
      name: "Geração correta de impressão do Itaú financeiro gerado",
      steps: [
        "Acessar o ES0077A e selecionar o portador Itaú",
        "Gerar a impressão formatada do boleto",
        "A impressão do boleto financeiro do Itaú é gerada com sucesso, com layout correto e formatação visual adequada (resultado esperado)"
      ]
    }
  ];

  let inserted = 0;
  for (const tc of testCases) {
    db.run('INSERT INTO sprints (project_id, name, status) VALUES (?, ?, ?)', 
      [projectId, tc.name, 'pending_approval']);
    const sprintIdRes = db.exec('SELECT last_insert_rowid() as id');
    const sprintId = sprintIdRes[0].values[0][0];
    
    for (const step of tc.steps) {
      db.run('INSERT INTO steps (sprint_id, description) VALUES (?, ?)', [sprintId, step.trim()]);
    }
    inserted++;
    console.log(`  [${inserted}/${testCases.length}] ${tc.name.substring(0, 70)}...`);
  }

  saveDb();
  console.log("\n✅ Sucesso! Inseridos " + inserted + " test cases no projeto ADENDO - GSD-259552 - BOLETO GNRE (id=" + projectId + ")");
  
  // Verify
  const verifyRes = db.exec('SELECT COUNT(*) as cnt FROM sprints WHERE project_id = ?', [projectId]);
  console.log("Verificação: " + verifyRes[0].values[0][0] + " sprints no projeto.");
  
  const stepsRes = db.exec('SELECT COUNT(*) as cnt FROM steps WHERE sprint_id IN (SELECT id FROM sprints WHERE project_id = ?)', [projectId]);
  console.log("Verificação: " + stepsRes[0].values[0][0] + " steps no total.");
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
