import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, Pencil, Eye, CheckCircle, XCircle, Clock, Search, X, Send, Lock } from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualização' };
const ROLE_COLORS = { admin: '#22c55e', editor: '#3b82f6', viewer: '#8b5cf6' };

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [confirmModal, setConfirmModal] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Viewer state
  const [myRequest, setMyRequest] = useState(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'admin' || user?.role === 'editor') {
        const res = await usersAPI.list();
        setUsers(res.data.users);
      } else if (user?.role === 'viewer') {
        const res = await usersAPI.myRequest();
        setMyRequest(res.data.request);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async () => {
    if (justification.trim().length < 20) return alert('Justificativa deve ter no mínimo 20 caracteres.');
    setSubmitting(true);
    try {
      const res = await usersAPI.createRequest(justification.trim());
      setMyRequest(res.data.request);
      setJustification('');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangeRole = async () => {
    if (!confirmModal) return;
    setProcessing(true);
    try {
      await usersAPI.changeRole(confirmModal.user.id, confirmModal.newRole);
      setUsers(users.map(u => u.id === confirmModal.user.id ? { ...u, role: confirmModal.newRole } : u));
      setConfirmModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar perfil.');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  // ── EDITOR VIEW ───────────────────────────────────────────────────────────
  if (user?.role === 'editor') {
    return (
      <div className="fade-in">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={22} style={{ color: 'var(--accent)' }} />
            <h1 className="page-title">Meu Perfil</h1>
          </div>
        </div>
        <div className="card" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Pencil size={16} style={{ color: 'var(--accent)' }} /> Informações do Perfil
            </h2>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px',
              border: '1px solid var(--border)', marginBottom: '1.25rem'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(59,130,246,0.15)', border: '2px solid #3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Pencil size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{user?.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                <span style={{
                  background: 'rgba(59,130,246,0.12)', color: '#3b82f6',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: '99px', padding: '0.15rem 0.6rem', fontSize: '0.73rem', fontWeight: 700,
                  marginTop: '0.25rem', display: 'inline-block'
                }}>Editor</span>
              </div>
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Você possui perfil <strong>Editor</strong> e tem permissão para criar, editar e excluir projetos, test cases e bugs, além de exportar relatórios. Para obter permissões administrativas, entre em contato com um administrador do sistema.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── VIEWER VIEW ───────────────────────────────────────────────────────────
  if (user?.role === 'viewer') {
    const isPending  = myRequest?.status === 'pending';
    const isRejected = myRequest?.status === 'rejected';
    const isApproved = myRequest?.status === 'approved';
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '';

    return (
      <div className="fade-in">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={22} style={{ color: 'var(--accent)' }} />
            <h1 className="page-title">Acesso ao Sistema</h1>
          </div>
        </div>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Lock size={16} style={{ color: 'var(--accent)' }} /> Seu Perfil Atual
            </h2>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '10px',
              border: '1px solid var(--border)', marginBottom: '1.5rem'
            }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'rgba(139,92,246,0.15)', border: '2px solid #8b5cf6',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Eye size={20} style={{ color: '#8b5cf6' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{user?.name}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                <span style={{
                  background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                  border: '1px solid rgba(139,92,246,0.3)',
                  borderRadius: '99px', padding: '0.15rem 0.6rem', fontSize: '0.73rem', fontWeight: 700,
                  marginTop: '0.25rem', display: 'inline-block'
                }}>Visualização</span>
              </div>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.25rem' }}>
              Você está no perfil <strong>Visualização</strong>, que permite apenas leitura. Para criar, editar ou excluir projetos, test cases e bugs, você precisa solicitar o perfil de <strong>Editor</strong> a um administrador.
            </p>

            {isPending && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', marginBottom: '1rem'
              }}>
                <Clock size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#f59e0b' }}>Solicitação enviada</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enviada em {formatDate(myRequest.created_at)} — aguardando aprovação do administrador.</div>
                </div>
              </div>
            )}
            {isApproved && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', background: 'rgba(34,197,94,0.08)',
                border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px', marginBottom: '1rem'
              }}>
                <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0 }} />
                <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#22c55e' }}>Aprovada! Faça logout e login novamente para aplicar as permissões.</div>
              </div>
            )}
            {isRejected && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.85rem 1rem', background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginBottom: '1rem'
              }}>
                <XCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#ef4444' }}>Solicitação rejeitada</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Motivo: {myRequest.rejection_reason}</div>
                </div>
              </div>
            )}

            {!isPending && !isApproved && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Justificativa para solicitar acesso de edição
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: '0.4rem' }}>
                    ({justification.length}/500 · mín. 20)
                  </span>
                </label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Descreva por que você precisa de permissão para editar projetos, test cases e bugs no sistema..."
                  value={justification}
                  maxLength={500}
                  onChange={e => setJustification(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitRequest}
                  disabled={submitting || justification.trim().length < 20}
                  style={{ alignSelf: 'flex-end' }}
                >
                  {submitting ? 'Enviando...' : <><Send size={14} /> Solicitar permissão de edição</>}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="page-title">Gerenciamento de Usuários</h1>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-input" style={{ paddingLeft: '2.2rem' }} placeholder="Buscar por nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-select" style={{ width: 'auto' }} value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">Todos os perfis</option>
          <option value="admin">Administrador</option>
          <option value="editor">Editor</option>
          <option value="viewer">Visualização</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
              {['Nome', 'E-mail', 'Perfil', 'Desde', 'Ações'].map(col => (
                <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{u.email}</td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <span style={{
                    background: `${ROLE_COLORS[u.role]}22`, color: ROLE_COLORS[u.role],
                    border: `1px solid ${ROLE_COLORS[u.role]}44`,
                    borderRadius: '99px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                  }}>
                    {ROLE_LABELS[u.role] || u.role}
                  </span>
                </td>
                <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(u.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td style={{ padding: '0.6rem 1rem' }}>
                  <div style={{
                    display: 'inline-flex', borderRadius: '8px', overflow: 'hidden',
                    border: '1px solid var(--border)', background: 'var(--bg-tertiary)'
                  }}>
                    {[
                      { key: 'viewer', label: 'Visualização', color: '#8b5cf6' },
                      { key: 'editor', label: 'Editor',       color: '#3b82f6' },
                      { key: 'admin',  label: 'Admin',         color: '#22c55e' },
                    ].map(({ key, label, color }) => {
                      const isActive = u.role === key;
                      return (
                        <button
                          key={key}
                          title={isActive ? `Perfil atual: ${label}` : `Alterar para ${label}`}
                          onClick={() => !isActive && setConfirmModal({ user: u, newRole: key })}
                          style={{
                            padding: '0.3rem 0.7rem',
                            fontSize: '0.73rem', fontWeight: isActive ? 700 : 500,
                            border: 'none', cursor: isActive ? 'default' : 'pointer',
                            background: isActive ? color : 'transparent',
                            color: isActive ? '#fff' : 'var(--text-muted)',
                            transition: 'all 0.15s',
                            borderRight: key !== 'admin' ? '1px solid var(--border)' : 'none',
                            opacity: isActive ? 1 : 0.75,
                          }}
                          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${color}22`; }}
                          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {confirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Confirmar alteração</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setConfirmModal(null)}><X size={18} /></button>
            </div>
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Tem certeza que deseja tornar <strong>{confirmModal.user.name}</strong> um <strong style={{ color: ROLE_COLORS[confirmModal.newRole] }}>{ROLE_LABELS[confirmModal.newRole]}</strong>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button className="btn btn-secondary" onClick={() => setConfirmModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleChangeRole} disabled={processing}>{processing ? 'Salvando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
