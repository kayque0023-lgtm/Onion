import { useState, useEffect, useMemo, useRef } from 'react';
import { Timer, Play, Folder, CalendarClock, AlertTriangle, Search, X, Calendar, Trash2 } from 'lucide-react';
import { projectsAPI, timeSessionsAPI } from '../services/api';
import { useTimer, formatDuration, formatDurationShort } from '../context/TimerContext';

function todayISODate() {
  const d = new Date();
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffset).toISOString().slice(0, 10);
}

function ProjectAutocomplete({ projects, value, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects.slice(0, 50);
    return projects.filter(p => {
      return (p.name || '').toLowerCase().includes(q)
        || (p.client_company || '').toLowerCase().includes(q)
        || (p.proposal_number || '').toLowerCase().includes(q);
    }).slice(0, 50);
  }, [projects, query]);

  useEffect(() => { setHighlight(0); }, [query, open]);

  const pick = (p) => {
    onSelect(p);
    setQuery(p ? `${p.name}${p.client_company ? ' — ' + p.client_company : ''}` : '');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setHighlight(h => Math.min(h + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[highlight]) pick(matches[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="form-input"
          style={{ paddingLeft: '2.2rem', paddingRight: '2.2rem' }}
          placeholder="Pesquisar projeto..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(null); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); onSelect(null); setOpen(true); }}
            style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            title="Limpar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0, right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            maxHeight: '260px',
            overflowY: 'auto',
            zIndex: 200,
          }}
        >
          {matches.length === 0 ? (
            <div style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Nenhum projeto encontrado
            </div>
          ) : (
            matches.map((p, i) => (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', padding: '0.55rem 0.85rem',
                  background: i === highlight ? 'var(--bg-glass-hover)' : 'transparent',
                  border: 'none', textAlign: 'left', cursor: 'pointer',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <Folder size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </div>
                  {(p.client_company || p.proposal_number) && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                      {p.client_company && <span>{p.client_company}</span>}
                      {p.proposal_number && <span>#{p.proposal_number}</span>}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DateChip({ date }) {
  const d = new Date(`${date}T00:00:00`);
  const today = todayISODate();
  const dayLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
      <Calendar size={14} />
      <span style={{ textTransform: 'capitalize' }}>{dayLabel}</span>
      {date === today && (
        <span style={{
          background: 'var(--accent-subtle)', color: 'var(--accent)',
          padding: '0.05rem 0.45rem', borderRadius: '99px', fontSize: '0.68rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>Hoje</span>
      )}
    </div>
  );
}

export default function RuntimePage() {
  const { project: activeProject, isRunning, elapsed, startTimer, refreshToday, refreshTotals } = useTimer();
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);

  // Diário
  const [diaryDate, setDiaryDate] = useState(todayISODate());
  const [diarySessions, setDiarySessions] = useState([]);
  const [loadingDiary, setLoadingDiary] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await projectsAPI.list();
        if (mounted) setProjects(res.data.projects || []);
      } catch (err) {
        console.error('Erro ao carregar projetos:', err);
      } finally {
        if (mounted) setLoadingProjects(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const loadDiary = async (date) => {
    setLoadingDiary(true);
    try {
      const res = await timeSessionsAPI.byDate(date);
      setDiarySessions(res.data.sessions || []);
    } catch (err) {
      console.error('Erro ao carregar diário:', err);
      setDiarySessions([]);
    } finally {
      setLoadingDiary(false);
    }
  };

  useEffect(() => { loadDiary(diaryDate); }, [diaryDate]);

  // Re-fetch quando o cronômetro for encerrado (refreshToday é chamado no stopTimer)
  // Atualizamos contexto + tela local se a data exibida for hoje
  useEffect(() => {
    if (!activeProject && diaryDate === todayISODate()) {
      loadDiary(diaryDate);
    }
    refreshToday();
  }, [activeProject]); // eslint-disable-line react-hooks/exhaustive-deps

  const diaryTotalSeconds = useMemo(
    () => diarySessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0),
    [diarySessions]
  );

  const handleDeleteSession = async (session) => {
    const label = session.project_name || 'esta sessão';
    if (!window.confirm(`Excluir a sessão de "${label}" (${formatDurationShort(session.duration_seconds)})? Esta ação não pode ser desfeita.`)) return;
    try {
      await timeSessionsAPI.delete(session.id);
      setDiarySessions(prev => prev.filter(s => s.id !== session.id));
      refreshToday();
      refreshTotals();
    } catch (err) {
      console.error('Erro ao excluir sessão:', err);
      alert(err.response?.data?.error || 'Erro ao excluir a sessão.');
    }
  };

  const handleStart = () => {
    if (!selectedProject) return;
    if (activeProject) {
      if (!window.confirm(`Já há um cronômetro ativo (${activeProject.name}). Iniciar novo descartará o atual sem salvar. Continuar?`)) return;
    }
    startTimer(selectedProject);
    setSelectedProject(null);
  };

  const formatTime = (iso) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—';

  if (loadingProjects) return <div className="loading-container"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Timer size={22} style={{ color: 'var(--accent)' }} />
          <h1 className="page-title">Run time</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.4fr)', gap: '1.5rem', alignItems: 'start' }}>
        {/* Bloco: iniciar cronômetro */}
        <div className="card" style={{ overflow: 'visible' }}>
          <div className="card-header">
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Play size={16} style={{ color: 'var(--accent)' }} /> Iniciar cronômetro
            </h2>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label className="form-label">Projeto</label>
              <ProjectAutocomplete
                projects={projects}
                value={selectedProject}
                onSelect={setSelectedProject}
              />
              {selectedProject && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Selecionado: <strong style={{ color: 'var(--accent)' }}>{selectedProject.name}</strong>
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              onClick={handleStart}
              disabled={!selectedProject}
              style={{ alignSelf: 'flex-start' }}
            >
              <Play size={14} /> Iniciar
            </button>

            {activeProject && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.85rem 1rem',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cronômetro atual {isRunning ? '· em andamento' : '· pausado'}
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {activeProject.name}
                  </div>
                </div>
                <div style={{
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: isRunning ? 'var(--accent)' : 'var(--text-secondary)',
                }}>
                  {formatDuration(elapsed)}
                </div>
              </div>
            )}

            {projects.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#f59e0b', fontSize: '0.85rem' }}>
                <AlertTriangle size={15} /> Nenhum projeto disponível. Crie um projeto antes de iniciar o cronômetro.
              </div>
            )}
          </div>
        </div>

        {/* Bloco: diário */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
              <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CalendarClock size={16} style={{ color: 'var(--accent)' }} /> Diário
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="date"
                  className="form-input"
                  value={diaryDate}
                  max={todayISODate()}
                  onChange={(e) => setDiaryDate(e.target.value || todayISODate())}
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.82rem', width: 'auto' }}
                />
                {diaryDate !== todayISODate() && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setDiaryDate(todayISODate())}
                    style={{ fontSize: '0.78rem' }}
                  >
                    Voltar pra hoje
                  </button>
                )}
              </div>
            </div>
            <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <DateChip date={diaryDate} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Total do dia: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(diaryTotalSeconds)}</strong>
              </span>
            </div>
          </div>

          {loadingDiary ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : diarySessions.length === 0 ? (
            <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Folder size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {diaryDate === todayISODate() ? 'Nenhuma sessão registrada hoje' : 'Nenhuma sessão neste dia'}
              </div>
              <div style={{ fontSize: '0.82rem' }}>
                {diaryDate === todayISODate() ? 'Inicie um cronômetro para começar a contar.' : 'Selecione outra data ou volte pra hoje.'}
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-tertiary)' }}>
                  {['Projeto', 'Início', 'Fim', 'Duração', ''].map((col, idx) => (
                    <th key={idx} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase', width: idx === 4 ? '48px' : 'auto' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {diarySessions.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}>
                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.88rem', fontWeight: 600 }}>{s.project_name}</td>
                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{formatTime(s.started_at)}</td>
                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{formatTime(s.ended_at)}</td>
                    <td style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontWeight: 600, color: 'var(--accent)' }}>
                      {formatDurationShort(s.duration_seconds)}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleDeleteSession(s)}
                        title="Excluir sessão"
                      >
                        <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
