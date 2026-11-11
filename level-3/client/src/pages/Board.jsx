import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocketEvent } from '../context/SocketContext';
import TaskCard from '../components/TaskCard';
import TaskForm from '../components/TaskForm';
import ChatPanel from '../components/ChatPanel';
import { Button, EmptyState, Modal, Spinner } from '../components/ui';

const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export default function Board() {
  const { user, isAdmin } = useAuth();
  const { toast } = useOutletContext();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // task | 'new' | null
  const [search, setSearch] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const fetchTasks = useCallback(async () => {
    const d = await api('/tasks');
    setTasks(d.data);
  }, []);

  useEffect(() => {
    Promise.all([fetchTasks(), api('/users').then((d) => setUsers(d.data))])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [fetchTasks]);

  // ---- Real-time sync: apply single-task diffs instead of refetching the board
  const upsert = useCallback((t) => setTasks((list) => {
    const i = list.findIndex((x) => x._id === t._id);
    if (i === -1) return [t, ...list];
    const next = list.slice();
    next[i] = t;
    return next;
  }), []);
  useSocketEvent('task:created', upsert);
  useSocketEvent('task:updated', upsert);
  useSocketEvent('task:deleted', useCallback(({ _id }) => setTasks((list) => list.filter((t) => t._id !== _id)), []));
  useSocketEvent('tasks:refresh', useCallback(() => { fetchTasks().catch(() => {}); }, [fetchTasks]));
  // Reconnect after a long disconnect → resync
  useSocketEvent('connect', useCallback(() => { fetchTasks().catch(() => {}); }, [fetchTasks]));

  const perms = useCallback((t) => {
    const owner = t.createdBy?._id === user._id;
    const assignee = t.assignee?._id === user._id;
    return { editAll: isAdmin || owner, move: isAdmin || owner || assignee, del: isAdmin || owner };
  }, [isAdmin, user._id]);

  // Derived, memoized column data
  const columns = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const filtered = tasks.filter((t) =>
      (!mineOnly || t.assignee?._id === user._id) &&
      (!q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q))
    );
    return Object.fromEntries(COLUMNS.map((c) => [c.key, filtered.filter((t) => t.status === c.key)]));
  }, [tasks, deferredSearch, mineOnly, user._id]);

  // Optimistic status change with rollback on error
  const move = useCallback(async (task, status) => {
    if (task.status === status) return;
    const prev = task;
    upsert({ ...task, status });
    try {
      const d = await api(`/tasks/${task._id}`, { method: 'PATCH', body: { status } });
      upsert(d.data);
    } catch (e) {
      upsert(prev);
      toast(e.message);
    }
  }, [upsert, toast]);

  async function save(form) {
    if (editing === 'new') {
      const d = await api('/tasks', { method: 'POST', body: form });
      upsert(d.data);
    } else {
      const d = await api(`/tasks/${editing._id}`, { method: 'PATCH', body: form });
      upsert(d.data);
    }
    setEditing(null);
  }

  async function remove() {
    if (!confirm(`Delete "${editing.title}"?`)) return;
    try {
      await api(`/tasks/${editing._id}`, { method: 'DELETE' });
      setTasks((list) => list.filter((t) => t._id !== editing._id));
      setEditing(null);
    } catch (e) {
      toast(e.message);
    }
  }

  const open = useCallback((t) => setEditing(t), []);

  if (loading) return <Spinner label="Loading board…" />;

  return (
    <div className="board-layout">
      <section className="board">
        <div className="toolbar">
          <h1>Team board</h1>
          <div className="row wrap">
            <input type="search" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search tasks" />
            <label className="check">
              <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} /> Assigned to me
            </label>
            <Button variant="primary" onClick={() => setEditing('new')}>+ New task</Button>
          </div>
        </div>
        {error && <div className="alert error">{error}</div>}
        <div className="columns">
          {COLUMNS.map((c) => (
            <div
              key={c.key}
              className={`column ${dragOver === c.key ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(c.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(null);
                const t = tasks.find((x) => x._id === e.dataTransfer.getData('text/task-id'));
                if (t && perms(t).move) move(t, c.key);
              }}
            >
              <h2 className={`col-head ${c.key}`}>{c.label} <span className="muted">{columns[c.key].length}</span></h2>
              <div className="col-body">
                {columns[c.key].length === 0 && <EmptyState>Nothing here</EmptyState>}
                {columns[c.key].map((t) => (
                  <TaskCard key={t._id} task={t} canEdit={perms(t).move} onOpen={open} onMove={move} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <ChatPanel users={users} />

      {editing && (
        <Modal title={editing === 'new' ? 'New task' : 'Edit task'} onClose={() => setEditing(null)}>
          <TaskForm
            task={editing === 'new' ? null : editing}
            users={users}
            canEditAll={editing === 'new' || perms(editing).editAll}
            canDelete={editing !== 'new' && perms(editing).del}
            onSubmit={save}
            onDelete={remove}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}
