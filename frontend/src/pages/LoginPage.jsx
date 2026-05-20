import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, ArrowRight, Code2, FlaskConical } from 'lucide-react';
import Particles from '../components/Particles';
import OnionLabLogo from '../components/OnionLabLogo';

export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [environment, setEnvironment] = useState('qa'); // 'dev' | 'qa'
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao processar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const [particleColor, setParticleColor] = useState("#ffffff");

  useEffect(() => {
    const updateColor = () => {
      const theme = document.documentElement.getAttribute('data-theme');
      setParticleColor(theme === 'dark' ? "#00D1FF" : "#000000");
    };
    updateColor();
    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="auth-container" style={{ position: 'relative' }}>
      <Particles
        className="absolute inset-0 z-0"
        quantity={100}
        ease={80}
        color={particleColor}
        refresh
      />
      <div className="auth-card fade-in" style={{ position: 'relative', zIndex: 1 }}>

        {/* ── Environment Toggle ── */}
        <div className="env-toggle-wrapper">
          <button
            id="env-toggle-qa"
            type="button"
            className={`env-toggle-btn${environment === 'qa' ? ' active-qa' : ''}`}
            onClick={() => setEnvironment('qa')}
            title="Ambiente QA"
          >
            <FlaskConical size={13} />
            QA
          </button>
          <button
            id="env-toggle-dev"
            type="button"
            className={`env-toggle-btn${environment === 'dev' ? ' active-dev' : ''}`}
            onClick={() => setEnvironment('dev')}
            title="Ambiente Desenvolvedor"
          >
            <Code2 size={13} />
            Dev
          </button>
        </div>

        <div className="auth-header">
          <div className="auth-logo" style={{ color: '#ffffff' }}>
            <OnionLabLogo size={48} style={{ color: '#ffffff' }} />
          </div>
          <h1 className="auth-title">
            {isRegister ? 'Criar Conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="auth-subtitle">
            {isRegister
              ? 'Preencha seus dados para começar'
              : `Entre na sua conta OnionLAB · ${environment === 'dev' ? 'Desenvolvedor' : 'QA'}`
            }
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  id="register-name"
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-email"
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                id="login-password"
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                {isRegister ? 'Criar Conta' : 'Entrar'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          {isRegister ? (
            <>Já tem uma conta? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(false); setError(''); }}>Entrar</a></>
          ) : (
            <>Não tem conta? <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(true); setError(''); }}>Criar conta</a></>
          )}
        </div>
      </div>
    </div>
  );
}
