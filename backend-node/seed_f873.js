const { getDb, saveDb } = require('./src/database/setup.js');

async function main() {
  const db = await getDb();

  // Find user
  const userRes = db.exec('SELECT id FROM users LIMIT 1');
  if (!userRes.length || !userRes[0].values.length) {
    console.log("No user found");
    process.exit(1);
  }
  const userId = userRes[0].values[0][0];
  console.log("User ID:", userId);

  // Find or create project F873
  let projectId;
  const projRes = db.exec("SELECT id FROM projects WHERE name LIKE '%F873%'");
  if (projRes.length && projRes[0].values.length) {
    projectId = projRes[0].values[0][0];
    console.log("Projeto F873 já existe, id:", projectId);
    // Delete existing sprints to re-seed cleanly
    db.run('DELETE FROM steps WHERE sprint_id IN (SELECT id FROM sprints WHERE project_id = ?)', [projectId]);
    db.run('DELETE FROM sprints WHERE project_id = ?', [projectId]);
    console.log("Sprints anteriores removidos.");
  } else {
    db.run('INSERT INTO projects (name, user_id, status) VALUES (?, ?, ?)', 
      ["F873 - Substituição do PyAutoGUI - Automação Financeira", userId, "active"]);
    const idRes = db.exec('SELECT last_insert_rowid() as id');
    projectId = idRes[0].values[0][0];
    console.log("Projeto criado, id:", projectId);
  }

  const testCases = [
    {
      name: "Importação de extrato bancário interativo com multi-abas direto via Cnab",
      steps: [
        "Acessar a página de Liquidação de Extrato Interativo",
        "Selecionar a opção de importação de extrato bancário",
        "Carregar a planilha (cartão_x_conciliado) pela interface do programa",
        "Aguardar o carregamento e processamento do arquivo",
        "O extrato é importado fisicamente, sem a rotina do PyAutoGUI, com dependência da digitação da planilha de mapeamento de layouts (Resultado esperado)"
      ]
    },
    {
      name: "Limpeza automática dos textos indesejados nas linhas de importação",
      steps: [
        "Importar uma planilha completa com lançamentos e as informações indesejadas (Ex.: FLS RECIBO... EMISSAO...) de variadas formas",
        "Aguardar o processamento automático da limpeza dos campos pelo programa",
        "Conferir o lançamento no grid de importação",
        "O sistema remove automaticamente os textos indesejados conforme regras parametrizadas, deixando apenas as informações relevantes (CPF/CNPJ, nome do pagador, valor) na lista para análise de identificação (resultado esperado)"
      ]
    },
    {
      name: "Leitura automática de CPF/CNPJ dos lançamentos",
      steps: [
        "Importar planilha contendo a informação de CPF/CNPJ embutido em texto livre",
        "Aguardar o processamento da extração",
        "Conferir os campos de identificação preenchidos pelo programa",
        "O sistema identifica e extrai automaticamente o CPF e CNPJ da linha/histórico de detalhes, validando a formatação estrutural e sua origem, mesmo quando o número está cercado por texto descritivo (resultado esperado)"
      ]
    },
    {
      name: "Filtragem inicial por espécie e exclusão de tipos não processáveis",
      steps: [
        "Importar planilha com lançamentos de diversas espécies (PIX, TED, DOC, CARTÃO, DÉBITO TARIFA e ESTORNO DE TARIFAS)",
        "Aguardar o processamento e a filtragem automática",
        "Conferir os lançamentos mantidos/removidos pela rotina",
        "O sistema mantêm apenas os lançamentos de espécies processáveis, como autorizações, PIX, e DOC, excluindo os estornos e tarifas não-relevantes com sucesso (resultado esperado)"
      ]
    },
    {
      name: "Conversão e validação de valores monetários",
      steps: [
        "Importar planilha com valores com formatação contábil (negativo com D) ou padrão",
        "Analisar os valores convertidos e a padronização de sinais",
        "Conferir os valores formatados na importação",
        "Valores em formato contábil são lidos e tratados (como valores negativos), formas convencionais e sinais numéricos se tornam válidos e corretamente formatados (resultado esperado)"
      ]
    },
    {
      name: "Consulta automática da Filial baseada na raiz do CNPJ/CPF",
      steps: [
        "Com o campo CPF/CNPJ preenchido em branco, testar a recepção com dados em aberto",
        "Aguardar a consulta direta via módulo ACP do programa",
        "Conferir as filiais vinculadas aos retornos",
        "Programa consulta no banco de dados diretamente na ACP, sem a necessidade da planilha_base_cep, e retorna a filial do cliente com os dados correspondentes e informações de contato do cliente (resultado esperado)"
      ]
    },
    {
      name: "Correspondência automática Nível 1 - CNPJ + Valor exato",
      steps: [
        "Garantir que exista título em aberto na ACP com CNPJ X e valor R$ 1.500,00",
        "Importar extrato contendo lançamento com o mesmo CNPJ X e valor R$ 1.500,00",
        "Acionar a identificação automática",
        "Conferir o resultado para esse lançamento",
        "Sistema identifica o título associado pelo cruzamento exato de CNPJ e valor (nível 1 de validação) e marca a correspondência como confirmada para liquidação (resultado esperado)"
      ]
    },
    {
      name: "Correspondência automática Nível 2 - Apenas raiz CNPJ + Valor",
      steps: [
        "Garantir título em aberto para filial com CNPJ raiz X (sem ser Matriz) e idêntico lançamento com filial diferente",
        "Importar extrato com lançamento (valor X, CNPJ de outra filial da mesma placa ou raiz diferente)",
        "Acionar a identificação automática",
        "Sistema identifica a correspondência pela raiz da placa/matriz (dígitos do CNPJ raiz e valor) e sugere a correspondência para confirmação do usuário (resultado esperado)"
      ]
    },
    {
      name: "Correspondência Nível 3 - Apenas raiz da matriz",
      steps: [
        "Garantir título em aberto para cliente com certa raiz de radical/matriz na ACP",
        "Importar extrato com lançamento sem CNPJ identificado, mas com nome de pagador similar à razão social do cliente",
        "Acionar a identificação automática",
        "Sistema cruza a palavra do arranjo/texto da conta com o CNPJ e sugere o título correspondente para análise do usuário, com indicação visual de que é correspondência por similaridade (resultado esperado)"
      ]
    },
    {
      name: "Correspondência Nível 4 - Apenas valor igual",
      steps: [
        "Garantir título em aberto com valor único na ACP (R$ 8.432,10)",
        "Importar extrato com lançamento de mesmo valor, mas sem CNPJ ou nome correspondente",
        "Acionar a identificação automática",
        "Sistema identifica que o valor X só existe num título, estabelece a correspondência mas trava a baixa para confirmação manual do usuário de que se quer liquidar (resultado esperado)"
      ]
    },
    {
      name: "Lançamento sem nenhuma correspondência permanece pendente",
      steps: [
        "Importar extrato com lançamento cujo CNPJ, nome e valor não batem com nenhum título em aberto na ACP",
        "Acionar a identificação automática",
        "Conferir o status do lançamento",
        "Lançamento é mantido como não identificado, fica visível na interface para tratamento manual e não avança para liquidação automática (resultado esperado)"
      ]
    },
    {
      name: "Alto Highlight na listagem para confirmação dos títulos não-identificados",
      steps: [
        "Importar extrato e acionar a identificação automática",
        "Acessar a aba \"Digitação de Receita\" com os resultados",
        "Conferir a lista e os não-identificados (fundo/borda cor vermelha)",
        "Selecionar opção de exibir por cliente para verificar a estrutura de faturamento de novos boletos",
        "Lançamentos não identificados ficam destacados com cores fortes e visíveis na lista (fundo vermelho), orientando o usuário a verificar a divergência de dados ou providenciar acerto manual, sem ir para a tela de liquidação (resultado esperado)"
      ]
    },
    {
      name: "Ajuste manual da correspondência antes da liquidação",
      steps: [
        "Após a identificação automática, abrir a aba Digitação de Receita",
        "Localizar um lançamento identificado com Nível 2 (similaridade) ou Nível 4 (apenas valor)",
        "Alterar manualmente o título correspondente, vinculando-o a outro em aberto do mesmo cliente",
        "Salvar a alteração",
        "O sistema aceita o ajuste manual da correspondência, atualiza o vínculo do lançamento/extrato e passa a mantê-lo registrado na alteração para envio na geração do lote (resultado esperado)"
      ]
    },
    {
      name: "Inclusão manual de novo documento para baixa com não-identificados",
      steps: [
        "Acessar a aba Digitação de Receita com lançamentos pendentes",
        "Acionar a opção de inclusão por cliente",
        "Adicionar um título/conta a um lançamento não identificado que não foi preenchido pela identificação",
        "Salvar o registro",
        "O novo título referenciado é incluído na lista de baixas do cliente, ficando disponível para confirmação e segue para o lote de liquidação como se fosse do nível zero (resultado esperado)"
      ]
    },
    {
      name: "Lançamento de adiantamento (AD) para não-específico",
      steps: [
        "Importar extrato contendo crédito sem título em aberto correspondente e sem CNPJ atrelado na base",
        "Acessar a aba ND (Não Identificados)",
        "Selecionar o crédito como Adiantamento, informando detalhes como data, valor recebido, cliente principal, espécie e histórico",
        "Configurar a conta de adiantamento",
        "Confirmar o registro",
        "Sistema registra o adiantamento (AD) no módulo ACP, vincula a uma conta de compensação/adiantamento da matriz e mantém log da operação com identificação do usuário responsável (resultado esperado)"
      ]
    },
    {
      name: "Geração de lote de liquidação (baixamento) para envio",
      steps: [
        "Após a identificação e ajustes na aba Digitação de Receita, conferir a lista final de títulos a baixar",
        "Acionar a confirmação do processamento",
        "Aguardar a geração do lote de transação no módulo ACP",
        "Conferir o lote gerado e o status dos títulos",
        "Sistema gera lote de liquidação com sucesso na ACP, efetua as baixas dos títulos confirmados, e registra na observação que o processo foi realizado via automação com identificação do usuário e os IDs de conciliação do extrato consolidado (resultado esperado)"
      ]
    },
    {
      name: "Cancelamento do processamento exige nova importação",
      steps: [
        "Importar extrato e acionar a identificação automática",
        "Acessar a aba Digitação de Receita com os títulos identificados",
        "Cancelar o processamento sem confirmar a liquidação",
        "Tentar acessar novamente a mesma lista processada",
        "Sistema descarta os registros não confirmados, exige nova importação do extrato e não mantém os dados temporários em cache/sessão, garantindo a integridade do processo (resultado esperado)"
      ]
    },
    {
      name: "Validação de permissões na baixa de recebimentos na ACP",
      steps: [
        "Logar com usuário sem permissão de liquidação na ACP",
        "Importar extrato e acionar a identificação automática",
        "Tentar confirmar a geração do lote de liquidação",
        "Sistema valida as permissões do usuário no momento da liquidação, bloqueia o processo com mensagem de erro amigável (falta de permissão para baixar recibos na entidade X), e não gera o lote na ACP (resultado esperado)"
      ]
    },
    {
      name: "Identificação automática de empresas (CNPJ) filiais na estrutura",
      steps: [
        "Garantir base de empresas atreladas por estrutura de filiais a uma matriz na base de clientes",
        "Importar extrato contendo o CNPJ de uma das filiais (e não a principal da fatura)",
        "Acionar a identificação automática",
        "Conferir a empresa atrelada ao título correspondente",
        "O sistema localiza o cliente matriz pela vinculação da filial identificada, busca todos os pagamentos da fatura matriz abertos e sugere a correspondência correta de pagamentos da matriz com a receita recebida pela filial (resultado esperado)"
      ]
    },
    {
      name: "Liquidação com valores excedentes na baixa",
      steps: [
        "Importar extrato cujo valor do recebimento excede o título e suas variações (excedente é multas, juros, correções)",
        "Selecionar a baixa dos títulos da nota com opção de incluir juros/acréscimos",
        "Acionar o processamento",
        "Conferir os lançamentos gerados para o título na empresa",
        "Sistema liquida os títulos selecionados registrando a diferença como 'acréscimo de recebimento' (receita) na mesma transação, mantendo o controle total da operação no ERP (resultado esperado)"
      ]
    },
    {
      name: "Baixa multipagamentos em faturas de clientes de diferentes filiais",
      steps: [
        "Logar com usuário que tenha permissão a múltiplas empresas no grupo do sistema",
        "Importar extrato e gerar o processamento da identificação",
        "Conferir as empresas disponíveis na tela de validação de baixas",
        "O sistema permite alterar e processar faturas de diferentes empresas a partir de um único arquivo de extrato da mesma conta conciliadora matriz (resultado esperado)"
      ]
    },
    {
      name: "Validação de empresas cruzadas sem permissão do usuário",
      steps: [
        "Logar com usuário de permissões restritas a uma única empresa (ex.: Filial 1)",
        "Importar extrato e gerar o processamento da identificação",
        "Tentar alterar para uma fatura da Filial 2 no grid de validação",
        "Sistema bloqueia e não permite que o usuário veja faturas da filial 2, restringindo o preenchimento apenas à empresa permitida, com alerta visual de falta de permissões (resultado esperado)"
      ]
    },
    {
      name: "Confirmação de processamento interativo com a filial selecionada",
      steps: [
        "Importar extrato com pagamentos de faturas da Filial A",
        "Processar os itens identificados e gerar as faturas a baixar",
        "Acionar a geração de lote de liquidação",
        "Conferir o lote no ERP e na ACP",
        "Sistema registra e liquida a fatura utilizando a Filial correspondente a fatura importada, com o status refletido (resultado esperado)"
      ]
    },
    {
      name: "Processamento contínuo da integração sem travar nos itens recusados",
      steps: [
        "Importar extrato contendo vários recebimentos de clientes",
        "Aprovar a identificação de recebimentos para envio e rejeitar/limpar parte dos registros identificados que possuem problemas de fatura",
        "Acionar a geração de lote de liquidação",
        "Sistema gera o lote de liquidação apenas para os registros autorizados pelo usuário na validação manual, não travando o lote pelo bloqueio parcial ou remoção de um ou mais itens. (resultado esperado)"
      ]
    },
    {
      name: "Auditoria da baixa em registros nos lançamentos manuais",
      steps: [
        "Logar no sistema via autenticação na automação e acessar no sistema",
        "Conferir a tabela de histórico de lançamentos recebidos e sua autoria",
        "Acionar e validar que o ERP marca a rotina efetuada via tela específica da automação financeira, identificando o usuário original e evitando a marca genérica da RPA no banco de dados (resultado esperado)"
      ]
    },
    {
      name: "Exportação dos relatórios de conciliação para Excel ou formato compatível",
      steps: [
        "Executar e processar lote de identificação",
        "Acessar painel de controle e auditoria",
        "Solicitar extração do relatório base das transações da seção de registros reconciliados",
        "Sistema gera uma planilha ou PDF demonstrando os logs de operação efetuados na conciliação, data, itens processados, status, usuário e conciliação correspondente (resultado esperado)"
      ]
    },
    {
      name: "Busca de títulos em atraso para conciliação proativa e cobrança",
      steps: [
        "Importar extrato de registros rejeitados por falha de valor ou vencimento",
        "Selecionar a opção de busca de títulos por nome do pagador via base ERP em caso de correspondência falha",
        "Consultar na tela de validação manual",
        "O sistema permite busca visual dos títulos pendentes de pagamento em um cliente específico pelo seu nome (sem precisar acessar o ERP em paralelo), mostrando lista e possibilitando atrelar o recebimento manualmente (resultado esperado)"
      ]
    },
    {
      name: "Múltiplos abatimentos e retenções na mesma fatura",
      steps: [
        "Importar extrato de recebimento com desconto comercial ou multa",
        "Alterar valores sugeridos de cobrança adicionando diferentes níveis de retenção, desconto, multa na mesma fatura na validação",
        "Acionar geração de lote",
        "Sistema executa e efetua as correções financeiras conforme as modificações do usuário informadas via tela de apoio da automação sem necessidade de acionar telas de controle da ACP (resultado esperado)"
      ]
    },
    {
      name: "Exclusão de itens via API de comunicação entre base temporária e base permanente",
      steps: [
        "Processar registros de conciliação com sucesso",
        "Acionar a opção de limpar dados do cache",
        "Sistema deleta as informações processadas no cache temporário com sucesso mas mantém todos os históricos consolidados e rastreabilidades já inseridas com sucesso nas tabelas perenes e no log de acompanhamento com sucesso. (resultado esperado)"
      ]
    },
    {
      name: "Falha de conexão entre a API do banco e base centralizada ACP e notificação",
      steps: [
        "Configurar base de teste desconectando rede de banco/ACP",
        "Solicitar importação/Processamento",
        "O sistema interrompe e informa corretamente falha de banco com código ou mensagem clara ao usuário que as rotinas de verificação do ERP não podem ser cumpridas. (resultado esperado)"
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
    console.log(`  [${inserted}/30] ${tc.name.substring(0, 60)}...`);
  }

  saveDb();
  console.log("\n✅ Sucesso! Inseridos " + inserted + " test cases no projeto F873 (id=" + projectId + ")");
  
  // Verify
  const verifyRes = db.exec('SELECT COUNT(*) as cnt FROM sprints WHERE project_id = ?', [projectId]);
  console.log("Verificação: " + verifyRes[0].values[0][0] + " sprints no projeto.");
  
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
