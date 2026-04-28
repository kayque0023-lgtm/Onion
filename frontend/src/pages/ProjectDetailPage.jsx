import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectsAPI, sprintsAPI, stepsAPI, commentsAPI, uploadsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import StatusBadge from '../components/StatusBadge';
import StatusSummaryPanel from '../components/StatusSummaryPanel';
import PermissionRequestBanner from '../components/PermissionRequestBanner';
import { ArrowLeft, Plus, Trash2, Send, Edit3, Save, X, FileText, ExternalLink, UploadCloud, ClipboardList, FlaskConical, Code2, UserCircle, MessageSquare, TestTube2, Bug, Hash, Download, Loader2, ChevronDown, ChevronRight, ChevronsUpDown, ChevronsDownUp } from 'lucide-react';
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
  const [newStepImage, setNewStepImage] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedCards, setExpandedCards] = useState({});
  const [statusFilter, setStatusFilter] = useState(null);

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

  useEffect(() => {
    loadProject();
  }, [id]);

  const startEditing = () => {
    setEditForm({
      name: project.name || '',
      proposal_number: project.proposal_number || '',
      developer_name: project.developer_name || '',
      qa_name: project.qa_name || '',
      manager_name: project.manager_name || '',
      scope_summary: project.scope_summary || '',
      status: project.status || 'active'
    });
    setEditFile(null);
    setIsEditing(true);
  };

  const handleSaveProject = async () => {
    if (!editForm.name.trim()) return alert('O nome do projeto é obrigatório.');
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
      setIsEditing(false);
    } catch (err) {
      alert('Erro ao salvar projeto');
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
      // Load persisted expand state
      const saved = localStorage.getItem(`tc_expanded_${id}`);
      if (saved) {
        setExpandedCards(JSON.parse(saved));
      } else {
        // All expanded by default
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
    // Optimistic update
    setSprints(prev => prev.map(s => s.id === sprintId ? { ...s, status } : s));
    try {
      const res = await sprintsAPI.update(sprintId, { status });
      setSprints(prev => prev.map(s => s.id === sprintId ? res.data.sprint : s));
    } catch (err) {
      alert('Erro ao atualizar status');
      loadProject(); // revert
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
      {/* Header */}
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

      {/* Scope */}
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
                <button
                  onClick={async () => {
                    try {
                      const url = `http://localhost:8000${project.attachment_path}`;
                      const response = await fetch(url);
                      const blob = await response.blob();
                      const blobUrl = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = blobUrl;
                      a.download = project.attachment_path.split('/').pop() || 'escopo';
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(blobUrl);
                    } catch (error) {
                      console.error('Erro ao baixar o arquivo:', error);
                      const link = document.createElement('a');
                      link.href = `http://localhost:8000${project.attachment_path}`;
                      link.download = project.attachment_path.split('/').pop() || 'escopo';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}
                >
                  <Download size={14} /> Baixar
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Summary Panel */}
      <StatusSummaryPanel
        sprints={sprints}
        bugs={bugs}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />

      {/* Permission Banner for viewers */}
      <PermissionRequestBanner />

      {/* Test Cases Section */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><TestTube2 size={18} style={{ color: 'var(--accent)' }} /> Test Cases</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {statusFilter && (
              <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter(null)} style={{ fontSize: '0.78rem' }}>✕ Limpar filtro</button>
            )}
            <button className="btn btn-ghost btn-sm" title="Expandir todos" onClick={() => setAllExpanded(true)}><ChevronsUpDown size={14} /> Expandir todos</button>
            <button className="btn btn-ghost btn-sm" title="Minimizar todos" onClick={() => setAllExpanded(false)}><ChevronsDownUp size={14} /> Minimizar todos</button>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{sprints.length} caso(s)</span>
          </div>
        </div>

        {/* Add Test Case - only for editors/admins */}
        {canEdit() && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input className="form-input" placeholder="Nome do test case..."
              value={newSprintName} onChange={e => setNewSprintName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addSprint(); }}
            />
            <button className="btn btn-primary" onClick={addSprint}>
              <Plus size={16} /> Adicionar
            </button>
          </div>
        )}

        {/* Test Case Cards */}
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
            return (
              <div key={sprint.id} className="sprint-card">
                {/* Header — always visible */}
                <div className="sprint-header" style={{ cursor: 'pointer' }}
                  onClick={() => toggleCard(sprint.id)}
                >
                  <div className="sprint-name">
                    <button
                      aria-expanded={isExpanded}
                      onClick={e => { e.stopPropagation(); toggleCard(sprint.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    >
                      {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                    </button>
                    <ClipboardList size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} /> {index + 1} - {sprint.name}
                    <StatusBadge status={sprint.status} />
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
                {/* Body — collapsible */}
                {isExpanded && (
                  <div className="sprint-body">
                    {sprint.steps?.length > 0 && (
                      <ul className="step-list">
                        {sprint.steps.map((stepItem, sti) => (
                          <li key={stepItem.id} className="step-item">
                            <div className="step-number">{sti + 1}</div>
                            <div className="step-content">
                              <p className="step-description">{stepItem.description}</p>
                              {stepItem.expected_result && (
                                <p className="step-expected">Esperado: {stepItem.expected_result}</p>
                              )}
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
                {/* Collapsed summary */}
                {!isExpanded && (
                  <div style={{ padding: '0.3rem 1rem 0.6rem 2.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {sprint.steps?.length || 0} passo(s)
                  </div>
                )}
              </div>
            );
          })
        }

        {sprints.length === 0 && (
          <div className="card">
            <div className="empty-state">
              <TestTube2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.4 }} />
              <p className="empty-state-title">Nenhum test case criado</p>
              <p className="empty-state-text">Adicione test cases para organizar seus testes</p>
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
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
                <div className="activity-avatar">
                  {comment.user_name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
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

      {/* Edit Modal */}
      {isEditing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="card-title">Editar Projeto</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsEditing(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Nome do Projeto *</label>
                <input className="form-input" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Nº da Proposta</label>
                  <input className="form-input" value={editForm.proposal_number} onChange={e => setEditForm({...editForm, proposal_number: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Analista QA</label>
                  <input className="form-input" value={editForm.qa_name} onChange={e => setEditForm({...editForm, qa_name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Desenvolvedor</label>
                  <input className="form-input" value={editForm.developer_name} onChange={e => setEditForm({...editForm, developer_name: e.target.value})} />
                </div>
                <div>
                  <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Gestor / Solicitante</label>
                  <input className="form-input" value={editForm.manager_name} onChange={e => setEditForm({...editForm, manager_name: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Resumo do Escopo</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '100px', resize: 'vertical' }}
                  value={editForm.scope_summary} 
                  onChange={e => setEditForm({...editForm, scope_summary: e.target.value})} 
                />
              </div>

              <div>
                <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block' }}>Novo Arquivo de Escopo (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => document.getElementById('edit-scope-upload').click()}
                  >
                    <UploadCloud size={16} /> Selecionar Arquivo
                  </button>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {editFile ? editFile.name : (project.attachment_path ? 'Manter arquivo atual' : 'Nenhum arquivo novo')}
                  </span>
                  <input 
                    id="edit-scope-upload" 
                    type="file" 
                    style={{ display: 'none' }} 
                    onChange={e => e.target.files[0] && setEditFile(e.target.files[0])}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSaveProject} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : <Save size={16} style={{ display: 'inline', marginRight: '0.5rem' }} />} 
                  {isSaving ? '' : 'Salvar'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
