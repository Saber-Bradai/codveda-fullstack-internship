import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useSocketEvent } from '../context/SocketContext';

const rel = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function ago(date) {
  const s = Math.round((new Date(date) - Date.now()) / 1000);
  if (s > -60) return rel.format(s, 'second');
  if (s > -3600) return rel.format(Math.round(s / 60), 'minute');
  if (s > -86400) return rel.format(Math.round(s / 3600), 'hour');
  return rel.format(Math.round(s / 86400), 'day');
}

// User-specific live notifications (pushed to the "user:<id>" room)
export default function NotificationBell({ onToast }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    api('/notifications').then((d) => {
      setItems(d.data);
      setUnread(d.unread);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const close = (e) => !ref.current?.contains(e.target) && setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useSocketEvent(
    'notification:new',
    useCallback((n) => {
      setItems((list) => [n, ...list].slice(0, 50));
      setUnread((c) => c + 1);
      onToast?.(n.text);
    }, [onToast])
  );

  async function markAll() {
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    setUnread(0);
    await api('/notifications/read-all', { method: 'PATCH' }).catch(() => {});
  }

  return (
    <div className="bell" ref={ref}>
      <button className="icon-btn" aria-label={`Notifications (${unread} unread)`} onClick={() => setOpen((o) => !o)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="badge-count">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="dropdown">
          <div className="row-between dropdown-head">
            <strong>Notifications</strong>
            {unread > 0 && <button className="link" onClick={markAll}>Mark all read</button>}
          </div>
          {items.length === 0 && <p className="empty small">You're all caught up.</p>}
          <ul>
            {items.map((n) => (
              <li key={n._id} className={n.read ? '' : 'unread'}>
                <span>{n.text}</span>
                <small className="muted">{ago(n.createdAt)}</small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
