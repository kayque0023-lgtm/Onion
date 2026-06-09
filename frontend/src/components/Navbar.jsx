import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, FolderPlus, Folders, LogOut, Sun, Moon, Bug, Users, ShieldCheck, Eye, Pencil, Settings, LayoutGrid, ChevronDown, Timer, ClipboardList, SlidersHorizontal } from 'lucide-react';
import OnionLabLogo from './OnionLabLogo';
import UserSettingsModal from './UserSettingsModal';

const ROLE_LABELS = { admin: 'Administrador', editor: 'Editor', viewer: 'Visualização' };
const ROLE_ICONS = { admin: ShieldCheck, editor: Pencil, viewer: Eye };

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const canCreateProject = user && user.role !== 'viewer';
  const isAdminUser = user?.role === 'admin';

  const links = [
    { path: '/', label: 'Dashboard', icon: Home },
    { path: '/runtime', label: 'Run time', icon: Timer },
    {
      path: '/projects',
      label: 'Projetos',
      icon: Folders,
      submenu: canCreateProject ? [
        { path: '/projects/new', label: 'Novo Projeto', icon: FolderPlus },
      ] : [],
    },
    { path: '/priority-map', label: 'Mapa de Prioridades', icon: LayoutGrid },
    { path: '/bugs', label: 'Bugs', icon: Bug },
    {
      path: '/users',
      label: 'Usuários',
      icon: Users,
      submenu: isAdminUser ? [
        { path: '/users', label: 'Usuários', icon: Users },
        { path: '/users/requests', label: 'Pedidos', icon: ClipboardList },
        { path: '/users/parameters', label: 'Parâmetros', icon: SlidersHorizontal },
      ] : [],
    },
  ];

  const RoleIcon = ROLE_ICONS[user?.role] || Eye;

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <OnionLabLogo size={42} style={{ color: '#ffffff', flexShrink: 0 }} />
        <div className="navbar-brand-text">
          <div className="navbar-title">Onion<span>LAB</span></div>
          <div className="navbar-subtitle">Sistema de Gerenciamento de Testes</div>
        </div>
      </Link>

      <div className="navbar-links">
        {links.map(link => {
          const hasSubmenu = link.submenu && link.submenu.length > 0;
          const isActive = location.pathname === link.path
            || (hasSubmenu && link.submenu.some(s => s.path === location.pathname));
          return (
            <div key={link.path} className={`navbar-item ${hasSubmenu ? 'has-submenu' : ''}`}>
              <Link
                to={link.path}
                className={`navbar-link ${isActive ? 'active' : ''}`}
              >
                <link.icon size={16} />
                {link.label}
                {hasSubmenu && <ChevronDown size={13} style={{ opacity: 0.7 }} />}
              </Link>
              {hasSubmenu && (
                <div className="navbar-submenu">
                  {link.submenu.map(sub => (
                    <Link
                      key={sub.path}
                      to={sub.path}
                      className={`navbar-submenu-link ${location.pathname === sub.path ? 'active' : ''}`}
                    >
                      <sub.icon size={14} />
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="navbar-actions">
        <button className="btn btn-ghost btn-icon" onClick={toggleTheme} title="Alternar tema" style={{ marginRight: '0.5rem' }}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <div className="navbar-user-info" title="Sair" style={{ cursor: 'default' }}>
          <div style={{ textAlign: 'right' }}>
            <div className="navbar-user-name">{user?.name || 'Usuário'}</div>
            <div className="navbar-user-role" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
              <RoleIcon size={11} />
              {ROLE_LABELS[user?.role] || 'Visualização'}
            </div>
          </div>
          <div className="navbar-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        </div>
        <button className="btn btn-ghost btn-icon" onClick={() => setIsSettingsOpen(true)} title="Configurações da conta">
          <Settings size={18} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Sair">
          <LogOut size={18} />
        </button>
      </div>
      <UserSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </nav>
  );
}
