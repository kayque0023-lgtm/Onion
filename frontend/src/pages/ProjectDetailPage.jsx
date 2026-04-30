import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, sprintsAPI, stepsAPI, commentsAPI, uploadsAPI, parametersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusSummaryPanel from '../components/StatusSummaryPanel';
import PermissionRequestBanner from '../components/PermissionRequestBanner';
import { ArrowLeft, Plus, Trash2, Send, Edit3, Save, X, FileText, ExternalLink, UploadCloud, ClipboardList, FlaskConical, Code2, UserCircle, MessageSquare, TestTube2, Bug, Hash, Download, Loader2, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp, DownloadCloud, CheckCircle, AlertTriangle, Filter, Search, Check } from 'lucide-react';
import { generateProjectPdf } from '../services/reportPdf';

const STATUS_OPTIONS = [
  { value: 'pending_approval', label: 'Pendente 🟣' },
  { value: 'approved', label: 'Aprovado (Passed) 🟢' },
  { value: 'rejected', label: 'Rejeitado (Failed) 🔴' },
  { value: 'blocked', label: 'Bloqueado 🟠' },
  { value: 'bug', label: 'Bug ⚫' }
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const [project, setProject] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [comments, setComments] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newSprintName, setNewSprintName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [newSteps, setNewSteps] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [statusFilter, setStatusFilter] = useState(null);
  const [parameters, setParameters] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (isEditing) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isEditing]);

  // Load/persist expand state per project
  const getStorageKey = useCallback(() => `tc_expanded_${id}`, [id]);

  const toggleCard = (sprintId) => {
    setExpandedCards(prev => {
      const next = { ...prev, [sprintId]: !prev[sprintId] };
      localStorage.setItem(getStorageKey(), JSON.stringify(next));
      return next;
    });
  };

  const setAllExpanded = (val) => {
    const next = {};
    sprints.forEach(s => { next[s.id] = val; });
    localStorage.setItem(getStorageKey(), JSON.stringify(next));
    setExpandedCards(next);
  };

  // Agrupa bugs por test case (sprint) para o card "Bugs Linkados"
  const linkedBugsBySprint = useMemo(() => {
    const groups = new Map();
    bugs.forEach(b => {
      if (!groups.has(b.sprint_id)) {
        groups.set(b.sprint_id, { sprint_id: b.sprint_id, sprint_name: b.sprint_name, bugs: [] });
      }
      groups.get(b.sprint_id).bugs.push(b);
    });
    return Array.from(groups.values());
  }, [bugs]);

  const openBugInBugsPage = (bugId) => {
    navigate(`/bugs?bugId=${bugId}&projectId=${id}`);
  };

  // Picker de filtro por status (na seção Test Cases)
  const STATUS_FILTER_OPTIONS = [
    { value: null, label: 'Todos os status', color: 'var(--text-muted)' },
    { value: 'approved', label: 'Aprovado', color: '#22C55E' },
    { value: 'rejected', label: 'Rejeitado', color: '#EF4444' },
    { value: 'blocked', label: 'Bloqueado', color: '#F59E0B' },
    { value: 'pending', label: 'Pendente', color: '#A855F7' },
    { value: 'bugs', label: 'Bug', color: '#374151' },
  ];
  const [isStatusPickerOpen, setIsStatusPickerOpen] = useState(false);
  const [statusSearch, setStatusSearch] = useState('');
  const [statusPickerPos, setStatusPickerPos] = useState({ top: 0, left: 0, width: 0 });
  const statusBtnRef = useRef(null);
  const statusPickerRef = useRef(null);

  const computeStatusPickerPos = () => {
    if (!statusBtnRef.current) return;
    const rect = statusBtnRef.current.getBoundingClientRect();
    setStatusPickerPos({ top: rect.bottom + 6, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    if (!isStatusPickerOpen) return;
    computeStatusPickerPos();
    const handleClickOutside = (e) => {
      if (
        statusPickerRef.current && !statusPickerRef.current.contains(e.target) &&
        statusBtnRef.current && !statusBtnRef.current.contains(e.target)
      ) {
        setIsStatusPickerOpen(false);
        setStatusSearch('');
      }
    };
    const handleReposition = () => computeStatusPickerPos();
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isStatusPickerOpen]);

  const filteredStatusOptions = useMemo(
    () => STATUS_FILTER_OPTIONS.filter(o => o.label.toLowerCase().includes(statusSearch.toLowerCase())),
    [statusSearch]
  );
  const currentStatusOption = STATUS_FILTER_OPTIONS.find(o => o.value === statusFilter) || STATUS_FILTER_OPTIONS[0];

  useEffect(() => {
    loadProject();
    loadParameters();
  }, [id]);

  const loadParameters = async () => {
    try {
      const res = await parametersAPI.list();
      setParameters(res.data.parameters || []);
    } catch (err) {
      console.error('Erro ao carregar parametros', err);
    }
  };

  const getOptions = (category) => parameters.filter(p => p.category === category);

  const startEditing = () => {
    setEditForm({
      name: project.name || '',
      proposal_number: project.proposal_number || '',
      developer_name: project.developer_name || '',
      qa_name: project.qa_name || '',
      manager_name: project.manager_name || '',
      client_company: project.client_company || '',
      scope_summary: project.scope_summary || '',
      status: project.status || 'active'
    });
    setEditFile(null);
    setIsEditing(true);
  };

  const handleSaveProject = async () => {
    if (!editForm.name.trim()) {
      showToast('O nome do projeto é obrigatório.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      let attachment_path = project.attachment_path;
      if (editFile) {
        const uploadRes = await uploadsAPI.uploadScope(editFile);
        attachment_path = uploadRes.data.url || uploadRes.data.file_path;
      }

      const res = await projectsAPI.update(project.id, {
        ...editForm,
        attachment_path
      });
      setProject(res.data.project);
      setEditFile(null);
      setIsEditing(false);
      showToast('Projeto atualizado com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar projeto.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const loadProject = async () => {
    try {
      const res = await projectsAPI.get(id);
      setProject(res.data.project);
      const loadedSprints = res.data.sprints || [];
      setSprints(loadedSprints);
      setComments(res.data.comments || []);
      setBugs(res.data.bugs || []);
      const saved = localStorage.getItem(`tc_expanded_${id}`);
      if (saved) {
        setExpandedCards(JSON.parse(saved));
      } else {
        const init = {};
        loadedSprints.forEach(s => { init[s.id] = true; });
        setExpandedCards(init);
      }
    } catch (err) {
      console.error('Erro ao carregar projeto:', err);
      if (err.response?.status === 404) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const addSprint = async () => {
    if (!newSprintName.trim()) return;
    try {
      const res = await sprintsAPI.create(id, { name: newSprintName });
      const newSprint = res.data.sprint;
      setSprints(prev => [...prev, newSprint]);
      setExpandedCards(prev => ({ ...prev, [newSprint.id]: true }));
      setNewSprintName('');
    } catch (err) {
      alert('Erro ao criar sprint');
    }
  };

  const updateSprintStatus = async (sprintId, status) => {
    if (status === 'bug') {
      navigate(`/bugs?new=true&projectId=${id}&sprintId=${sprintId}`);
      return;
    }
    setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, status } : s));
    try {
      const res = await sprintsAPI.update(sprintId, { status });
      setSprints(prev => prev.map(s => s.id === sprintId ? res.data.sprint : s));
    } catch (err) {
      alert('Erro ao atualizar status');
      loadProject();
    }
  };

  const deleteSprint = async (sprintId) => {
    if (!window.confirm('Excluir este test case e todos os steps?')) return;
    try {
      await sprintsAPI.delete(sprintId);
      setSprints(sprints.filter(s => s.id !== sprintId));
    } catch (err) {
      alert('Erro ao excluir sprint');
    }
  };

  const addStep = async (sprintId) => {
    const desc = newSteps[sprintId];
    if (!desc?.trim()) return;
    try {
      const res = await stepsAPI.create(sprintId, { description: desc, image_path: null });
      setSprints(sprints.map(s => {
        if (s.id === sprintId) {
          return { ...s, steps: [...(s.steps || []), res.data.step] };
        }
        return s;
      }));
      setNewSteps({ ...newSteps, [sprintId]: '' });
    } catch (err) {
      console.error('Erro ao criar step:', err);
      alert('Erro ao criar step');
    }
  };

  const uploadStepImage = async (stepId, sprintId, file) => {
    try {
      const uploadRes = await uploadsAPI.uploadEvidence(file);
      const image_path = uploadRes.data.url || uploadRes.data.file_path;
      const res = await stepsAPI.update(stepId, { image_path });
      setSprints(sprints.map(s => {
        if (s.id === sprintId) {
          return {
            ...s,
            steps: s.steps.map(st => st.id === stepId ? { ...st, image_path: res.data.step.image_path } : st)
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('Erro ao fazer upload da imagem do step:', err);
      alert('Erro ao anexar imagem ao passo de teste.');
    }
  };

  const removeStepImage = async (stepId, sprintId) => {
    try {
      await stepsAPI.update(stepId, { image_path: null });
      setSprints(sprints.map(s => {
        if (s.id === sprintId) {
          return {
            ...s,
            steps: s.steps.map(st => st.id === stepId ? { ...st, image_path: null } : st)
          };
        }
        return s;
      }));
    } catch (err) {
      console.error('Erro ao remover a imagem do step:', err);
      alert('Erro ao remover imagem do passo de teste.');
    }
  };

  const deleteStep = async (stepId, sprintId) => {
    try {
      await stepsAPI.delete(stepId);
      setSprints(sprints.map(s => {
        if (s.id === sprintId) {
          return { ...s, steps: s.steps.filter(st => st.id !== stepId) };
        }
        return s;
      }));
    } catch (err) {
      alert('Erro ao excluir step');
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await commentsAPI.create(id, { content: newComment });
      setComments([res.data.comment, ...comments]);
      setNewComment('');
    } catch (err) {
      alert('Erro ao adicionar comentário');
    }
  };

  const deleteProject = async () => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita.'))
      return;
    try {
      await projectsAPI.delete(id);
      navigate('/projects');
    } catch (err) {
      alert('Erro ao excluir projeto');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const [generatingPdf, setGeneratingPdf] = useState(false);

  const handleExtractReport = async () => {
    if (!project || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      await generateProjectPdf(project, sprints, bugs);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar o relatório PDF. Tente novamente.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) return <div className="loading-container"><div className="spinner" /></div>;
  if (!project) return null;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title">{project.name}</h1>
            <div className="project-meta" style={{ marginTop: '0.25rem' }}>
              {project.proposal_number && <span className="project-meta-item"><Hash size={12} /> {project.proposal_number}</span>}
              {project.qa_name && <span className="project-meta-item"><FlaskConical size={12} /> {project.qa_name}</span>}
              {project.developer_name && <span className="project-meta-item"><Code2 size={12} /> {project.developer_name}</span>}
              {project.manager_name && <span className="project-meta-item"><UserCircle size={12} /> {project.manager_name}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={handleExtractReport} disabled={generatingPdf}>
            {generatingPdf ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
            {generatingPdf ? 'Gerando PDF...' : 'Extrair Relatório'}
          </button>
          {canEdit() && (
            <>
              <button className="btn btn-secondary btn-sm" onClick={startEditing}>
                <Edit3 size={14} /> Editar
              </button>
              <button className="btn btn-danger btn-sm" onClick={deleteProject}>
                <Trash2 size={14} /> Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {(project.scope_summary || project.attachment_path) && (
        <div className="card mb-2">
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FileText size={16} style={{ color: 'var(--accent)' }} /> Escopo</h2>
          </div>
          {project.scope_summary && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {project.scope_summary}
            </p>
          )}
          {project.attachment_path && (
            <div className="file-preview mt-1" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <FileText size={24} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span className="file-preview-name" style={{ display: 'block', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <FileText size={14} style={{ display: 'inline', marginRight: '4px' }} /> Arquivo do escopo
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {project.attachment_path.split('/').pop()}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a
                  href={`http://localhost:8000${project.attachment_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0, textDecoration: 'none' }}
                >
                  <ExternalLink size={14} /> Visualizar
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      <StatusSummaryPanel
        sprints={sprints}
        bugs={bugs}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      <PermissionRequestBanner />

      {canEdit() && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => alert('Em breve!')}>
            <UploadCloud size={16} /> Importar testes
          </button>
          <button className="btn btn-secondary" onClick={() => alert('Em breve!')}>
            <DownloadCloud size={16} /> Exportar modelo
          </button>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr minmax(280px, 360px)',
        gap: '1rem',
        alignItems: 'stretch',
        marginBottom: '2rem'
      }}>
        <div className="card tc-compact" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', margin: 0 }}><TestTube2 size={16} style={{ color: 'var(--accent)' }} /> Test Cases</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
            {statusFilter && (
              <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter(null)} style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}>✕ Limpar filtro</button>
            )}
            <button className="btn btn-ghost btn-sm" title="Expandir todos" onClick={() => setAllExpanded(true)} style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}><ChevronsUpDown size={12} /> Expandir</button>
            <button className="btn btn-ghost btn-sm" title="Minimizar todos" onClick={() => setAllExpanded(false)} style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}><ChevronsDownUp size={12} /> Minimizar</button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sprints.length} caso(s)</span>
          </div>
        </div>

        {/* Filtro de status com busca */}
        <button
          ref={statusBtnRef}
          type="button"
          onClick={() => setIsStatusPickerOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.5rem', width: '100%', marginBottom: '0.5rem',
            padding: '0.4rem 0.65rem', borderRadius: '8px',
            border: '1px solid var(--border)', background: 'var(--bg-input, var(--bg-secondary))',
            color: 'var(--text-primary)', cursor: 'pointer',
            fontSize: '0.8rem'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Filtro:</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentStatusOption.color, display: 'inline-block' }} />
              {currentStatusOption.label}
            </span>
          </span>
          <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
        </button>

        {canEdit() && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <input className="form-input" placeholder="Nome do test case..."
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.6rem' }}
              value={newSprintName} onChange={e => setNewSprintName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSprint(); }}
            />
            <button className="btn btn-primary btn-sm" onClick={addSprint} style={{ fontSize: '0.78rem' }}>
              <Plus size={14} /> Adicionar
            </button>
          </div>
        )}

        {/* Popover do filtro de status (via portal) */}
        {isStatusPickerOpen && createPortal(
          <div
            ref={statusPickerRef}
            style={{
              position: 'fixed',
              top: statusPickerPos.top, left: statusPickerPos.left,
              width: Math.max(statusPickerPos.width, 240),
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.25)',
              padding: '0.6rem',
              zIndex: 1500
            }}
          >
            <div style={{ position: 'relative', marginBottom: '0.4rem' }}>
              <Search size={13} style={{ position: 'absolute', top: '50%', left: '0.6rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Buscar status..."
                value={statusSearch}
                onChange={e => setStatusSearch(e.target.value)}
                autoFocus
                style={{ paddingLeft: '2rem', fontSize: '0.78rem', padding: '0.35rem 0.5rem 0.35rem 2rem' }}
              />
            </div>
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {filteredStatusOptions.map(opt => {
                const isActive = opt.value === statusFilter;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => {
                      setStatusFilter(opt.value);
                      setIsStatusPickerOpen(false);
                      setStatusSearch('');
                    }}
                    style={{
                      width: '100%', textAlign: 'left',
                      background: isActive ? 'var(--bg-secondary)' : 'transparent',
                      border: 'none', padding: '0.4rem 0.6rem', borderRadius: '6px',
                      cursor: 'pointer', color: 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      fontSize: '0.82rem'
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color, display: 'inline-block' }} />
                      {opt.label}
                    </span>
                    {isActive && <Check size={13} style={{ color: 'var(--accent, #008080)' }} />}
                  </button>
                );
              })}
              {filteredStatusOptions.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', padding: '0.6rem 0', margin: 0 }}>
                  Nenhum status encontrado
                </p>
              )}
            </div>
          </div>,
          document.body
        )}

        {sprints
          .filter(s => !statusFilter ||
            (statusFilter === 'approved' && s.status === 'approved') ||
            (statusFilter === 'rejected' && s.status === 'rejected') ||
            (statusFilter === 'blocked'  && s.status === 'blocked')  ||
            (statusFilter === 'bugs'     && s.status === 'bug')      ||
            (statusFilter === 'pending'  && !['approved','rejected','blocked','bug'].includes(s.status))
          )
          .map((sprint, index) => {
            const isExpanded = expandedCards[sprint.id] !== false;
            const sprintBugs = bugs.filter(b => b.sprint_id === sprint.id);
            return (
              <div key={sprint.id} className="sprint-card">
                <div className="sprint-header" style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard(sprint.id)}
                >
                  <div className="sprint-name" style={{ flexWrap: 'wrap' }}>
                    <button
                      aria-expanded={isExpanded}
                      onClick={e => { e.stopPropagation(); toggleCard(sprint.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <ClipboardList size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} /> {index + 1} - {sprint.name}
                    <StatusBadge status={sprint.status} />
                    {sprintBugs.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={e => { e.stopPropagation(); openBugInBugsPage(b.id); }}
                        title={b.description}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                          padding: '0.12rem 0.4rem',
                          fontSize: '0.68rem', fontWeight: 600,
                          borderRadius: '999px',
                          border: '1px solid ' + (
                            b.status === 'approved' ? '#22C55E' :
                            b.status === 'rejected' ? '#EF4444' : '#6B7280'
                          ),
                          color: b.status === 'approved' ? '#22C55E' :
                                 b.status === 'rejected' ? '#EF4444' : '#6B7280',
                          background: 'transparent',
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Bug size={9} /> {b.serial_number}
                      </button>
                    ))}
                  </div>
                  <div className="sprint-actions" onClick={e => e.stopPropagation()}>
                    {canEdit() && (
                      <select
                        className="form-select"
                        style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.75rem', fontSize: '0.8rem' }}
                        value={sprint.status}
                        onChange={e => updateSprintStatus(sprint.id, e.target.value)}
                      >
                        {STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    {canEdit() && (
                      <button className="btn btn-danger btn-icon btn-sm" onClick={() => deleteSprint(sprint.id)} title="Excluir test case">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="sprint-body">
                    {sprint.steps?.length > 0 && (
                      <ul className="step-list">
                        {sprint.steps.map((stepItem, sti) => (
                          <li key={stepItem.id} className="step-item">
                            <div className="step-number">{sti + 1}</div>
                            <div className="step-content">
                              <p className="step-description">{stepItem.description}</p>
                              {stepItem.image_path && (
                                <div style={{ marginTop: '0.75rem' }}>
                                  <a href={`http://localhost:8000${stepItem.image_path}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block' }}>
                                    <img src={`http://localhost:8000${stepItem.image_path}`} alt="Evidência" style={{ maxHeight: '150px', borderRadius: '6px', border: '1px solid var(--border)', objectFit: 'contain' }} />
                                  </a>
                                </div>
                              )}
                            </div>
                            {canEdit() && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <button className="btn btn-ghost btn-icon btn-sm" title="Anexar Imagem ao Passo" onClick={() => document.getElementById(`upload-step-${stepItem.id}`).click()}>
                                  <UploadCloud size={14} />
                                </button>
                                {stepItem.image_path && (
                                  <button className="btn btn-ghost btn-icon btn-sm" title="Remover Imagem" onClick={() => removeStepImage(stepItem.id, sprint.id)}>
                                    <X size={14} style={{ color: 'var(--danger)' }} />
                                  </button>
                                )}
                                <input id={`upload-step-${stepItem.id}`} type="file" accept="image/*" style={{ display: 'none' }}
                                  onChange={e => e.target.files[0] && uploadStepImage(stepItem.id, sprint.id, e.target.files[0])}
                                />
                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => deleteStep(stepItem.id, sprint.id)} title="Excluir passo">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {canEdit() && (
                      <div className="add-step-form">
                        <input className="form-input" placeholder="Adicionar passo de teste..."
                          value={newSteps[sprint.id] || ''}
                          onChange={e => setNewSteps({ ...newSteps, [sprint.id]: e.target.value })}
                          onKeyDown={e => { if (e.key === 'Enter') addStep(sprint.id); }}
                        />
                        <button className="btn btn-secondary btn-sm" onClick={() => addStep(sprint.id)}>
                          <Plus size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {!isExpanded && (
                  <div style={{ padding: '0.3rem 1rem 0.6rem 2.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {sprint.steps?.length || 0} passo(s)
                  </div>
                )}
              </div>
            );
          })
        }
        </div>

        {/* Card direito: Bugs Linkados */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
          <div style={{
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem'
          }}>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.95rem', margin: 0 }}>
              <Bug size={16} style={{ color: 'var(--danger, #EF4444)' }} /> Bugs Linkados
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{bugs.length} bug(s)</span>
          </div>
          <div style={{ overflowY: 'auto', flex: 1, padding: '0.6rem 0.85rem' }}>
            {linkedBugsBySprint.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '1.5rem 1rem', color: 'var(--text-muted)', textAlign: 'center', gap: '0.5rem',
                height: '100%'
              }}>
                <Bug size={28} style={{ opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: '0.82rem' }}>Nenhum bug registrado neste projeto</p>
              </div>
            ) : (
              linkedBugsBySprint.map(group => (
                <div key={group.sprint_id} style={{ marginBottom: '0.85rem' }}>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '0.4rem',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }} title={group.sprint_name}>
                    <ClipboardList size={11} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.sprint_name}</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {group.bugs.map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => openBugInBugsPage(b.id)}
                        title={b.description}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.72rem', fontWeight: 600,
                          borderRadius: '999px',
                          border: '1px solid ' + (
                            b.status === 'approved' ? '#22C55E' :
                            b.status === 'rejected' ? '#EF4444' : '#6B7280'
                          ),
                          background: 'transparent',
                          color: b.status === 'approved' ? '#22C55E' :
                                 b.status === 'rejected' ? '#EF4444' : '#6B7280',
                          cursor: 'pointer',
                          transition: 'background 0.15s, transform 0.1s'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Bug size={10} /> {b.serial_number}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={16} style={{ color: 'var(--accent)' }} /> Comentários ({comments.length})</h2>
        </div>
        <div className="comment-form">
          <input className="form-input" placeholder="Adicionar comentário sobre os testes..."
            value={newComment} onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addComment(); }}
          />
          <button className="btn btn-primary" onClick={addComment}>
            <Send size={16} />
          </button>
        </div>
        {comments.length > 0 ? (
          <div className="activity-feed">
            {comments.map(comment => (
              <div key={comment.id} className="activity-item">
                <div className="activity-avatar">{comment.user_name?.charAt(0)?.toUpperCase() || 'U'}</div>
                <div className="activity-content">
                  <div className="activity-header">
                    <span className="activity-user">{comment.user_name}</span>
                    <span className="activity-time">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="activity-text">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p className="empty-state-text">Nenhum comentário ainda</p>
          </div>
        )}
      </div>

      {isEditing && createPortal(
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
              <h2 className="card-title" style={{ margin: 0 }}>Editar Projeto</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsEditing(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Nome do Projeto *</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Nº da Proposta</label>
                  <input className="form-input" value={editForm.proposal_number} onChange={e => setEditForm({...editForm, proposal_number: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Desenvolvedor(a)</label>
                  <select className="form-input" value={editForm.developer_name} onChange={e => setEditForm({...editForm, developer_name: e.target.value})} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione...</option>
                    {getOptions('developer').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>QA</label>
                  <select className="form-input" value={editForm.qa_name} onChange={e => setEditForm({...editForm, qa_name: e.target.value})} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione...</option>
                    {getOptions('qa').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Gestor / Solicitante</label>
                  <select className="form-input" value={editForm.manager_name} onChange={e => setEditForm({...editForm, manager_name: e.target.value})} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione...</option>
                    {getOptions('manager').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Empresa Cliente</label>
                  <select className="form-input" value={editForm.client_company} onChange={e => setEditForm({...editForm, client_company: e.target.value})} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione uma empresa...</option>
                    {getOptions('client').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Resumo do Escopo</label>
                <textarea className="form-input" style={{ minHeight: '70px', resize: 'vertical' }} value={editForm.scope_summary} onChange={e => setEditForm({...editForm, scope_summary: e.target.value})} />
              </div>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Novo Arquivo de Escopo (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button className="btn btn-secondary" onClick={() => document.getElementById('edit-scope-upload').click()}>
                    <UploadCloud size={16} /> Selecionar Arquivo
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {editFile ? editFile.name : (project.attachment_path ? 'Manter arquivo atual' : 'Nenhum arquivo novo')}
                  </span>
                  <input id="edit-scope-upload" type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && setEditFile(e.target.files[0])} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSaveProject} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : <Save size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />}
                  {isSaving ? '' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

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
