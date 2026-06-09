import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { timeSessionsAPI } from '../services/api';

const STORAGE_KEY = 'qualiqa_timer_state';
const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [project, setProject] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [accumulated, setAccumulated] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [todaySessions, setTodaySessions] = useState([]);
  const [projectTotals, setProjectTotals] = useState({});

  const tickRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s.project) {
          setProject(s.project);
          setStartedAt(s.startedAt);
          setAccumulated(s.accumulated || 0);
          setIsRunning(!!s.isRunning);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!project) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      project, startedAt, accumulated, isRunning,
    }));
  }, [project, startedAt, accumulated, isRunning]);

  const computeElapsed = useCallback(() => {
    if (!isRunning || !startedAt) return accumulated;
    return accumulated + Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  }, [accumulated, isRunning, startedAt]);

  useEffect(() => {
    if (!isRunning) {
      setElapsed(accumulated);
      return;
    }
    setElapsed(computeElapsed());
    tickRef.current = setInterval(() => setElapsed(computeElapsed()), 1000);
    return () => clearInterval(tickRef.current);
  }, [isRunning, accumulated, computeElapsed]);

  const refreshToday = useCallback(async () => {
    try {
      const res = await timeSessionsAPI.today();
      setTodaySessions(res.data.sessions || []);
    } catch (err) {
      console.warn('Falha ao carregar sessões de hoje', err);
    }
  }, []);

  const refreshTotals = useCallback(async () => {
    try {
      const res = await timeSessionsAPI.totals();
      const map = {};
      (res.data.totals || []).forEach(t => { map[t.project_id] = t.total_seconds; });
      setProjectTotals(map);
    } catch (err) {
      console.warn('Falha ao carregar totais', err);
    }
  }, []);

  const startTimer = useCallback((proj) => {
    setProject({ id: proj.id, name: proj.name, client_company: proj.client_company });
    setStartedAt(new Date().toISOString());
    setAccumulated(0);
    setIsRunning(true);
  }, []);

  const pauseTimer = useCallback(() => {
    if (!isRunning) return;
    const now = Date.now();
    const extra = startedAt ? Math.floor((now - new Date(startedAt).getTime()) / 1000) : 0;
    setAccumulated(accumulated + extra);
    setStartedAt(null);
    setIsRunning(false);
  }, [accumulated, isRunning, startedAt]);

  const resumeTimer = useCallback(() => {
    if (isRunning || !project) return;
    setStartedAt(new Date().toISOString());
    setIsRunning(true);
  }, [isRunning, project]);

  const stopTimer = useCallback(async () => {
    if (!project) return null;
    const finalDuration = isRunning
      ? accumulated + Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      : accumulated;

    if (finalDuration < 1) {
      setProject(null);
      setStartedAt(null);
      setAccumulated(0);
      setIsRunning(false);
      return null;
    }

    const endIso = new Date().toISOString();
    const startIso = new Date(Date.now() - finalDuration * 1000).toISOString();

    try {
      await timeSessionsAPI.create({
        project_id: project.id,
        started_at: startIso,
        ended_at: endIso,
        duration_seconds: finalDuration,
      });
      await Promise.all([refreshToday(), refreshTotals()]);
    } catch (err) {
      console.error('Falha ao salvar sessão de tempo', err);
    }

    setProject(null);
    setStartedAt(null);
    setAccumulated(0);
    setIsRunning(false);
    return finalDuration;
  }, [project, isRunning, accumulated, startedAt, refreshToday, refreshTotals]);

  const cancelTimer = useCallback(() => {
    setProject(null);
    setStartedAt(null);
    setAccumulated(0);
    setIsRunning(false);
  }, []);

  return (
    <TimerContext.Provider value={{
      project, isRunning, elapsed,
      todaySessions, projectTotals,
      startTimer, pauseTimer, resumeTimer, stopTimer, cancelTimer,
      refreshToday, refreshTotals,
    }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer deve ser usado dentro de TimerProvider');
  return ctx;
}

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const hh = Math.floor(s / 3600).toString().padStart(2, '0');
  const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
  const ss = (s % 60).toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export function formatDurationShort(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}
