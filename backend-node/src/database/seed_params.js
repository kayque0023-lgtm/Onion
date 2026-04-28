const { getDb, initializeDatabase, saveDb } = require('./setup');

async function seed() {
  await initializeDatabase();
  const db = await getDb();
  
  const projectsResult = db.exec('SELECT developer_name, qa_name, manager_name, client_company FROM projects');
  if (projectsResult.length === 0) {
    console.log('Sem projetos para migrar.');
    return;
  }
  
  const rows = projectsResult[0].values;
  const devSet = new Set();
  const qaSet = new Set();
  const manSet = new Set();
  const clientSet = new Set();
  
  rows.forEach(row => {
    if (row[0] && row[0].trim() !== '') devSet.add(row[0].trim());
    if (row[1] && row[1].trim() !== '') qaSet.add(row[1].trim());
    if (row[2] && row[2].trim() !== '') manSet.add(row[2].trim());
    if (row[3] && row[3].trim() !== '') clientSet.add(row[3].trim());
  });
  
  const toInsert = [];
  devSet.forEach(v => toInsert.push(['developer', v]));
  qaSet.forEach(v => toInsert.push(['qa', v]));
  manSet.forEach(v => toInsert.push(['manager', v]));
  clientSet.forEach(v => toInsert.push(['client', v]));
  
  let added = 0;
  toInsert.forEach(([category, value]) => {
    const existing = db.exec('SELECT id FROM parameters WHERE category = ? AND value = ?', [category, value]);
    if (!existing || existing.length === 0) {
      db.run('INSERT INTO parameters (category, value) VALUES (?, ?)', [category, value]);
      added++;
    }
  });
  
  saveDb();
  console.log(`Migracao concluida. Adicionados ${added} parametros.`);
  process.exit(0);
}

seed().catch(console.error);
