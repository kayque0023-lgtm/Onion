import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsAPI, uploadsAPI, sprintsAPI, stepsAPI, parametersAPI } from '../services/api';
import { useDropzone } from 'react-dropzone';
import { ChevronRight, ChevronLeft, Check, Upload, Plus, Trash2, FileText, ClipboardList, TestTube2 } from 'lucide-react';

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState(null);

  // Step 1 - Info
  const [name, setName] = useState('');
  const [proposalNumber, setProposalNumber] = useState('');
  const [developerName, setDeveloperName] = useState('');
  const [qaName, setQaName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [ktDate, setKtDate] = useState('');
  const [testDate, setTestDate] = useState('');

  const [parameters, setParameters] = useState([]);

  useEffect(() => {
    loadParameters();
  }, []);

  const loadParameters = async () => {
    try {
      const res = await parametersAPI.list();
      setParameters(res.data.parameters || []);
    } catch (err) {
      console.error('Erro ao carregar parametros', err);
    }
  };

  const getOptions = (category) => parameters.filter(p => p.category === category);

  // Step 2 - Escopo
  const [scopeSummary, setScopeSummary] = useState('');
  const [file, setFile] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Step 3 - Sprints
  const [sprints, setSprints] = useState([]);
  const [newSprintName, setNewSprintName] = useState('');

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) setFile(acceptedFiles[0]);
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleStep1 = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await projectsAPI.create({
        name, proposal_number: proposalNumber,
        developer_name: developerName, qa_name: qaName, manager_name: managerName,
        client_company: clientCompany || null,
        kt_date: ktDate || null,
        test_date: testDate || null
      });
      setProjectId(res.data.project.id);
      setStep(2);
    } catch (err) {
      alert('Erro ao criar projeto: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async () => {
    setLoading(true);
    try {
      let attachmentPath = null;
      if (file) {
        const uploadRes = await uploadsAPI.uploadScope(file);
        attachmentPath = uploadRes.data.url;
        setUploadedFile(uploadRes.data);
      }
      await projectsAPI.update(projectId, {
        scope_summary: scopeSummary,
        attachment_path: attachmentPath
      });
      setStep(3);
    } catch (err) {
      alert('Erro ao salvar escopo: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const addSprint = async () => {
    if (!newSprintName.trim()) return;
    try {
      const res = await sprintsAPI.create(projectId, { name: newSprintName });
      setSprints([...sprints, { ...res.data.sprint, steps: [], newStep: '' }]);
      setNewSprintName('');
    } catch (err) {
      alert('Erro ao criar sprint: ' + (err.response?.data?.error || err.message));
    }
  };

  const addStep = async (sprintIndex) => {
    const sprint = sprints[sprintIndex];
    if (!sprint.newStep?.trim()) return;
    try {
      const res = await stepsAPI.create(sprint.id, { description: sprint.newStep });
      const updated = [...sprints];
      updated[sprintIndex].steps.push(res.data.step);
      updated[sprintIndex].newStep = '';
      setSprints(updated);
    } catch (err) {
      alert('Erro ao criar step: ' + (err.response?.data?.error || err.message));
    }
  };

  const updateSprintNewStep = (index, value) => {
    const updated = [...sprints];
    updated[index].newStep = value;
    setSprints(updated);
  };

  const removeSprint = async (index) => {
    try {
      await sprintsAPI.delete(sprints[index].id);
      setSprints(sprints.filter((_, i) => i !== index));
    } catch (err) {
      alert('Erro ao excluir sprint');
    }
  };

  const handleFinish = () => {
    navigate(`/projects/${projectId}`);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Novo Projeto</h1>
          <p className="page-subtitle">Preencha as informações para criar um projeto de testes</p>
        </div>
      </div>

      <div className="wizard-container">
        {/* Stepper */}
        <div className="wizard-stepper">
          <div className={`wizard-step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <div className="wizard-step-number">{step > 1 ? <Check size={16} /> : '1'}</div>
            <span className="wizard-step-label">Informações</span>
          </div>
          <div className={`wizard-connector ${step > 1 ? 'completed' : ''}`} />
          <div className={`wizard-step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <div className="wizard-step-number">{step > 2 ? <Check size={16} /> : '2'}</div>
            <span className="wizard-step-label">Escopo</span>
          </div>
          <div className={`wizard-connector ${step > 2 ? 'completed' : ''}`} />
          <div className={`wizard-step ${step === 3 ? 'active' : ''}`}>
            <div className="wizard-step-number">3</div>
            <span className="wizard-step-label">Sprints</span>
          </div>
        </div>

        <div className="card">
          {/* Step 1: Project Info */}
          {step === 1 && (
            <div className="fade-in">
              <h2 className="card-title mb-2">Informações do Projeto</h2>
              <div className="form-group">
                <label className="form-label">Nome do Projeto *</label>
                <input id="project-name" className="form-input" placeholder="Ex: Portal do Cliente v2.0"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Número da Proposta</label>
                <input id="project-proposal" className="form-input" placeholder="Ex: PROP-2026-001"
                  value={proposalNumber} onChange={e => setProposalNumber(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Desenvolvedor(a)</label>
                  <select className="form-input" value={developerName} onChange={e => setDeveloperName(e.target.value)} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione...</option>
                    {getOptions('developer').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Analista QA</label>
                  <select className="form-input" value={qaName} onChange={e => setQaName(e.target.value)} style={{ cursor: 'pointer' }}>
                    <option value="">Selecione...</option>
                    {getOptions('qa').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Gestor de Projetos</label>
                <select className="form-input" value={managerName} onChange={e => setManagerName(e.target.value)} style={{ cursor: 'pointer' }}>
                  <option value="">Selecione...</option>
                  {getOptions('manager').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Empresa Cliente</label>
                <select
                  id="project-company"
                  className="form-input"
                  value={clientCompany}
                  onChange={e => setClientCompany(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">Selecione uma empresa...</option>
                  {getOptions('client').map(p => <option key={p.id} value={p.value}>{p.value}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Data de KT</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={ktDate}
                    onChange={e => setKtDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data de Testes</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={testDate}
                    onChange={e => setTestDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="wizard-actions">
                <div />
                <button className="btn btn-primary" onClick={handleStep1} disabled={!name.trim() || loading}>
                  {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>Próximo <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Scope */}
          {step === 2 && (
            <div className="fade-in">
              <h2 className="card-title mb-2">Escopo do Projeto</h2>
              <div className="form-group">
                <label className="form-label">Resumo do Escopo</label>
                <textarea className="form-textarea" placeholder="Descreva o escopo do projeto, objetivos e funcionalidades a serem testadas..."
                  value={scopeSummary} onChange={e => setScopeSummary(e.target.value)} rows={5} />
              </div>
              <div className="form-group">
                <label className="form-label">Arquivo do Escopo</label>
                <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                  <input {...getInputProps()} />
                  <div className="dropzone-icon"><Upload size={40} /></div>
                  <p className="dropzone-text">
                    {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste um arquivo ou clique para selecionar'}
                  </p>
                  <p className="dropzone-hint">PDF, DOC, XLS, imagens (máx. 10MB)</p>
                </div>
                {file && (
                  <div className="file-preview">
                    <FileText size={20} style={{ color: 'var(--accent)' }} />
                    <span className="file-preview-name">{file.name}</span>
                    <span className="file-preview-size">{formatSize(file.size)}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <div className="wizard-actions">
                <button className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button className="btn btn-primary" onClick={handleStep2} disabled={loading}>
                  {loading ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : <>Próximo <ChevronRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Sprints */}
          {step === 3 && (
            <div className="fade-in">
              <h2 className="card-title mb-2">Test Cases</h2>
              <p className="card-subtitle mb-2">Crie test cases e adicione os steps (passos) de cada um.</p>

              {/* Add Sprint */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input className="form-input" placeholder="Nome do test case..."
                  value={newSprintName} onChange={e => setNewSprintName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSprint(); }}
                />
                <button className="btn btn-primary" onClick={addSprint}>
                  <Plus size={16} /> Adicionar
                </button>
              </div>

              {/* Sprint Cards */}
              {sprints.map((sprint, si) => (
                <div key={sprint.id} className="sprint-card fade-in">
                  <div className="sprint-header">
                    <div className="sprint-name">
                      <ClipboardList size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} /> {sprint.name}
                    </div>
                    <div className="sprint-actions">
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => removeSprint(si)} title="Excluir sprint">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="sprint-body">
                    {sprint.steps.length > 0 && (
                      <ul className="step-list">
                        {sprint.steps.map((stepItem, sti) => (
                          <li key={stepItem.id} className="step-item">
                            <div className="step-number">{sti + 1}</div>
                            <div className="step-content">
                              <p className="step-description">{stepItem.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="add-step-form">
                      <input className="form-input" placeholder="Descreva o passo de teste..."
                        value={sprint.newStep || ''}
                        onChange={e => updateSprintNewStep(si, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addStep(si); }}
                      />
                      <button className="btn btn-secondary btn-sm" onClick={() => addStep(si)}>
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {sprints.length === 0 && (
                <div className="empty-state">
                  <TestTube2 size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem', opacity: 0.4 }} />
                  <p className="empty-state-title">Nenhum test case criado</p>
                  <p className="empty-state-text">Adicione test cases para organizar seus testes</p>
                </div>
              )}

              <div className="wizard-actions">
                <button className="btn btn-secondary" onClick={() => setStep(2)}>
                  <ChevronLeft size={16} /> Voltar
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleFinish}>
                  <Check size={18} /> Finalizar Projeto
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
