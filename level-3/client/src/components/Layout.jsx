import { useCallback, useState } from 'react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import NotificationBell from './NotificationBell';
import { Avatar, Spinner } from './ui';

export function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner label="Restoring session…" />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { connected, online } = useSocket();
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo" aria-hidden>✓</span> TaskFlow
        </div>
        <nav>
          <NavLink to="/" end>Board</NavLink>
          {isAdmin && <NavLink to="/admin">Team</NavLink>}
        </nav>
        <div className="topbar-right">
          <span className={`conn ${connected ? 'on' : ''}`} title={connected ? 'Real-time connected' : 'Reconnecting…'}>
            <span className="dot on-if" /> {connected ? `${online.length} online` : 'offline'}
          </span>
          <NotificationBell onToast={toast} />
          <Avatar user={user} title={`${user.name} (${user.role})`} />
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="main">
        <Outlet context={{ toast }} />
      </main>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </div>
  );
}
