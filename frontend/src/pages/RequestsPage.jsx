import { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { ClipboardList, CheckCircle, XCircle, X } from 'lucide-react';

const STATUS_COLORS = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' };
const STATUS_LABELS = { pending: 'Pendente', approved: 'Aprovado', rejected: 'Rejeitado' };

export default function RequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedJustification, setExpandedJustification] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.listRequests();
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    setProcessing(true);
    try {
      await usersAPI.approveRequest(requestId);
      await load();
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
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao rejeitar.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <ClipboardList size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="page-title">Pedidos de Acesso</h1>
        </div>
      </div>

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
