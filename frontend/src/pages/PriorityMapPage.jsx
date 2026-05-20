import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronDown, Filter, LayoutGrid, Layers, Flame, ArrowUp, ArrowRight, ArrowDown, Calendar, Hash, FlaskConical, Code2, UserCircle, ClipboardList, GraduationCap, TestTube2 } from 'lucide-react';
import { NODE_API } from '../services/api';

// Estilo de proximidade para datas — mesmo padrão usado em ProjectDetailPage
// Recebe ISO/SQL date e indica se o projeto já está concluído (todos os sprints approved)
function getDateProximityStyle(dateStr, allPassed) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  if (allPassed) {
    return { color: 'var(--text-primary)', tint: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.35)', accent: 'var(--text-muted)', label: 'Concluído' };
  }
  const diffDays = (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0)  return { color: '#111827', tint: 'rgba(17,24,39,0.14)',   border: 'rgba(17,24,39,0.45)',   accent: '#111827', label: 'Atrasado' };
  if (diffDays < 7)  return { color: '#b91c1c', tint: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',   accent: '#EF4444', label: 'Crítico' };
  if (diffDays < 15) return { color: '#9a3412', tint: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.4)',  accent: '#F97316', label: 'Atenção' };
  if (diffDays < 30) return { color: '#854d0e', tint: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)',  accent: '#F59E0B', label: 'Próximo' };
  return { color: '#15803d', tint: 'rgba(34,197,94,0.10)', border: 'rgba(34,197,94,0.35)', accent: '#22C55E', label: 'No prazo' };
}

// Retorna a data "mais próxima de acontecer" para um projeto:
// - se existe uma futura → a futura mais próxima
// - se ambas são futuras → a mais cedo
// - se ambas passaram → a mais recente (mais próxima do "agora")
// - se não há datas → null
function getProjectNextDate(project) {
  const candidates = [];
  if (project.kt_date)   candidates.push({ key: 'kt',   label: 'KT',    value: project.kt_date,   icon: GraduationCap });
  if (project.test_date) candidates.push({ key: 'test', label: 'Teste', value: project.test_date, icon: TestTube2 });
  if (candidates.length === 0) return null;
  const now = Date.now();
  const withTs = candidates
    .map(c => ({ ...c, ts: new Date(c.value).getTime() }))
    .filter(c => !isNaN(c.ts));
  if (withTs.length === 0) return null;
  const future = withTs.filter(c => c.ts >= now);
  if (future.length > 0) return future.sort((a, b) => a.ts - b.ts)[0];
  return withTs.sort((a, b) => b.ts - a.ts)[0];
}

// Tiers de prioridade na ordem em que devem aparecer (do mais urgente ao menos)
const PRIORITY_TIERS = [
  { id: 'atrasado',  label: 'Atrasado',  accent: '#111827', tint: 'rgba(17,24,39,0.10)',   border: 'rgba(17,24,39,0.45)',  description: 'Datas que já passaram e precisam ser tratadas imediatamente' },
  { id: 'critico',   label: 'Crítico',   accent: '#EF4444', tint: 'rgba(239,68,68,0.10)',  border: 'rgba(239,68,68,0.4)',  description: 'Menos de 7 dias para a próxima entrega' },
  { id: 'atencao',   label: 'Atenção',   accent: '#F97316', tint: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.4)', description: 'Entre 7 e 14 dias' },
  { id: 'proximo',   label: 'Próximo',   accent: '#F59E0B', tint: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.4)', description: 'Entre 15 e 29 dias' },
  { id: 'no_prazo',  label: 'No prazo',  accent: '#22C55E', tint: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.35)', description: '30 dias ou mais — folga confortável' },
  { id: 'concluido', label: 'Concluído', accent: 'var(--text-muted)', tint: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.35)', description: 'Todos os test cases aprovados' },
];

function classifyTier(dateStr, allPassed) {
  if (!dateStr) return null;
  if (allPassed) return 'concluido';
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const diffDays = (target.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0)  return 'atrasado';
  if (diffDays < 7)  return 'critico';
  if (diffDays < 15) return 'atencao';
  if (diffDays < 30) return 'proximo';
  return 'no_prazo';
}

// Texto humano da distância até a data — "Há 3 dias", "Em 5 dias", "Hoje", "Amanhã"
function getRelativeLabel(dateStr) {
  if (!dateStr) return '';
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return '';
  const now = new Date();
  // Diferença em dias arredondada considerando início do dia
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.round((startOfDay(target) - startOfDay(now)) / (1000 * 60 * 60 * 24));
  if (dayDiff === 0) return 'Hoje';
  if (dayDiff === 1) return 'Amanhã';
  if (dayDiff === -1) return 'Ontem';
  if (dayDiff > 1) return `Em ${dayDiff} dias`;
  return `Há ${Math.abs(dayDiff)} dias`;
}

const PRIORITY_COLUMNS = [
  {
    id: 'critical',
    label: 'Crítico',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.3)',
    icon: Flame,
    description: 'Bloqueadores e falhas críticas',
  },
  {
    id: 'high',
    label: 'Alto',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    border: 'rgba(249,115,22,0.3)',
    icon: ArrowUp,
    description: 'Alta prioridade de resolução',
  },
  {
    id: 'medium',
    label: 'Médio',
    color: '#eab308',
    bg: 'rgba(234,179,8,0.08)',
    border: 'rgba(234,179,8,0.3)',
    icon: ArrowRight,
    description: 'Prioridade moderada',
  },
  {
    id: 'low',
    label: 'Baixo',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    border: 'rgba(34,197,94,0.3)',
    icon: ArrowDown,
    description: 'Baixo impacto, resolver quando possível',
  },
];

const SEVERITY_PRIORITY_MAP = {
  critico: 'critical',
  blocker: 'critical',
  alta: 'high',
  high: 'high',
  media: 'medium',
  medio: 'medium',
  medium: 'medium',
  baixa: 'low',
  low: 'low',
  trivial: 'low',
};

function normalizePriority(bug) {
  const raw = (bug.severity || bug.priority || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return SEVERITY_PRIORITY_MAP[raw] || 'medium';
}

function BugCard({ bug }) {
  const priority = normalizePriority(bug);
  const col = PRIORITY_COLUMNS.find(c => c.id === priority);
  const Icon = col?.icon || ArrowRight;

  return (
    <div className="priority-card" style={{ '--card-accent': col?.color }}>
      <div className="priority-card-header">
        <span className="priority-card-id">#{bug.id}</span>
        <span className="priority-card-badge" style={{ color: col?.color, background: col?.bg, border: `1px solid ${col?.border}` }}>
          <Icon size={10} />
          {col?.label}
        </span>
      </div>
      <div className="priority-card-title">{bug.title}</div>
      {bug.description && (
        <div className="priority-card-desc">{bug.description.slice(0, 90)}{bug.description.length > 90 ? '…' : ''}</div>
      )}
      <div className="priority-card-footer">
        {bug.project_name && (
          <span className="priority-card-project">
            <Layers size={11} />
            {bug.project_name}
          </span>
        )}
        <span className="priority-card-status" style={{ marginLeft: 'auto' }}>
          {bug.status || 'Aberto'}
        </span>
      </div>
    </div>
  );
}

function PriorityColumn({ column, bugs }) {
  const Icon = column.icon;
  return (
    <div className="priority-column" style={{ '--col-color': column.color, '--col-bg': column.bg, '--col-border': column.border }}>
      <div className="priority-column-header">
        <div className="priority-column-icon" style={{ color: column.color, background: column.bg }}>
          <Icon size={16} />
        </div>
        <div>
          <div className="priority-column-title" style={{ color: column.color }}>{column.label}</div>
          <div className="priority-column-desc">{column.description}</div>
        </div>
        <span className="priority-column-count" style={{ color: column.color, background: column.bg, border: `1px solid ${column.border}` }}>
          {bugs.length}
        </span>
      </div>
      <div className="priority-column-body">
        {bugs.length === 0 ? (
          <div className="priority-empty">Nenhum item nesta faixa</div>
        ) : (
          bugs.map(bug => <BugCard key={bug.id} bug={bug} />)
        )}
      </div>
    </div>
  );
}

export default function PriorityMapPage() {
  const navigate = useNavigate();
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterProject, setFilterProject] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [projects, setProjects] = useState([]);

  // Re-renderiza a cada minuto para manter as cores das datas atualizadas
  const [, setNowTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setNowTick(t => t + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [bugsRes, projectsRes] = await Promise.all([
          NODE_API.get('/bugs'),
          NODE_API.get('/projects'),
        ]);
        setBugs(bugsRes.data?.bugs || bugsRes.data || []);
        setProjects(projectsRes.data?.projects || projectsRes.data || []);
      } catch (e) {
        setError('Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Lista de projetos com cronograma, ordenados de forma crescente pela próxima data a ocorrer
  const scheduledProjects = useMemo(() => {
    return projects
      .map(p => {
        const next = getProjectNextDate(p);
        if (!next) return null;
        const allPassed = (p.sprint_count || 0) > 0 && (p.sprint_count === p.approved_count);
        const tier = classifyTier(next.value, allPassed);
        return {
          project: p,
          next,
          allPassed,
          tier,
          style: getDateProximityStyle(next.value, allPassed),
          relative: getRelativeLabel(next.value)
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.next.ts - b.next.ts);
  }, [projects]);

  // Agrupa projetos por tier, mantendo a ordem dos tiers definida em PRIORITY_TIERS
  const projectsByTier = useMemo(() => {
    const map = new Map(PRIORITY_TIERS.map(t => [t.id, []]));
    for (const item of scheduledProjects) {
      if (item.tier && map.has(item.tier)) map.get(item.tier).push(item);
    }
    return map;
  }, [scheduledProjects]);

  const filtered = bugs.filter(bug => {
    if (filterProject !== 'all' && String(bug.project_id) !== filterProject) return false;
    if (filterStatus !== 'all' && (bug.status || '').toLowerCase() !== filterStatus) return false;
    return true;
  });

  const grouped = PRIORITY_COLUMNS.reduce((acc, col) => {
    acc[col.id] = filtered.filter(b => normalizePriority(b) === col.id);
    return acc;
  }, {});

  const allStatuses = [...new Set(bugs.map(b => b.status).filter(Boolean))];

  return (
    <div className="priority-map-page">
      {/* Header */}
      <div className="priority-map-header">
        <div className="priority-map-title-area">
          <div className="priority-map-icon-wrap">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="priority-map-title">Mapa de Prioridades</h1>
            <p className="priority-map-subtitle">Visualize e gerencie bugs por nível de prioridade</p>
          </div>
        </div>

        <div className="priority-map-filters">
          <div className="priority-filter-group">
            <Filter size={14} />
            <select
              className="priority-filter-select"
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
            >
              <option value="all">Todos os projetos</option>
              {projects.map(p => (
                <option key={p.id} value={String(p.id)}>{p.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="priority-filter-arrow" />
          </div>

          <div className="priority-filter-group">
            <select
              className="priority-filter-select"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="all">Todos os status</option>
              {allStatuses.map(s => (
                <option key={s} value={s.toLowerCase()}>{s}</option>
              ))}
            </select>
            <ChevronDown size={13} className="priority-filter-arrow" />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="priority-stats-bar">
        {PRIORITY_COLUMNS.map(col => {
          const count = grouped[col.id]?.length || 0;
          const total = filtered.length || 1;
          const pct = Math.round((count / total) * 100);
          const Icon = col.icon;
          return (
            <div key={col.id} className="priority-stat-item">
              <span style={{ color: col.color, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Icon size={13} /> {col.label}
              </span>
              <strong style={{ color: col.color }}>{count}</strong>
              <div className="priority-stat-bar-wrap">
                <div className="priority-stat-bar-fill" style={{ width: `${pct}%`, background: col.color }} />
              </div>
              <span className="priority-stat-pct">{pct}%</span>
            </div>
          );
        })}
      </div>

      {/* Cronograma de Projetos */}
      {!loading && !error && scheduledProjects.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={18} style={{ color: 'var(--accent)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Cronograma de Projetos
                </h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Triagem diária — atrasados primeiro, depois críticos, atenção, próximo e no prazo
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {scheduledProjects.length} projeto(s) com datas
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {PRIORITY_TIERS.map(tier => {
              const items = projectsByTier.get(tier.id) || [];
              if (items.length === 0) return null;
              return (
                <section key={tier.id}>
                  {/* Cabeçalho do tier */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    padding: '0.45rem 0.75rem',
                    marginBottom: '0.5rem',
                    borderRadius: '8px',
                    background: tier.tint,
                    border: `1px solid ${tier.border}`
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%', background: tier.accent, flexShrink: 0
                    }} />
                    <span style={{
                      fontSize: '0.78rem', fontWeight: 700, color: tier.accent,
                      textTransform: 'uppercase', letterSpacing: '0.6px'
                    }}>
                      {tier.label}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flex: 1 }}>
                      {tier.description}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color: tier.accent,
                      padding: '0.1rem 0.5rem', borderRadius: '999px',
                      background: 'var(--bg-card)', border: `1px solid ${tier.border}`
                    }}>
                      {items.length}
                    </span>
                  </div>

                  {/* Lista de projetos do tier — um card por linha */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {items.map(({ project, next, allPassed, style, relative }) => {
                      const total = (project.approved_count || 0) + (project.bug_count || 0) +
                        (project.blocked_count || 0) + (project.rejected_count || 0) + (project.pending_count || 0);
                      const progressPct = total > 0 ? Math.round(((project.approved_count || 0) / total) * 100) : 0;
                      const NextIcon = next.icon;
                      return (
                        <div
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/projects/${project.id}`); }}
                          style={{
                            position: 'relative',
                            display: 'grid',
                            gridTemplateColumns: '170px minmax(0, 1fr) 220px 40px',
                            alignItems: 'center',
                            gap: '1rem',
                            padding: '0.85rem 1rem 0.85rem 1.25rem',
                            background: `linear-gradient(90deg, ${tier.tint} 0%, var(--bg-card) 60%)`,
                            border: `1px solid ${tier.border}`,
                            borderRadius: '10px',
                            cursor: 'pointer',
                            transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 4px 16px ${tier.tint}, 0 0 0 1px ${tier.border}`;
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {/* Faixa lateral colorida */}
                          <span style={{
                            position: 'absolute', top: 0, left: 0, bottom: 0, width: '5px',
                            background: tier.accent, borderRadius: '10px 0 0 10px'
                          }} />

                          {/* Coluna 1: indicador de urgência + data */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', minWidth: 0 }}>
                            <span style={{
                              fontSize: '1.15rem', fontWeight: 800, color: tier.accent,
                              lineHeight: 1.1, letterSpacing: '-0.01em'
                            }}>
                              {relative}
                            </span>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              fontSize: '0.7rem', fontWeight: 600,
                              color: style ? style.color : 'var(--text-muted)'
                            }}>
                              <NextIcon size={11} />
                              {next.label} · {new Date(next.value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Coluna 2: identidade do projeto */}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.15rem' }}>
                              {project.client_company && (
                                <span style={{
                                  fontSize: '0.65rem', fontWeight: 700,
                                  color: 'var(--accent)',
                                  backgroundColor: 'rgba(0, 128, 128, 0.1)',
                                  padding: '1px 7px', borderRadius: '4px',
                                  textTransform: 'uppercase', letterSpacing: '0.5px'
                                }}>
                                  {project.client_company}
                                </span>
                              )}
                              {project.proposal_number && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Hash size={10} /> {project.proposal_number}
                                </span>
                              )}
                            </div>
                            <div style={{
                              fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                            }} title={project.name}>
                              {project.name}
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                              {project.qa_name && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <FlaskConical size={10} /> {project.qa_name}
                                </span>
                              )}
                              {project.developer_name && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <Code2 size={10} /> {project.developer_name}
                                </span>
                              )}
                              {project.manager_name && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <UserCircle size={10} /> {project.manager_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Coluna 3: progresso */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between',
                              fontSize: '0.7rem', color: 'var(--text-muted)'
                            }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <ClipboardList size={10} /> {project.sprint_count || 0} casos
                              </span>
                              <span style={{ fontWeight: 700, color: allPassed ? '#22C55E' : 'var(--text-primary)' }}>
                                {progressPct}%
                              </span>
                            </div>
                            {total > 0 ? (
                              <div className="project-stats-bar" style={{ height: '6px' }}>
                                <div style={{ width: `${((project.approved_count || 0) / total) * 100}%`, background: 'var(--status-approved)' }} />
                                <div style={{ width: `${((project.bug_count || 0) / total) * 100}%`, background: 'var(--status-bug)' }} />
                                <div style={{ width: `${((project.blocked_count || 0) / total) * 100}%`, background: 'var(--status-blocked)' }} />
                                <div style={{ width: `${((project.rejected_count || 0) / total) * 100}%`, background: 'var(--status-rejected)' }} />
                                <div style={{ width: `${((project.pending_count || 0) / total) * 100}%`, background: 'var(--status-pending)' }} />
                              </div>
                            ) : (
                              <div style={{
                                height: '6px', borderRadius: '999px',
                                background: 'var(--bg-tertiary)', border: '1px dashed var(--border)'
                              }} />
                            )}
                          </div>

                          {/* Coluna 4: chevron */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <ArrowRight size={18} style={{ color: tier.accent, opacity: 0.7 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="loading-container" style={{ minHeight: '40vh' }}>
          <div className="spinner" />
        </div>
      ) : error ? (
        <div className="priority-error">
          <AlertTriangle size={20} />
          {error}
        </div>
      ) : (
        <div className="priority-board">
          {PRIORITY_COLUMNS.map(col => (
            <PriorityColumn key={col.id} column={col} bugs={grouped[col.id] || []} />
          ))}
        </div>
      )}
    </div>
  );
}
