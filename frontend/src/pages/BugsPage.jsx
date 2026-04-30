import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { bugsAPI, projectsAPI, sprintsAPI, uploadsAPI } from '../services/api';
import { Bug, Plus, X, UploadCloud, Image as ImageIcon, ArrowLeft, Filter, Search, Check } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BugsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [bugs, setBugs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ project_id: '', sprint_id: '', description: '' });
  const [sprints, setSprints] = useState([]);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination
  const PAGE_SIZE = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Bug detail modal (quando navega de outra tela com ?bugId=)
  const [detailBug, setDetailBug] = useState(null);

  // Project picker (donut center)
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [pickerPos, setPickerPos] = useState({ top: 0, left: 0 });
  const pickerRef = useRef(null);
  const pickerBtnRef = useRef(null);

  const computePickerPos = () => {
    if (!pickerBtnRef.current) return;
    const rect = pickerBtnRef.current.getBoundingClientRect();
    setPickerPos({
      top: rect.bottom + 12,
      left: rect.left + rect.width / 2
    });
  };

  useEffect(() => {
    if (!isPickerOpen) return;
    computePickerPos();
    const handleClickOutside = (e) => {
      if (
        pickerRef.current && !pickerRef.current.contains(e.target) &&
        pickerBtnRef.current && !pickerBtnRef.current.contains(e.target)
      ) {
        setIsPickerOpen(false);
        setProjectSearch('');
      }
    };
    const handleReposition = () => computePickerPos();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isPickerOpen]);

  useEffect(() => {
    loadData();
    
    // Check if redirected from another page to create bug
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      const pid = params.get('projectId');
      const sid = params.get('sprintId');
      setFormData({ project_id: pid || '', sprint_id: sid || '', description: '' });
      setIsModalOpen(true);
      if (pid) loadSprintsForProject(pid);
    }
    // Vindo da página de projeto via "Bugs Linkados": filtra projeto e abre detalhe do bug
    const bugIdParam = params.get('bugId');
    const projectIdParam = params.get('projectId');
    if (bugIdParam && projectIdParam && !params.get('new')) {
      setSelectedProjectId(projectIdParam);
    }
  }, [location.search]);

  // Quando os bugs são carregados e existe ?bugId=, abre o modal de detalhe
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const bugIdParam = params.get('bugId');
    if (!bugIdParam || params.get('new') === 'true' || bugs.length === 0) return;
    const bug = bugs.find(b => String(b.id) === String(bugIdParam));
    if (bug) setDetailBug(bug);
  }, [bugs, location.search]);

  useEffect(() => {
    if (detailBug) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [detailBug]);

  useEffect(() => {
    loadBugs();
  }, [selectedProjectId]);

  useEffect(() => {
    if (isModalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isModalOpen]);

  const loadData = async () => {
    try {
      const projRes = await projectsAPI.list();
      setProjects(projRes.data.projects || []);
      await loadBugs();
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBugs = async () => {
    try {
      const res = await bugsAPI.list(selectedProjectId || undefined);
      setBugs(res.data.bugs || []);
    } catch (err) {
      console.error('Erro ao carregar bugs:', err);
    }
  };

  const loadSprintsForProject = async (projectId) => {
    try {
      const res = await projectsAPI.get(projectId);
      setSprints(res.data.sprints || []);
    } catch (err) {
      console.error('Erro ao carregar sprints:', err);
    }
  };

  const handleProjectChange = (e) => {
    const pid = e.target.value;
    setFormData({ ...formData, project_id: pid, sprint_id: '' });
    if (pid) loadSprintsForProject(pid);
    else setSprints([]);
  };

  const handleUpdateStatus = async (bugId, newStatus) => {
    try {
      await bugsAPI.update(bugId, { status: newStatus });
      loadBugs();
    } catch (err) {
      console.error('Erro ao atualizar status do bug:', err);
      alert('Erro ao atualizar status do bug');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.project_id || !formData.sprint_id || !formData.description) {
      return alert('Preencha todos os campos obrigatórios.');
    }

    setIsSubmitting(true);
    try {
      let evidence_url = null;
      if (evidenceFile) {
        const uploadRes = await uploadsAPI.uploadEvidence(evidenceFile);
        evidence_url = uploadRes.data.url;
      }

      await bugsAPI.create({ ...formData, evidence_url });
      
      setIsModalOpen(false);
      setFormData({ project_id: '', sprint_id: '', description: '' });
      setEvidenceFile(null);
      loadBugs();
      
      // Clean up URL if came from redirect
      if (location.search) navigate('/bugs', { replace: true });
    } catch (err) {
      alert('Erro ao registrar bug');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reactive theme tracking for Chart.js
  const [themeColors, setThemeColors] = useState({
    text: '#1a1a1a',
    muted: '#666666',
    grid: '#e0e0e0',
    card: '#ffffff'
  });

  useEffect(() => {
    const updateColors = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      if (theme === 'dark') {
        setThemeColors({
          text: '#F0F6FC',
          muted: '#8B949E',
          grid: '#30363D',
          card: '#161B22'
        });
      } else {
        setThemeColors({
          text: '#1a1a1a',
          muted: '#666666',
          grid: '#e0e0e0',
          card: '#ffffff'
        });
      }
    };
    
    updateColors();
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  // Bug status totals
  const stats = useMemo(() => {
    let approved = 0, rejected = 0, pending = 0;
    bugs.forEach(b => {
      const s = b.status || 'pending';
      if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
      else pending++;
    });
    return { approved, rejected, pending, total: approved + rejected + pending };
  }, [bugs]);

  const currentProject = useMemo(
    () => projects.find(p => String(p.id) === String(selectedProjectId)) || null,
    [projects, selectedProjectId]
  );

  const filteredProjects = useMemo(
    () => projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase())),
    [projects, projectSearch]
  );

  useEffect(() => { setCurrentPage(1); }, [selectedProjectId, bugs.length]);
  const totalPages = Math.max(1, Math.ceil(bugs.length / PAGE_SIZE));
  const pagedBugs = useMemo(
    () => bugs.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [bugs, currentPage]
  );

  const doughnutData = useMemo(() => {
    if (stats.total === 0) {
      return {
        labels: ['Sem bugs'],
        datasets: [{
          data: [1],
          backgroundColor: [themeColors.grid],
          borderWidth: 0,
        }]
      };
    }
    return {
      labels: ['Resolvido', 'Recusado', 'Pendente'],
      datasets: [{
        data: [stats.approved, stats.rejected, stats.pending],
        backgroundColor: ['#22C55E', '#EF4444', '#6B7280'],
        borderColor: themeColors.card,
        borderWidth: 4,
        hoverOffset: 10,
      }]
    };
  }, [stats, themeColors]);

  const doughnutOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: stats.total > 0,
        backgroundColor: themeColors.card,
        titleColor: themeColors.text,
        bodyColor: themeColors.text,
        borderColor: themeColors.grid,
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed} bug(s)`
        }
      }
    }
  }), [stats.total, themeColors]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const isoStr = dateStr.includes('T') || dateStr.endsWith('Z')
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z';
    return new Date(isoStr).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo'
    });
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bug size={28} /> Central de Bugs
          </h1>
          <p className="page-subtitle">Acompanhe e registre defeitos encontrados nos test cases</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Registrar Bug
        </button>
      </div>

      {/* Gráfico + Tabela lado a lado */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(360px, 420px) 1fr',
        gap: '1rem',
        alignItems: 'stretch',
        marginBottom: '1rem'
      }}>
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: 'none', paddingBottom: 0 }}>
            <div>
              <h2 className="card-title" style={{ margin: 0 }}>Visão Geral</h2>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {currentProject ? currentProject.name : 'Todos os projetos'} · {stats.total} bug(s)
              </p>
            </div>
          </div>

          <div style={{ position: 'relative', padding: '1.5rem 1rem 0.5rem' }}>
            <div style={{ position: 'relative', height: '300px' }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />

              {/* Botão central que abre o filtro */}
              <button
                ref={pickerBtnRef}
                type="button"
                onClick={() => setIsPickerOpen(o => !o)}
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '160px', height: '160px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  border: '2px solid var(--border)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '0.25rem', padding: '0.5rem',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  transition: 'box-shadow 0.2s, border-color 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 6px 22px rgba(0,0,0,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; }}
              >
                <Filter size={20} style={{ color: 'var(--accent, #14B8A6)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Filtro
                </span>
                <span style={{
                  fontSize: '0.85rem', fontWeight: 600,
                  maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap', textAlign: 'center'
                }}>
                  {currentProject ? currentProject.name : 'Todos'}
                </span>
              </button>

              {/* Popover de seleção de projeto (renderizado via portal pra não ser cortado pelo card vizinho) */}
              {isPickerOpen && createPortal(
                <div
                  ref={pickerRef}
                  style={{
                    position: 'fixed',
                    top: pickerPos.top, left: pickerPos.left,
                    transform: 'translateX(-50%)',
                    width: '320px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
                    padding: '0.75rem',
                    zIndex: 1500
                  }}
                >
                  <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                    <Search size={16} style={{ position: 'absolute', top: '50%', left: '0.75rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Buscar projeto..."
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      autoFocus
                      style={{ paddingLeft: '2.25rem' }}
                    />
                  </div>
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => { setSelectedProjectId(''); setIsPickerOpen(false); setProjectSearch(''); }}
                      style={{
                        width: '100%', textAlign: 'left',
                        background: !selectedProjectId ? 'var(--bg-secondary)' : 'transparent',
                        border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px',
                        cursor: 'pointer', color: 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontSize: '0.9rem'
                      }}
                    >
                      <span>Todos os Projetos</span>
                      {!selectedProjectId && <Check size={14} style={{ color: 'var(--accent, #14B8A6)' }} />}
                    </button>
                    {filteredProjects.map(p => {
                      const isActive = String(p.id) === String(selectedProjectId);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => { setSelectedProjectId(p.id); setIsPickerOpen(false); setProjectSearch(''); }}
                          style={{
                            width: '100%', textAlign: 'left',
                            background: isActive ? 'var(--bg-secondary)' : 'transparent',
                            border: 'none', padding: '0.5rem 0.75rem', borderRadius: '6px',
                            cursor: 'pointer', color: 'var(--text-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: '0.9rem'
                          }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name}
                          </span>
                          {isActive && <Check size={14} style={{ color: 'var(--accent, #14B8A6)' }} />}
                        </button>
                      );
                    })}
                    {filteredProjects.length === 0 && (
                      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '1rem 0', margin: 0 }}>
                        Nenhum projeto encontrado
                      </p>
                    )}
                  </div>
                </div>,
                document.body
              )}
            </div>

            {/* Legenda customizada */}
            <div style={{ display: 'flex', gap: '1.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              {[
                { color: '#22C55E', label: 'Resolvido', count: stats.approved },
                { color: '#EF4444', label: 'Recusado', count: stats.rejected },
                { color: '#6B7280', label: 'Pendente', count: stats.pending },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabela de Bugs */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ fontSize: '1rem' }}>Bugs Registrados ({bugs.length})</h2>
          </div>
          <div style={{ overflowX: 'auto', flex: 1 }}>
          {bugs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Série</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Projeto</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Test Case</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Descrição</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Evidência</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Status</th>
                  <th style={{ padding: '0.5rem 0.6rem' }}>Data</th>
                </tr>
              </thead>
              <tbody>
                {pagedBugs.map(bug => (
                  <tr key={bug.id} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setDetailBug(bug)} className="hover-row">
                    <td style={{ padding: '0.55rem 0.6rem', fontWeight: 600, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                      {bug.serial_number}
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem', maxWidth: '140px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bug.project_name}>
                        {bug.project_name}
                      </div>
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem', maxWidth: '140px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bug.sprint_name}>
                        {bug.sprint_name}
                      </div>
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem', maxWidth: '220px' }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={bug.description}>
                        {bug.description}
                      </div>
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem', whiteSpace: 'nowrap' }}>
                      {bug.evidence_url ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`http://localhost:8000${bug.evidence_url}`, '_blank');
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.2rem 0.45rem', fontSize: '0.72rem' }}
                        >
                          <ImageIcon size={12} /> Ver
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem' }}>
                      <select
                        className="form-select"
                        style={{
                          padding: '0.2rem 0.4rem',
                          fontSize: '0.72rem',
                          width: '110px',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-input)',
                          color: bug.status === 'approved' ? '#22C55E' : bug.status === 'rejected' ? '#EF4444' : 'var(--text-primary)'
                        }}
                        value={bug.status || 'pending'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleUpdateStatus(bug.id, e.target.value)}
                      >
                        <option value="pending" style={{ color: '#6B7280' }}>● Pendente</option>
                        <option value="approved" style={{ color: '#22C55E' }}>● Resolvido</option>
                        <option value="rejected" style={{ color: '#EF4444' }}>● Recusado</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.55rem 0.6rem', color: 'var(--text-secondary)', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                      {formatDate(bug.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state" style={{ padding: '3rem' }}>
              <Bug size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
              <p className="empty-state-title">Nenhum bug encontrado</p>
              <p className="empty-state-text">O sistema está limpo por aqui.</p>
            </div>
          )}
          </div>
          {bugs.length > 0 && totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.6rem 1rem', borderTop: '1px solid var(--border)',
              fontSize: '0.78rem', color: 'var(--text-muted)'
            }}>
              <span>Página {currentPage} de {totalPages} · {bugs.length} bug(s)</span>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    width: '28px', height: '28px', borderRadius: '6px',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1, color: 'var(--text-primary)'
                  }}
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCurrentPage(n)}
                    style={{
                      background: n === currentPage ? 'var(--accent, #14B8A6)' : 'transparent',
                      color: n === currentPage ? 'white' : 'var(--text-primary)',
                      border: '1px solid ' + (n === currentPage ? 'var(--accent, #14B8A6)' : 'var(--border)'),
                      minWidth: '28px', height: '28px', padding: '0 0.4rem',
                      borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem',
                      fontWeight: n === currentPage ? 600 : 400
                    }}
                  >{n}</button>
                ))}
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    background: 'transparent', border: '1px solid var(--border)',
                    width: '28px', height: '28px', borderRadius: '6px',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1, color: 'var(--text-primary)'
                  }}
                >›</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Registro de Bug */}
      {isModalOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '2rem 1rem', boxSizing: 'border-box', overflowY: 'auto'
        }}>
          <div className="card" style={{
            maxWidth: '640px', width: '100%', padding: '1.25rem',
            margin: 'auto'
          }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>Registrar Novo Bug</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setIsModalOpen(false);
                if (location.search) navigate('/bugs', { replace: true });
              }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Projeto afetado *</label>
                <select
                  className="form-select"
                  required
                  value={formData.project_id}
                  onChange={handleProjectChange}
                >
                  <option value="" disabled>Selecione o projeto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {formData.project_id && (
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Test Case *</label>
                  <select
                    className="form-select"
                    required
                    value={formData.sprint_id}
                    onChange={(e) => setFormData({...formData, sprint_id: e.target.value})}
                  >
                    <option value="" disabled>Selecione o test case onde o bug ocorreu</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name} - ({s.status})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Descrição do Bug *</label>
                <textarea
                  className="form-input"
                  required
                  placeholder="Descreva detalhadamente o comportamento inesperado..."
                  style={{ minHeight: '120px', resize: 'vertical' }}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Evidência (Imagem) - Opcional</label>
                <div
                  className="file-drop-area"
                  style={{
                    border: '2px dashed var(--border)', borderRadius: '8px', padding: '2rem',
                    textAlign: 'center', cursor: 'pointer', background: 'var(--bg-secondary)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => document.getElementById('bug-evidence-upload').click()}
                >
                  <UploadCloud size={32} style={{ color: 'var(--accent)', marginBottom: '0.5rem' }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    {evidenceFile ? evidenceFile.name : 'Clique para selecionar uma imagem'}
                  </p>
                  <input
                    id="bug-evidence-upload"
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setEvidenceFile(e.target.files[0]);
                      }
                    }}
                  />
                </div>
                {evidenceFile && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>✓ Arquivo anexado</span>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ padding: '0 0.5rem' }} onClick={() => setEvidenceFile(null)}>
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setIsModalOpen(false);
                  if (location.search) navigate('/bugs', { replace: true });
                }}>Cancelar</button>
                <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando...' : 'Registrar Bug'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Detalhes do Bug (vindo da tela de projeto via ?bugId=) */}
      {detailBug && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '2rem 1rem', boxSizing: 'border-box', overflowY: 'auto'
        }}>
          <div className="card" style={{ maxWidth: '640px', width: '100%', padding: '1.25rem', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingBottom: '0.5rem' }}>
              <div>
                <h2 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bug size={18} style={{ color: 'var(--danger, #EF4444)' }} />
                  <span style={{ color: 'var(--danger, #EF4444)' }}>{detailBug.serial_number}</span>
                </h2>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Detalhes do bug
                </p>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => {
                setDetailBug(null);
                navigate('/bugs', { replace: true });
              }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Projeto</label>
                <div style={{ fontSize: '0.88rem' }}>{detailBug.project_name}</div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Test Case</label>
                <div style={{ fontSize: '0.88rem' }}>{detailBug.sprint_name}</div>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Status</label>
                <select
                  className="form-select"
                  style={{
                    fontSize: '0.82rem', padding: '0.3rem 0.5rem',
                    color: detailBug.status === 'approved' ? '#22C55E' : detailBug.status === 'rejected' ? '#EF4444' : 'var(--text-primary)'
                  }}
                  value={detailBug.status || 'pending'}
                  onChange={(e) => {
                    handleUpdateStatus(detailBug.id, e.target.value);
                    setDetailBug({ ...detailBug, status: e.target.value });
                  }}
                >
                  <option value="pending" style={{ color: '#6B7280' }}>● Pendente</option>
                  <option value="approved" style={{ color: '#22C55E' }}>● Resolvido</option>
                  <option value="rejected" style={{ color: '#EF4444' }}>● Recusado</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Registrado em</label>
                <div style={{ fontSize: '0.88rem' }}>{formatDate(detailBug.created_at)}</div>
              </div>
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Descrição</label>
              <textarea
                className="form-input"
                style={{
                  fontSize: '0.85rem', whiteSpace: 'pre-wrap',
                  padding: '0.65rem', borderRadius: '8px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  minHeight: '80px', resize: 'vertical', width: '100%'
                }}
                value={detailBug.description || ''}
                onChange={(e) => {
                  setDetailBug({ ...detailBug, description: e.target.value, isDirty: true });
                }}
              />
            </div>

            <div style={{ marginTop: '0.85rem' }}>
              <label className="form-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.3rem', display: 'block' }}>Evidência</label>
              {detailBug.evidence_url && !detailBug.newEvidenceFile && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <a href={`http://localhost:8000${detailBug.evidence_url}`} target="_blank" rel="noopener noreferrer">
                    <img
                      src={`http://localhost:8000${detailBug.evidence_url}`}
                      alt="Evidência"
                      style={{ maxWidth: '100%', maxHeight: '320px', borderRadius: '8px', border: '1px solid var(--border)', display: 'block' }}
                    />
                  </a>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => document.getElementById('edit-bug-evidence').click()}
                >
                  <UploadCloud size={14} /> {detailBug.evidence_url ? 'Alterar Imagem' : 'Anexar Imagem'}
                </button>
                {detailBug.newEvidenceFile && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>Nova imagem selecionada</span>
                )}
                <input
                  id="edit-bug-evidence"
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setDetailBug({ ...detailBug, newEvidenceFile: e.target.files[0], isDirty: true });
                    }
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => {
                setDetailBug(null);
                navigate('/bugs', { replace: true });
              }}>Fechar</button>
              {detailBug.isDirty && (
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    try {
                      let evidence_url = detailBug.evidence_url;
                      if (detailBug.newEvidenceFile) {
                        const uploadRes = await uploadsAPI.uploadEvidence(detailBug.newEvidenceFile);
                        evidence_url = uploadRes.data.url;
                      }
                      await bugsAPI.update(detailBug.id, {
                        description: detailBug.description,
                        evidence_url: evidence_url
                      });
                      loadBugs();
                      const updated = { ...detailBug, evidence_url, newEvidenceFile: null, isDirty: false };
                      setDetailBug(updated);
                      alert('Bug atualizado com sucesso!');
                    } catch (err) {
                      console.error('Erro ao salvar bug', err);
                      alert('Erro ao salvar bug');
                    }
                  }}
                >
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
