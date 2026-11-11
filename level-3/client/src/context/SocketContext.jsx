import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../api/client';
import { useAuth } from './AuthContext';

const SocketContext = createContext({ socket: null, connected: false, online: [] });

// One shared socket per logged-in session. Reconnects automatically; the cookie authenticates it.
export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState([]);

  useEffect(() => {
    if (!user) return undefined;
    const s = io(API_URL || undefined, { withCredentials: true, transports: ['websocket', 'polling'] });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('presence:list', setOnline);
    s.on('presence:join', (u) => setOnline((list) => (list.some((x) => x.id === u.id) ? list : [...list, u])));
    s.on('presence:leave', ({ id }) => setOnline((list) => list.filter((x) => x.id !== id)));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setConnected(false);
      setOnline([]);
    };
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={{ socket, connected, online }}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);

// Subscribe to a socket event for the lifetime of a component.
export function useSocketEvent(event, handler) {
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return undefined;
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, [socket, event, handler]);
}
