const express = require('express');
const { body, validationResult } = require('express-validator');
const { queryAll, queryOne, runSql } = require('../database/setup');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/projects
router.get('/', (req, res) => {
  try {
    const projects = queryAll(`
      SELECT p.*, 
        (SELECT COUNT(*) FROM sprints WHERE project_id = p.id) as sprint_count,
        (SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND status = 'approved') as approved_count,
        (SELECT COUNT(*) FROM bugs WHERE project_id = p.id) as bug_count,
        (SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND status = 'blocked') as blocked_count,
        (SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND status = 'rejected') as rejected_count,
        (SELECT COUNT(*) FROM sprints WHERE project_id = p.id AND status = 'pending_approval') as pending_count
      FROM projects p 
      WHERE p.user_id = ? 
      ORDER BY p.updated_at DESC
    `, [req.user.id]);
    res.json({ projects });
  } catch (err) {
    console.error('Erro ao listar projetos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/projects
router.post('/', [
  body('name').trim().notEmpty().withMessage('Nome do projeto é obrigatório'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, proposal_number, developer_name, qa_name, manager_name } = req.body;

    const result = runSql(`
      INSERT INTO projects (user_id, name, proposal_number, developer_name, qa_name, manager_name)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, name, proposal_number || null, developer_name || null, qa_name || null, manager_name || null]);

    const project = queryOne('SELECT * FROM projects WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ project });
  } catch (err) {
    console.error('Erro ao criar projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  try {
    const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const sprints = queryAll('SELECT * FROM sprints WHERE project_id = ? ORDER BY order_index', [project.id]);
    for (const sprint of sprints) {
      sprint.steps = queryAll('SELECT * FROM steps WHERE sprint_id = ? ORDER BY order_index', [sprint.id]);
    }

    const comments = queryAll(`
      SELECT c.*, u.name as user_name 
      FROM comments c JOIN users u ON c.user_id = u.id 
      WHERE c.project_id = ? 
      ORDER BY c.created_at DESC LIMIT 20
    `, [project.id]);

    const bugs = queryAll('SELECT * FROM bugs WHERE project_id = ?', [project.id]);

    res.json({ project, sprints, comments, bugs });
  } catch (err) {
    console.error('Erro ao buscar projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  try {
    const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    const { name, proposal_number, developer_name, qa_name, manager_name, scope_summary, attachment_path, status } = req.body;
    // sql.js cannot bind undefined — convert to null
    const n = (v) => v === undefined ? null : v;

    runSql(`
      UPDATE projects SET 
        name = COALESCE(?, name),
        proposal_number = COALESCE(?, proposal_number),
        developer_name = COALESCE(?, developer_name),
        qa_name = COALESCE(?, qa_name),
        manager_name = COALESCE(?, manager_name),
        scope_summary = COALESCE(?, scope_summary),
        attachment_path = COALESCE(?, attachment_path),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [n(name), n(proposal_number), n(developer_name), n(qa_name), n(manager_name), n(scope_summary), n(attachment_path), n(status), req.params.id]);

    const updated = queryOne('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    res.json({ project: updated });
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  try {
    const project = queryOne('SELECT * FROM projects WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (!project) return res.status(404).json({ error: 'Projeto não encontrado' });

    runSql('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Projeto excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir projeto:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
