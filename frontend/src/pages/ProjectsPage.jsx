import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, parametersAPI } from '../services/api';
import { FolderPlus, Search, Calendar, Hash, FlaskConical, Code2, UserCircle, ClipboardList, Folder, Filter, X, Timer } from 'lucide-react';
import { useTimer, formatDurationShort } from '../context/TimerContext';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterClient, setFilterClient] = useState('');
  const [filterDev, setFilterDev] = useState('');
  const [filterQa, setFilterQa] = useState('');
  const [filterManager, setFilterManager] = useState('');

  const [parameters, setParameters] = useState([]);

  const { projectTotals, refreshTotals } = useTimer();

  useEffect(() => {
    loadProjects();
    loadParameters();
    refreshTotals();
  }, [refreshTotals]);

  const loadParameters = async () => {
    try {
      const res = await parametersAPI.list();
      setParameters(res.data.parameters || []);
    } catch (err) {
      console.error('Erro ao carregar parametros', err);
    }
  };

  const getOptions = (category) => parameters.filter(p => p.category === category);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Erro ao carregar projetos:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                        p.proposal_number?.toLowerCase().includes(search.toLowerCase());
    
    const matchClient = filterClient === '' || p.client_company === filterClient;
    const matchDev = filterDev === '' || p.developer_name === filterDev;
    const matchQa = filterQa === '' || p.qa_name === filterQa;
    const matchManager = filterManager === '' || p.manager_name === filterManager;

    return matchSearch && matchClient && matchDev && matchQa && matchManager;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Projetos</h1>
          <p className="page-subtitle">{projects.length} projeto(s) cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/projects/new')}>
          <FolderPlus size={16} /> Novo Projeto
        </button>
      </div>

      {projects.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '400px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="search-projects"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Buscar por nome ou nº proposta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <button 
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowFilters(!showFilters)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Filter size={16} /> Filtros Avançados
            </button>
            {(filterClient || filterDev || filterQa || filterManager) && (
              <button 
                className="btn btn-ghost"
                style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}
                onClick={() => { setFilterClient(''); setFilterDev(''); setFilterQa(''); setFilterManager(''); }}
              >
                Limpar Filtros
              </button>
            )}
          </div>

          {/* Filtros Expansíveis */}
          {showFilters && (
            <div className="card" style={{ marginTop: '1rem', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Empresa Cliente</label>
                <select className="form-input" value={filterClient} onChange={e => setFilterClient(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                  <option value="">Todas</option>
                  {getOptions('client').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Desenvolvedor(a)</label>
                <select className="form-input" value={filterDev} onChange={e => setFilterDev(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                  <option value="">Todos</option>
                  {getOptions('developer').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Analista QA</label>
                <select className="form-input" value={filterQa} onChange={e => setFilterQa(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                  <option value="">Todos</option>
                  {getOptions('qa').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', marginBottom: '0.2rem' }}>Gestor</label>
                <select className="form-input" value={filterManager} onChange={e => setFilterManager(e.target.value)} style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}>
                  <option value="">Todos</option>
                  {getOptions('manager').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="projects-grid">
          {filtered.map(project => {
            const total = (project.approved_count || 0) + (project.bug_count || 0) +
              (project.blocked_count || 0) + (project.rejected_count || 0) + (project.pending_count || 0);
            return (
              <div key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
                {project.client_company && (
                  <div style={{ 
                    display: 'inline-block',
                    fontSize: '0.7rem', 
                    fontWeight: 600, 
                    color: 'var(--accent)', 
                    backgroundColor: 'rgba(0, 128, 128, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {project.client_company}
                  </div>
                )}
                <h3 className="project-name">{project.name}</h3>
                <div className="project-meta">
                  {project.proposal_number && <span className="project-meta-item"><Hash size={12} /> {project.proposal_number}</span>}
                  {project.qa_name && <span className="project-meta-item"><FlaskConical size={12} /> {project.qa_name}</span>}
                  {project.developer_name && <span className="project-meta-item"><Code2 size={12} /> {project.developer_name}</span>}
                  {project.manager_name && <span className="project-meta-item"><UserCircle size={12} /> {project.manager_name}</span>}
                </div>
                <div className="project-meta">
                  <span className="project-meta-item">
                    <Calendar size={12} /> {formatDate(project.created_at)}
                  </span>
                  <span className="project-meta-item"><ClipboardList size={12} /> {project.sprint_count || 0} test cases</span>
                  {projectTotals[project.id] > 0 && (
                    <span className="project-meta-item" title="Tempo total registrado neste projeto" style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      <Timer size={12} /> {formatDurationShort(projectTotals[project.id])}
                    </span>
                  )}
                </div>
                {total > 0 && (
                  <div className="project-stats-bar">
                    <div style={{ width: `${(project.approved_count / total) * 100}%`, background: 'var(--status-approved)' }} />
                    <div style={{ width: `${(project.bug_count / total) * 100}%`, background: 'var(--status-bug)' }} />
                    <div style={{ width: `${(project.blocked_count / total) * 100}%`, background: 'var(--status-blocked)' }} />
                    <div style={{ width: `${(project.rejected_count / total) * 100}%`, background: 'var(--status-rejected)' }} />
                    <div style={{ width: `${(project.pending_count / total) * 100}%`, background: 'var(--status-pending)' }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <Folder size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.4 }} />
            <p className="empty-state-title">
              {search ? 'Nenhum projeto encontrado' : 'Nenhum projeto criado'}
            </p>
            <p className="empty-state-text">
              {search ? 'Tente outra busca' : 'Clique em "Novo Projeto" para começar'}
            </p>
            {!search && (
              <button className="btn btn-primary mt-2" onClick={() => navigate('/projects/new')}>
                <FolderPlus size={16} /> Criar Projeto
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
