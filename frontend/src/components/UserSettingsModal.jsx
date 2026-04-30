import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, User as UserIcon, Mail, Lock, ShieldCheck, Pencil, Eye, CheckCircle, AlertTriangle } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualização' };
const ROLE_ICONS = { admin: ShieldCheck, editor: Pencil, viewer: Eye };

export default function UserSettingsModal({ isOpen, onClose }) {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTab('profile');
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const RoleIcon = ROLE_ICONS[user.role] || Eye;

  const handleSaveProfile = async () => {
    if (!name.trim()) return showToast('Nome é obrigatório.', 'error');
    if (!email.trim()) return showToast('Email é obrigatório.', 'error');
    setSavingProfile(true);
    try {
      const payload = {};
      if (name !== user.name) payload.name = name;
      if (email !== user.email) payload.email = email;
      if (Object.keys(payload).length === 0) {
        showToast('Nenhuma alteração para salvar.', 'error');
        setSavingProfile(false);
        return;
      }
      await authAPI.updateProfile(payload);
      await refreshUser();
      showToast('Perfil atualizado com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao salvar perfil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) return showToast('Informe a senha atual.', 'error');
    if (newPassword.length < 6) return showToast('Nova senha deve ter no mínimo 6 caracteres.', 'error');
    if (newPassword !== confirmPassword) return showToast('A confirmação não confere.', 'error');
    setSavingPassword(true);
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showToast('Senha alterada com sucesso!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Erro ao alterar senha.', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '2rem 1rem', boxSizing: 'border-box', overflowY: 'auto'
    }}>
      <div className="card" style={{ maxWidth: '560px', width: '100%', padding: '1.25rem', margin: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Configurações da Conta</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Cabeçalho com avatar e role */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.85rem',
          padding: '0.75rem', borderRadius: '10px',
          background: 'var(--bg-secondary)', marginTop: '0.5rem'
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--accent, #008080)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700
          }}>
            {user.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{user.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '2px' }}>
              <RoleIcon size={12} /> {ROLE_LABELS[user.role] || 'Visualização'}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border)', marginTop: '1rem' }}>
          <button
            type="button"
            onClick={() => setTab('profile')}
            style={{
              padding: '0.55rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
              color: tab === 'profile' ? 'var(--accent, #008080)' : 'var(--text-muted)',
              borderBottom: tab === 'profile' ? '2px solid var(--accent, #008080)' : '2px solid transparent',
              marginBottom: '-1px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <UserIcon size={14} /> Perfil
          </button>
          <button
            type="button"
            onClick={() => setTab('password')}
            style={{
              padding: '0.55rem 0.85rem', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.85rem', fontWeight: 600,
              color: tab === 'password' ? 'var(--accent, #008080)' : 'var(--text-muted)',
              borderBottom: tab === 'password' ? '2px solid var(--accent, #008080)' : '2px solid transparent',
              marginBottom: '-1px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Lock size={14} /> Senha
          </button>
        </div>

        {/* Conteúdo Perfil */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.78rem' }}>Nome</label>
              <div style={{ position: 'relative' }}>
                <UserIcon size={14} style={{ position: 'absolute', top: '50%', left: '0.65rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" value={name} onChange={e => setName(e.target.value)} style={{ paddingLeft: '2.1rem' }} />
              </div>
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.78rem' }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', top: '50%', left: '0.65rem', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: '2.1rem' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={savingProfile}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Salvando...' : <><Save size={14} style={{ marginRight: '0.35rem' }} /> Salvar</>}
              </button>
            </div>
          </div>
        )}

        {/* Conteúdo Senha */}
        {tab === 'password' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.78rem' }}>Senha atual</label>
              <input className="form-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.78rem' }}>Nova senha (mín. 6 caracteres)</label>
              <input className="form-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem', display: 'block', fontSize: '0.78rem' }}>Confirmar nova senha</label>
              <input className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={savingPassword}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleChangePassword} disabled={savingPassword}>
                {savingPassword ? 'Alterando...' : <><Lock size={14} style={{ marginRight: '0.35rem' }} /> Trocar senha</>}
              </button>
            </div>
          </div>
        )}

        {toast && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px', zIndex: 9999,
            background: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white', padding: '0.8rem 1.25rem', borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{toast.message}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
