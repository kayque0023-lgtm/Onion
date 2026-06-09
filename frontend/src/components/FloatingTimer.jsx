import { useState, useEffect, useRef } from 'react';
import { Pause, Play, Square, GripVertical, Timer as TimerIcon } from 'lucide-react';
import { useTimer, formatDuration } from '../context/TimerContext';

const POS_KEY = 'qualiqa_timer_pos';
const WIDGET_W = 240;
const WIDGET_H = 96;

export default function FloatingTimer() {
  const { project, isRunning, elapsed, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [pos, setPos] = useState(() => {
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { x: window.innerWidth - WIDGET_W - 24, y: window.innerHeight - WIDGET_H - 24 };
  });

  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem(POS_KEY, JSON.stringify(pos));
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const handleMove = (e) => {
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      const x = Math.min(Math.max(0, cx - dragOffset.current.x), window.innerWidth - WIDGET_W);
      const y = Math.min(Math.max(0, cy - dragOffset.current.y), window.innerHeight - WIDGET_H);
      setPos({ x, y });
    };
    const handleUp = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [dragging]);

  const onDragStart = (e) => {
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: cx - pos.x, y: cy - pos.y };
    setDragging(true);
  };

  const handleStop = async () => {
    if (!window.confirm('Encerrar e salvar esta sessão de tempo?')) return;
    await stopTimer();
  };

  if (!project) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        width: WIDGET_W,
        zIndex: 9998,
        background: 'var(--bg-card)',
        border: `1px solid ${isRunning ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
        overflow: 'hidden',
        userSelect: 'none',
        transition: dragging ? 'none' : 'border-color 0.2s',
      }}
    >
      <div
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          padding: '0.4rem 0.6rem',
          background: isRunning ? 'var(--accent)' : 'var(--bg-tertiary)',
          color: isRunning ? '#fff' : 'var(--text-secondary)',
          cursor: dragging ? 'grabbing' : 'grab',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <GripVertical size={14} style={{ opacity: 0.7 }} />
        <TimerIcon size={13} />
        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
          {isRunning ? 'Em andamento' : 'Pausado'}
        </span>
      </div>

      <div style={{ padding: '0.55rem 0.75rem 0.75rem' }}>
        <div
          title={project.name}
          style={{
            fontSize: '0.78rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '0.1rem',
          }}
        >
          {project.name}
        </div>
        {project.client_company && (
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            {project.client_company}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
          <div style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: isRunning ? 'var(--accent)' : 'var(--text-secondary)',
          }}>
            {formatDuration(elapsed)}
          </div>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {isRunning ? (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={pauseTimer}
                title="Pausar"
                style={{ padding: '0.25rem' }}
              >
                <Pause size={14} />
              </button>
            ) : (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={resumeTimer}
                title="Retomar"
                style={{ padding: '0.25rem' }}
              >
                <Play size={14} />
              </button>
            )}
            <button
              className="btn btn-ghost btn-icon btn-sm"
              onClick={handleStop}
              title="Encerrar e salvar"
              style={{ padding: '0.25rem', color: 'var(--danger)' }}
            >
              <Square size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
