import { useMemo } from 'react';

const STATUS_CONFIG = [
  { key: 'total',          label: 'Total',     color: 'var(--accent)',  bg: 'rgba(0,200,200,0.15)' },
  { key: 'approved',       label: 'Passed',    color: '#22c55e',        bg: 'rgba(34,197,94,0.15)' },
  { key: 'rejected',       label: 'Failed',    color: '#ef4444',        bg: 'rgba(239,68,68,0.15)' },
  { key: 'blocked',        label: 'Blocked',   color: '#f59e0b',        bg: 'rgba(245,158,11,0.15)' },
  { key: 'pending',        label: 'Pendente',  color: '#8b5cf6',        bg: 'rgba(139,92,246,0.15)' },
  { key: 'bugs',           label: 'Bugs',      color: '#6b7280',        bg: 'rgba(107,114,128,0.15)' },
];

export default function StatusSummaryPanel({ sprints, bugs, activeFilter, onFilterChange }) {
  const stats = useMemo(() => {
    const total = sprints.length;
    const approved = sprints.filter(s => s.status === 'approved').length;
    const rejected = sprints.filter(s => s.status === 'rejected').length;
    const blocked  = sprints.filter(s => s.status === 'blocked').length;
    const bugCount = sprints.filter(s => s.status === 'bug').length;
    const pending  = total - approved - rejected - blocked - bugCount;
    return { total, approved, rejected, blocked, pending, bugs: bugs.length };
  }, [sprints, bugs]);

  const pct = (val) => stats.total > 0 ? Math.round((val / stats.total) * 100) : 0;

  const getValue = (key) => {
    if (key === 'total') return stats.total;
    if (key === 'bugs') return stats.bugs;
    return stats[key] ?? 0;
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '0.85rem 1.25rem',
      marginBottom: '1.25rem',
    }}>
      <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: '0.6rem', textTransform: 'uppercase' }}>
        Resumo dos Cenários
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {STATUS_CONFIG.map(({ key, label, color, bg }) => {
          const val = getValue(key);
          const percent = key === 'bugs' ? (stats.total > 0 ? Math.round((val / stats.total) * 100) : 0) : pct(val);
          const barW = key === 'total' ? 100 : (stats.total > 0 ? Math.min((val / stats.total) * 100, 100) : 0);
          const isClickable = key !== 'total';
          const isActive = activeFilter === key;

          return (
            <div
              key={key}
              title={`${label}: ${val}${key !== 'total' ? ` · ${percent}%` : ''}`}
              onClick={() => isClickable && onFilterChange && onFilterChange(isActive ? null : key)}
              style={{
                display: 'grid',
                gridTemplateColumns: key === 'total' ? '72px 32px 1fr' : '72px 32px 1fr 36px',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: isClickable ? 'pointer' : 'default',
                padding: '0.15rem 0.3rem',
                borderRadius: '5px',
                background: isActive ? bg : 'transparent',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontSize: '0.78rem', color: isActive ? color : 'var(--text-secondary)', fontWeight: key === 'total' ? 700 : (isActive ? 700 : 400), whiteSpace: 'nowrap' }}>
                {label}
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color, textAlign: 'right' }}>{val}</span>
              {key === 'total' ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>cenário(s) no total</span>
              ) : (
                <>
                  <div style={{ height: '6px', background: 'var(--bg-tertiary)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${barW}%`,
                      background: color, borderRadius: '99px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'right' }}>{percent}%</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
