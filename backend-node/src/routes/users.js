const express = require('express');
const { queryAll, queryOne, runSql } = require('../database/setup');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/users — lista todos (somente ADM)
router.get('/', requireRole('admin'), (req, res) => {
  try {
    const users = queryAll(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC',
      []
    );
    res.json({ users });
  } catch (err) {
    console.error('Erro ao listar usuários:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/:id/role — alterar perfil (somente ADM)
router.put('/:id/role', requireRole('admin'), (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'editor', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Perfil inválido' });
    }

    const target = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Impede remover o último ADM
    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = queryOne('SELECT COUNT(*) as count FROM users WHERE role = "admin"', []);
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'É necessário pelo menos um administrador no sistema.' });
      }
    }

    // Gravar audit log
    runSql(
      'INSERT INTO audit_logs (actor_id, target_id, old_role, new_role, action) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, target.id, target.role, role, 'role_change']
    );

    runSql('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

    // Se voltou para viewer, apagar todas as solicitações anteriores
    // para que o usuário possa solicitar acesso novamente com o histórico limpo
    if (role === 'viewer') {
      runSql('DELETE FROM permission_requests WHERE user_id = ?', [req.params.id]);
    }

    // Se virou admin, apagar solicitações pendentes (não precisa mais)
    if (role === 'admin') {
      runSql('DELETE FROM permission_requests WHERE user_id = ?', [req.params.id]);
    }

    const updated = queryOne('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.params.id]);
    res.json({ user: updated });
  } catch (err) {
    console.error('Erro ao alterar perfil:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/permission-requests — listar pedidos (somente ADM)
router.get('/permission-requests', requireRole('admin'), (req, res) => {
  try {
    const requests = queryAll(`
      SELECT pr.*, u.name as user_name, u.email as user_email,
             r.name as reviewer_name
      FROM permission_requests pr
      JOIN users u ON pr.user_id = u.id
      LEFT JOIN users r ON pr.reviewed_by = r.id
      ORDER BY pr.created_at DESC
    `, []);
    res.json({ requests });
  } catch (err) {
    console.error('Erro ao listar pedidos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/users/my-request — solicitação do usuário logado
router.get('/my-request', (req, res) => {
  try {
    const request = queryOne(
      'SELECT * FROM permission_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    res.json({ request: request || null });
  } catch (err) {
    console.error('Erro ao buscar solicitação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/users/permission-requests — criar solicitação (somente viewer)
router.post('/permission-requests', requireRole('viewer'), (req, res) => {
  try {
    const { justification } = req.body;
    if (!justification || justification.trim().length < 20) {
      return res.status(400).json({ error: 'Justificativa deve ter no mínimo 20 caracteres.' });
    }
    if (justification.trim().length > 500) {
      return res.status(400).json({ error: 'Justificativa deve ter no máximo 500 caracteres.' });
    }

    // Verificar se já existe pedido pendente
    const existing = queryOne(
      'SELECT id FROM permission_requests WHERE user_id = ? AND status = "pending"',
      [req.user.id]
    );
    if (existing) {
      return res.status(400).json({ error: 'Você já possui uma solicitação pendente.' });
    }

    const result = runSql(
      'INSERT INTO permission_requests (user_id, justification) VALUES (?, ?)',
      [req.user.id, justification.trim()]
    );

    const newRequest = queryOne('SELECT * FROM permission_requests WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ request: newRequest });
  } catch (err) {
    console.error('Erro ao criar solicitação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/permission-requests/:id/approve — aprovar (somente ADM)
router.put('/permission-requests/:id/approve', requireRole('admin'), (req, res) => {
  try {
    const request = queryOne('SELECT * FROM permission_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Solicitação já foi processada.' });

    // Atualizar solicitação
    runSql(
      'UPDATE permission_requests SET status = "approved", reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [req.user.id, req.params.id]
    );

    // Promover usuário para editor
    const target = queryOne('SELECT * FROM users WHERE id = ?', [request.user_id]);
    runSql('UPDATE users SET role = "editor" WHERE id = ?', [request.user_id]);

    // Gravar audit log
    runSql(
      'INSERT INTO audit_logs (actor_id, target_id, old_role, new_role, action) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, request.user_id, target.role, 'editor', 'permission_approved']
    );

    res.json({ message: 'Solicitação aprovada. Usuário promovido a Editor.' });
  } catch (err) {
    console.error('Erro ao aprovar solicitação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/users/permission-requests/:id/reject — rejeitar (somente ADM)
router.put('/permission-requests/:id/reject', requireRole('admin'), (req, res) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason || rejection_reason.trim().length < 10) {
      return res.status(400).json({ error: 'Motivo de rejeição deve ter no mínimo 10 caracteres.' });
    }

    const request = queryOne('SELECT * FROM permission_requests WHERE id = ?', [req.params.id]);
    if (!request) return res.status(404).json({ error: 'Solicitação não encontrada' });
    if (request.status !== 'pending') return res.status(400).json({ error: 'Solicitação já foi processada.' });

    runSql(
      'UPDATE permission_requests SET status = "rejected", rejection_reason = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [rejection_reason.trim(), req.user.id, req.params.id]
    );

    res.json({ message: 'Solicitação rejeitada.' });
  } catch (err) {
    console.error('Erro ao rejeitar solicitação:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
