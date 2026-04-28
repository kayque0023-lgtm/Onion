const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initializeDatabase } = require('./database/setup');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const sprintRoutes = require('./routes/sprints');
const commentRoutes = require('./routes/comments');
const bugsRoutes = require('./routes/bugs');
const usersRoutes = require('./routes/users');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    // Allow any localhost port
    if (origin.match(/^http:\/\/localhost:\d+$/)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check (antes da inicialização do DB)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'QualiQA Node API', timestamp: new Date().toISOString() });
});

// Inicializar banco de dados e arrancar o servidor
async function startServer() {
  await initializeDatabase();

  // Rotas
  app.use('/api/auth', authRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api', sprintRoutes);
  app.use('/api/comments', commentRoutes);
  app.use('/api/bugs', bugsRoutes);
  app.use('/api/users', usersRoutes);

  // Error handler
  app.use((err, req, res, next) => {
    console.error('Erro não tratado:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 QualiQA Node API rodando em http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
