import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Avatar, Button, Spinner } from '../components/ui';

// Admin-only page (route guarded on the client AND every endpoint guarded on the server)
export default function Admin() {
  const { user } = useAuth();
  const { online } = useSocket();
  const [users, setUsers] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api('/users'), api('/tasks/stats')])
      .then(([u, s]) => { setUsers(u.data); setStats(s); })
      .catch((e) => setError(e.message));
  }, []);

  async function setRole(u, role) {
    try {
      const d = await api(`/users/${u._id}/role`, { method: 'PATCH', body: { role } });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, role: d.data.role } : x)));
    } catch (e) { setError(e.message); }
  }

  async function remove(u) {
    if (!confirm(`Delete ${u.name}? Their tasks will be unassigned.`)) return;
    try {
      await api(`/users/${u._id}`, { method: 'DELETE' });
      setUsers((list) => list.filter((x) => x._id !== u._id));
    } catch (e) { setError(e.message); }
  }

  if (!users) return error ? <div className="alert error">{error}</div> : <Spinner />;
  const onlineIds = new Set(online.map((o) => o.id));

  return (
    <div className="admin">
      <h1>Team management</h1>
      {error && <div className="alert error">{error}</div>}
      {stats && (
        <div className="stats">
          <div className="stat"><span>{stats.byStatus.todo || 0}</span>To do</div>
          <div className="stat"><span>{stats.byStatus.in_progress || 0}</span>In progress</div>
          <div className="stat"><span>{stats.byStatus.done || 0}</span>Done</div>
          <div className="stat"><span>{online.length}</span>Online now</div>
        </div>
      )}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Member</th><th>Email</th><th>Status</th><th>Role</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td><span className="row"><Avatar user={u} size={26} /> {u.name}</span></td>
                <td className="muted">{u.email}</td>
                <td><span className={`dot ${onlineIds.has(u._id) ? 'on' : ''}`} /> {onlineIds.has(u._id) ? 'Online' : 'Offline'}</td>
                <td>
                  <select value={u.role} disabled={u._id === user._id} onChange={(e) => setRole(u, e.target.value)} aria-label={`Role for ${u.name}`}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td>{u._id !== user._id && <Button size="small" variant="danger" onClick={() => remove(u)}>Remove</Button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
