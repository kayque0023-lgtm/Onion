import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI } from '../services/api';
import { AlertTriangle, X, Send, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function PermissionRequestBanner() {
  const { user, refreshUser } = useAuth();
  const [request, setRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (user?.role === 'viewer') {
      usersAPI.myRequest().then(res => {
        setRequest(res.data.request);
        setLoaded(true);
      }).catch(() => setLoaded(true));
    }
  }, [user]);

  if (!user || user.role !== 'viewer' || !loaded) return null;

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const handleSubmit = async () => {
    if (justification.trim().length < 20) return alert('Justificativa deve ter no mínimo 20 caracteres.');
    setSubmitting(true);
    try {
      const res = await usersAPI.createRequest(justification.trim());
      setRequest(res.data.request);
      setShowModal(false);
      setJustification('');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao enviar solicitação.');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = request?.status === 'pending';
  const isRejected = request?.status === 'rejected';

  return (
    <>
      {/* Banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0.6rem 1.25rem',
        background: isRejected ? 'rgba(239,68,68,0.08)' : 'rgba(139,92,246,0.08)',
        border: `1px solid ${isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(139,92,246,0.3)'}`,
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '0.85rem',
        color: 'var(--text-secondary)',
      }}>
        <AlertTriangle size={15} style={{ color: isRejected ? '#ef4444' : '#8b5cf6', flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          {isRejected ? (
            <>Sua solicitação foi <strong style={{ color: '#ef4444' }}>rejeitada</strong>: "{request.rejection_reason}". </>
          ) : isPending ? (
            <>Solicitação de edição <strong style={{ color: '#8b5cf6' }}>pendente</strong> enviada em {formatDate(request.created_at)}.</>
          ) : (
            <>Você possui perfil <strong>Visualização</strong>. Somente leitura.</>
          )}
        </span>
        {!isPending && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { setShowModal(true); setJustification(''); }}
            style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem', flexShrink: 0 }}
          >
            {isRejected ? 'Enviar nova solicitação' : 'Solicitar permissão de edição'}
          </button>
        )}
        {isPending && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#8b5cf6', fontWeight: 500, flexShrink: 0 }}>
            <Clock size={13} /> Aguardando aprovação
          </span>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '480px', width: '100%' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Solicitar Permissão de Edição</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Explique por que você precisa de permissão de edição no sistema. Um administrador irá avaliar sua solicitação.
              </p>
              <div>
                <label className="form-label" style={{ marginBottom: '0.3rem', display: 'block' }}>
                  Justificativa <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({justification.length}/500)</span>
                </label>
                <textarea
                  className="form-input"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  placeholder="Descreva o motivo pelo qual precisa de acesso de edição... (mín. 20 caracteres)"
                  value={justification}
                  maxLength={500}
                  onChange={e => setJustification(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting || justification.trim().length < 20}
                >
                  {submitting ? 'Enviando...' : <><Send size={14} /> Enviar solicitação</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
