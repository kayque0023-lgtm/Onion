import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Users, ClipboardList, ShieldCheck, Pencil, Eye, CheckCircle, XCircle, Clock, Search, X, Send, AlertTriangle, Lock } from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualização' };
const ROLE_COLORS = { admin: '#22c55e', editor: '#3b82f6', viewer: '#8b5cf6' };
const STATUS_COLORS = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
const STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

export default function UsersPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Role change confirm modal
  const [confirmModal, setConfirmModal] = useState(null);

  // Reject modal
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Viewer request state
  const [myRequest, setMyRequest] = useState(null);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Justification expand
  const [expandedJustification, setExpandedJustification] = useState(null);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (user?.role === 'admin' || user?.role === 'editor') {
        const [usersRes, reqRes] = await Promise.all([usersAPI.list(), usersAPI.listRequests()]);
        setUsers(usersRes.data.users);
        setRequests(reqRes.data.requests);
      } else if (user?.role === 'viewer') {
        const reqRes = await usersAPI.myRequest();
        setMyRequest(reqRes.data.request);
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

  const handleApprove = async (requestId) => {
    setProcessing(true);
    try {
      await usersAPI.approveRequest(requestId);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao aprovar.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 10) return alert('Motivo deve ter no mínimo 10 caracteres.');
    setProcessing(true);
    try {
      await usersAPI.rejectRequest(rejectModal.requestId, rejectReason.trim());
      setRejectModal(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao rejeitar.');
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

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

        {/* Info card */}
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

            {/* Status feedback */}
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

            {/* Form */}
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

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Users size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="page-title">Gerenciamento de Usuários</h1>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
        {[
          { key: 'users', label: 'Usuários', icon: Users },
          { key: 'requests', label: 'Pedidos', icon: ClipboardList, badge: pendingCount },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.6rem 1.25rem',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.9rem', fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: '-2px', transition: 'all 0.15s',
            }}
          >
            <tab.icon size={15} />
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                background: '#ef4444', color: '#fff', borderRadius: '99px',
                fontSize: '0.7rem', fontWeight: 700, padding: '0 0.45rem', lineHeight: '1.5',
              }}>{tab.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── ABA USUÁRIOS ── */}
      {activeTab === 'users' && (
        <>
          {/* Filtros */}
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
                      {/* Segmented role selector */}
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
        </>
      )}

      {/* ── ABA PEDIDOS ── */}
      {activeTab === 'requests' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                {['Solicitante', 'Data', 'Justificativa', 'Status', 'Ações'].map(col => (
                  <th key={col} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{r.user_name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.user_email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', maxWidth: '280px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      {expandedJustification === r.id ? r.justification : r.justification.slice(0, 80) + (r.justification.length > 80 ? '...' : '')}
                    </span>
                    {r.justification.length > 80 && (
                      <button onClick={() => setExpandedJustification(expandedJustification === r.id ? null : r.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.78rem', marginLeft: '0.3rem' }}>
                        {expandedJustification === r.id ? 'ver menos' : 'ver mais'}
                      </button>
                    )}
                    {r.rejection_reason && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.76rem', color: '#ef4444' }}>
                        Motivo: {r.rejection_reason}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span style={{
                      background: `${STATUS_COLORS[r.status]}22`, color: STATUS_COLORS[r.status],
                      border: `1px solid ${STATUS_COLORS[r.status]}44`,
                      borderRadius: '99px', padding: '0.2rem 0.65rem', fontSize: '0.75rem', fontWeight: 700,
                    }}>
                      {STATUS_LABELS[r.status] || r.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(r.id)} disabled={processing}>
                          <CheckCircle size={13} /> Aprovar
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setRejectModal({ requestId: r.id }); setRejectReason(''); }} disabled={processing}>
                          <XCircle size={13} /> Rejeitar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma solicitação registrada.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal confirmar alteração de perfil */}
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

      {/* Modal rejeitar */}
      {rejectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="card" style={{ maxWidth: '440px', width: '100%' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Rejeitar Solicitação</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setRejectModal(null)}><X size={18} /></button>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="form-label">Motivo da rejeição <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(mín. 10 caracteres)</span></label>
              <textarea className="form-input" style={{ minHeight: '90px', resize: 'vertical' }} placeholder="Informe o motivo..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setRejectModal(null)}>Cancelar</button>
                <button className="btn btn-danger" onClick={handleReject} disabled={processing || rejectReason.trim().length < 10}>{processing ? 'Rejeitando...' : 'Confirmar Rejeição'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
