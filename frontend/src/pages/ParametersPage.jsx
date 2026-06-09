import { useState, useEffect } from 'react';
import { parametersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Settings, Search, Plus, Trash2, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const PARAMETERS_PREVIEW_LIMIT = 6;

export default function ParametersPage() {
  const { user } = useAuth();
  const [parameters, setParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newParamCategory, setNewParamCategory] = useState('developer');
  const [newParamValue, setNewParamValue] = useState('');
  const [paramSearch, setParamSearch] = useState('');
  const [paramFilters, setParamFilters] = useState({ client: true, developer: true, qa: true, manager: true });
  const [showAll, setShowAll] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await parametersAPI.list();
      setParameters(res.data.parameters);
    } catch (err) {
      console.error('Erro ao carregar parâmetros:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddParam = async () => {
    if (!newParamValue.trim()) return;
    setProcessing(true);
    try {
      await parametersAPI.create({ category: newParamCategory, value: newParamValue.trim() });
      setNewParamValue('');
      await load();
      showToast('Opção cadastrada com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao adicionar parâmetro.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteParam = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover este parâmetro? Ele continuará visível em projetos antigos que já o utilizam.')) return;
    try {
      await parametersAPI.delete(id);
      await load();
      showToast('Opção removida com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao remover parâmetro.', 'error');
    }
  };

  const filteredParameters = parameters.filter(p => {
    if (!paramFilters[p.category]) return false;
    if (paramSearch && !p.value.toLowerCase().includes(paramSearch.toLowerCase())) return false;
    return true;
  });

  const hasOverflow = filteredParameters.length > PARAMETERS_PREVIEW_LIMIT;
  const visibleParameters = showAll || !hasOverflow
    ? filteredParameters
    : filteredParameters.slice(0, PARAMETERS_PREVIEW_LIMIT);

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Settings size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="page-title">Parâmetros</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', padding: '1.5rem 1.5rem 1.25rem 1.5rem', margin: 0 }}>
            <h2 className="card-title">Opções Cadastradas</h2>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="form-input" style={{ paddingLeft: '2.2rem', paddingRight: '0.75rem', paddingBottom: '0.6rem', paddingTop: '0.6rem', fontSize: '0.85rem' }} placeholder="Buscar parâmetro..." value={paramSearch} onChange={e => setParamSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={paramFilters.client} onChange={e => setParamFilters({...paramFilters, client: e.target.checked})} /> Empresa Cliente
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={paramFilters.developer} onChange={e => setParamFilters({...paramFilters, developer: e.target.checked})} /> Desenvolvedor(a)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={paramFilters.qa} onChange={e => setParamFilters({...paramFilters, qa: e.target.checked})} /> Analista QA
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={paramFilters.manager} onChange={e => setParamFilters({...paramFilters, manager: e.target.checked})} /> Gestor
              </label>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>CATEGORIA</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)' }}>VALOR</th>
                <th style={{ padding: '0.75rem 1rem', width: '50px' }}></th>
              </tr>
            </thead>
            <tbody>
              {visibleParameters.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 600, textTransform: 'capitalize' }}>
                    {p.category === 'client' ? 'Cliente' : p.category === 'developer' ? 'Desenvolvedor' : p.category === 'qa' ? 'QA' : 'Gestor'}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>{p.value}</td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                    {user?.role === 'admin' && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeleteParam(p.id)} title="Excluir">
                        <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredParameters.length === 0 && (
                <tr><td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhum parâmetro encontrado.</td></tr>
              )}
            </tbody>
          </table>
          {hasOverflow && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{
                width: '100%', padding: '0.75rem',
                background: 'var(--bg-tertiary)', border: 'none', borderTop: '1px solid var(--border)',
                cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: '0.85rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-glass-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
            >
              {showAll
                ? <>Mostrar menos <ChevronUp size={15} /></>
                : <>Ver todos ({filteredParameters.length}) <ChevronDown size={15} /></>
              }
            </button>
          )}
        </div>

        {user?.role === 'admin' && (
          <div className="card" style={{ alignSelf: 'start' }}>
            <div className="card-header">
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={16} style={{ color: 'var(--accent)' }} /> Adicionar Nova Opção
              </h2>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="form-label">Categoria</label>
                <select className="form-input" value={newParamCategory} onChange={e => setNewParamCategory(e.target.value)}>
                  <option value="developer">Desenvolvedor</option>
                  <option value="qa">Analista QA</option>
                  <option value="manager">Gestor</option>
                  <option value="client">Empresa Cliente</option>
                </select>
              </div>
              <div>
                <label className="form-label">Nome / Valor</label>
                <input className="form-input" placeholder="Ex: João Silva, Apple Inc." value={newParamValue} onChange={e => setNewParamValue(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleAddParam} disabled={processing || !newParamValue.trim()}>
                {processing ? 'Adicionando...' : 'Adicionar Parâmetro'}
              </button>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.5 }}>
                Estas opções aparecerão nos menus de seleção ao criar ou editar projetos e também nos filtros de busca da plataforma.
              </p>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white', padding: '0.8rem 1.25rem', borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem',
          transition: 'all 0.3s ease', transform: 'translateX(0)', opacity: 1
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
