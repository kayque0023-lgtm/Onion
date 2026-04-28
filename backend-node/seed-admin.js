const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sqlJs = require('sql.js');

sqlJs().then(async SQL => {
  const dbPath = path.join('c:/Users/Work/Desktop/ALMonion/backend-node', 'qualiqa.db');
  let db;
  if (fs.existsSync(dbPath)) {
    db = new SQL.Database(fs.readFileSync(dbPath));
  } else {
    db = new SQL.Database();
  }
  
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'viewer',
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  try { db.run("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'viewer'"); } catch(e) {}

  const hash = await bcrypt.hash('123456', 10);
  
  // Check if user exists
  const existing = db.exec("SELECT id FROM users WHERE email = 'kayque@teste.com'");
  if (existing.length > 0 && existing[0].values.length > 0) {
    db.run("UPDATE users SET password_hash = ?, role = 'admin', name = 'Kayque' WHERE email = 'kayque@teste.com'", [hash]);
    console.log('Usuario kayque atualizado como admin');
  } else {
    db.run("INSERT INTO users (name, email, password_hash, role) VALUES ('Kayque', 'kayque@teste.com', ?, 'admin')", [hash]);
    console.log('Usuario kayque criado como admin');
  }

  fs.writeFileSync(dbPath, Buffer.from(db.export()));
  const res = db.exec('SELECT id, name, email, role FROM users');
  console.log('Usuarios no banco:', JSON.stringify(res));
});
