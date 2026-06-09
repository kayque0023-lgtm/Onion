const express = require('express');
const { body, validationResult } = require('express-validator');
const { queryAll, queryOne, runSql } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// POST /api/time-sessions
// Body: { project_id, started_at (ISO), ended_at (ISO), duration_seconds }
router.post('/', [
  body('project_id').isInt({ min: 1 }).withMessage('project_id obrigatório'),
  body('started_at').isISO8601().withMessage('started_at inválido'),
  body('ended_at').isISO8601().withMessage('ended_at inválido'),
  body('duration_seconds').isInt({ min: 1 }).withMessage('duration_seconds deve ser > 0'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { project_id, started_at, ended_at, duration_seconds } = req.body;

    const project = queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [project_id, req.user.id]
    );
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const result = runSql(
      'INSERT INTO time_sessions (user_id, project_id, started_at, ended_at, duration_seconds) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, project_id, started_at, ended_at, duration_seconds]
    );

    const session = queryOne('SELECT * FROM time_sessions WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ session });
  } catch (err) {
    console.error('Erro ao salvar sessão de tempo:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/time-sessions/today
// Sessões iniciadas hoje pelo usuário autenticado.
router.get('/today', (req, res) => {
  try {
    const sessions = queryAll(`
      SELECT ts.*, p.name AS project_name
      FROM time_sessions ts
      JOIN projects p ON ts.project_id = p.id
      WHERE ts.user_id = ?
        AND DATE(ts.started_at) = DATE('now', 'localtime')
      ORDER BY ts.started_at DESC
    `, [req.user.id]);
    res.json({ sessions });
  } catch (err) {
    console.error('Erro ao listar sessões de hoje:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/time-sessions/by-date?date=YYYY-MM-DD
// Sessões de uma data específica.
router.get('/by-date', (req, res) => {
  try {
    const date = String(req.query.date || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Parâmetro date inválido. Use YYYY-MM-DD.' });
    }
    const sessions = queryAll(`
      SELECT ts.*, p.name AS project_name
      FROM time_sessions ts
      JOIN projects p ON ts.project_id = p.id
      WHERE ts.user_id = ?
        AND DATE(ts.started_at) = ?
      ORDER BY ts.started_at DESC
    `, [req.user.id, date]);
    res.json({ sessions });
  } catch (err) {
    console.error('Erro ao listar sessões por data:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/time-sessions/totals
// Total acumulado por projeto para o usuário autenticado.
router.get('/totals', (req, res) => {
  try {
    const totals = queryAll(`
      SELECT project_id, SUM(duration_seconds) AS total_seconds
      FROM time_sessions
      WHERE user_id = ?
      GROUP BY project_id
    `, [req.user.id]);
    res.json({ totals });
  } catch (err) {
    console.error('Erro ao obter totais por projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/time-sessions/project/:projectId
// Total para um projeto específico.
router.get('/project/:projectId', (req, res) => {
  try {
    const project = queryOne(
      'SELECT id FROM projects WHERE id = ? AND user_id = ?',
      [req.params.projectId, req.user.id]
    );
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const row = queryOne(
      'SELECT SUM(duration_seconds) AS total_seconds FROM time_sessions WHERE user_id = ? AND project_id = ?',
      [req.user.id, req.params.projectId]
    );
    res.json({ total_seconds: row?.total_seconds || 0 });
  } catch (err) {
    console.error('Erro ao obter total do projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/time-sessions/:id
router.delete('/:id', (req, res) => {
  try {
    const session = queryOne(
      'SELECT * FROM time_sessions WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!session) return res.status(404).json({ error: 'Sessão não encontrada' });

    runSql('DELETE FROM time_sessions WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sessão excluída com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir sessão:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
