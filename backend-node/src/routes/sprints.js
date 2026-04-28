const express = require('express');
const { body, validationResult } = require('express-validator');
const { queryAll, queryOne, runSql } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// POST /api/projects/:projectId/sprints
router.post('/projects/:projectId/sprints', [
  body('name').trim().notEmpty().withMessage('Nome do sprint é obrigatório'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.projectId, req.user.id]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const maxOrder = queryOne('SELECT MAX(order_index) as max_order FROM sprints WHERE project_id = ?', [project.id]);
    const orderIndex = (maxOrder?.max_order || 0) + 1;

    const result = runSql(
      'INSERT INTO sprints (project_id, name, order_index) VALUES (?, ?, ?)',
      [project.id, req.body.name, orderIndex]
    );

    const sprint = queryOne('SELECT * FROM sprints WHERE id = ?', [result.lastInsertRowid]);
    sprint.steps = [];
    res.status(201).json({ sprint });
  } catch (err) {
    console.error('Erro ao criar sprint:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/sprints/:id
router.put('/sprints/:id', (req, res) => {
  try {
    const sprint = queryOne(`
      SELECT s.* FROM sprints s 
      JOIN projects p ON s.project_id = p.id 
      WHERE s.id = ? AND p.user_id = ?
    `, [req.params.id, req.user.id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });

    const { name, status } = req.body;
    const updateName = name !== undefined ? name : sprint.name;
    const updateStatus = status !== undefined ? status : sprint.status;
    
    runSql('UPDATE sprints SET name = ?, status = ? WHERE id = ?',
      [updateName, updateStatus, req.params.id]);

    runSql('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [sprint.project_id]);

    const updated = queryOne('SELECT * FROM sprints WHERE id = ?', [req.params.id]);
    updated.steps = queryAll('SELECT * FROM steps WHERE sprint_id = ? ORDER BY order_index', [updated.id]);
    res.json({ sprint: updated });
  } catch (err) {
    console.error('Erro ao atualizar sprint:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/sprints/:id
router.delete('/sprints/:id', (req, res) => {
  try {
    const sprint = queryOne(`
      SELECT s.* FROM sprints s 
      JOIN projects p ON s.project_id = p.id 
      WHERE s.id = ? AND p.user_id = ?
    `, [req.params.id, req.user.id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });

    runSql('DELETE FROM sprints WHERE id = ?', [req.params.id]);
    res.json({ message: 'Sprint excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir sprint:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/sprints/:sprintId/steps
router.post('/sprints/:sprintId/steps', [
  body('description').trim().notEmpty().withMessage('Descrição do step é obrigatória'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const sprint = queryOne(`
      SELECT s.* FROM sprints s 
      JOIN projects p ON s.project_id = p.id 
      WHERE s.id = ? AND p.user_id = ?
    `, [req.params.sprintId, req.user.id]);
    if (!sprint) return res.status(404).json({ error: 'Sprint não encontrado' });

    const maxOrder = queryOne('SELECT MAX(order_index) as max_order FROM steps WHERE sprint_id = ?', [sprint.id]);
    const orderIndex = (maxOrder?.max_order || 0) + 1;

    const { description, expected_result, image_path } = req.body;
    const result = runSql(
      'INSERT INTO steps (sprint_id, description, expected_result, image_path, order_index) VALUES (?, ?, ?, ?, ?)',
      [sprint.id, description, expected_result || null, image_path || null, orderIndex]
    );

    const step = queryOne('SELECT * FROM steps WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ step });
  } catch (err) {
    console.error('Erro ao criar step:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/steps/:id
router.put('/steps/:id', (req, res) => {
  try {
    const step = queryOne(`
      SELECT st.* FROM steps st
      JOIN sprints s ON st.sprint_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE st.id = ? AND p.user_id = ?
    `, [req.params.id, req.user.id]);
    if (!step) return res.status(404).json({ error: 'Step não encontrado' });

    const { description, expected_result, actual_result, status, image_path } = req.body;
    
    const updateDesc = description !== undefined ? description : step.description;
    const updateExpected = expected_result !== undefined ? expected_result : step.expected_result;
    const updateActual = actual_result !== undefined ? actual_result : step.actual_result;
    const updateStatus = status !== undefined ? status : step.status;
    const updateImage = image_path !== undefined ? image_path : step.image_path;

    runSql(`
      UPDATE steps SET 
        description = ?,
        expected_result = ?,
        actual_result = ?,
        image_path = ?,
        status = ?
      WHERE id = ?
    `, [updateDesc, updateExpected, updateActual, updateImage, updateStatus, req.params.id]);

    const updated = queryOne('SELECT * FROM steps WHERE id = ?', [req.params.id]);
    res.json({ step: updated });
  } catch (err) {
    console.error('Erro ao atualizar step:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/steps/:id
router.delete('/steps/:id', (req, res) => {
  try {
    const step = queryOne(`
      SELECT st.* FROM steps st
      JOIN sprints s ON st.sprint_id = s.id
      JOIN projects p ON s.project_id = p.id
      WHERE st.id = ? AND p.user_id = ?
    `, [req.params.id, req.user.id]);
    if (!step) return res.status(404).json({ error: 'Step não encontrado' });

    runSql('DELETE FROM steps WHERE id = ?', [req.params.id]);
    res.json({ message: 'Step excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir step:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
