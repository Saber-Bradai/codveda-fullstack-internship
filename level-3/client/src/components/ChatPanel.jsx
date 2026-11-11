import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket, useSocketEvent } from '../context/SocketContext';
import { Avatar, Button } from './ui';

const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

// Real-time chat: general channel + direct messages
export default function ChatPanel({ users }) {
  const { user } = useAuth();
  const { socket, online } = useSocket();
  const [peer, setPeer] = useState(null); // null = #general
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(null);
  const [error, setError] = useState('');
  const [unreadDm, setUnreadDm] = useState({});
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef(null);

  const load = useCallback(async (before) => {
    const q = new URLSearchParams();
    if (peer) q.set('with', peer._id);
    if (before) q.set('before', before);
    const d = await api(`/messages?${q}`);
    setHasMore(d.hasMore);
    setMessages((m) => (before ? [...d.data, ...m] : d.data));
  }, [peer]);

  useEffect(() => {
    stickToBottom.current = true;
    setMessages([]);
    load().catch((e) => setError(e.message));
    if (peer) setUnreadDm((u) => ({ ...u, [peer._id]: 0 }));
  }, [load, peer]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const belongsHere = useCallback(
    (m) => {
      if (!peer) return !m.to;
      const ids = [m.from._id, m.to];
      return ids.includes(peer._id) && ids.includes(user._id);
    },
    [peer, user._id]
  );

  useSocketEvent(
    'chat:message',
    useCallback(
      (m) => {
        if (belongsHere(m)) {
          setMessages((list) => (list.some((x) => x._id === m._id) ? list : [...list, m]));
          setTyping(null);
        } else if (m.to && m.from._id !== user._id) {
          setUnreadDm((u) => ({ ...u, [m.from._id]: (u[m.from._id] || 0) + 1 }));
        }
      },
      [belongsHere, user._id]
    )
  );

  useSocketEvent(
    'chat:typing',
    useCallback(
      (t) => {
        const relevant = peer ? t.to === user._id && t.user.id === peer._id : !t.to;
        if (!relevant) return;
        setTyping(t.user.name);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 2500);
      },
      [peer, user._id]
    )
  );

  async function send(e) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !socket) return;
    setError('');
    stickToBottom.current = true;
    const ack = await socket.timeout(5000).emitWithAck('chat:send', { text: body, to: peer?._id ?? null }).catch(() => ({ error: 'Server did not respond' }));
    if (ack.error) setError(ack.error);
    else setText('');
  }

  const onlineIds = new Set(online.map((o) => o.id));
  const others = users.filter((u) => u._id !== user._id);

  return (
    <aside className="chat">
      <div className="chat-tabs" role="tablist">
        <button role="tab" aria-selected={!peer} className={!peer ? 'active' : ''} onClick={() => setPeer(null)}># general</button>
        {others.map((u) => (
          <button key={u._id} role="tab" aria-selected={peer?._id === u._id} className={peer?._id === u._id ? 'active' : ''} onClick={() => setPeer(u)} title={`Message ${u.name}`}>
            <span className={`dot ${onlineIds.has(u._id) ? 'on' : ''}`} />
            {u.name.split(' ')[0]}
            {unreadDm[u._id] > 0 && <span className="count">{unreadDm[u._id]}</span>}
          </button>
        ))}
      </div>

      <div
        className="chat-list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
      >
        {hasMore && (
          <button className="link center" onClick={() => { stickToBottom.current = false; load(messages[0]?.createdAt); }}>
            Load older messages
          </button>
        )}
        {messages.length === 0 && <p className="empty">No messages yet. Say hi 👋</p>}
        {messages.map((m) => (
          <div key={m._id} className={`msg ${m.from._id === user._id ? 'mine' : ''}`}>
            <Avatar user={m.from} size={26} />
            <div>
              <div className="msg-meta">
                <strong>{m.from.name}</strong> <span className="muted">{time.format(new Date(m.createdAt))}</span>
              </div>
              <p>{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="typing muted small">{typing ? `${typing} is typing…` : ' '}</div>
      {error && <div className="alert error small">{error}</div>}
      <form className="chat-form" onSubmit={send}>
        <input
          value={text}
          maxLength={1000}
          placeholder={peer ? `Message ${peer.name}` : 'Message #general'}
          onChange={(e) => {
            setText(e.target.value);
            socket?.emit('chat:typing', { to: peer?._id ?? null });
          }}
          aria-label="Chat message"
        />
        <Button variant="primary" type="submit" disabled={!text.trim()}>Send</Button>
      </form>
    </aside>
  );
}
