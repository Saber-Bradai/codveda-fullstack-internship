// Level 3 - Task 2: Real-time layer (Socket.io)
//
// Rooms:
//   "board"       → every authenticated socket; receives task changes, presence, general chat
//   "user:<id>"   → all sockets (tabs/devices) of one user; receives notifications + direct messages
const { Server } = require('socket.io');
const cookie = require('cookie');
const env = require('../config/env');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { userFromToken } = require('../middleware/auth');
const { COOKIE_NAME } = require('../utils');
const schemas = require('../schemas');

let io;
const online = new Map(); // userId -> { user, sockets: number }

const userRoom = (id) => `user:${id}`;

function presenceList() {
  return [...online.values()].map((e) => e.user);
}

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: env.clientOrigin, credentials: true },
    // Compress only larger payloads; small events go out uncompressed (saves CPU)
    perMessageDeflate: { threshold: 1024 },
    pingInterval: 25000,
    pingTimeout: 20000,
    // Lets clients that briefly drop (wifi switch, sleep) recover missed events without a full reload
    connectionStateRecovery: { maxDisconnectionDuration: 2 * 60 * 1000 },
  });

  // ---- Authentication middleware: same JWT as the REST API ------------------
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies[COOKIE_NAME] || socket.handshake.auth?.token;
      socket.data.user = await userFromToken(token);
      next();
    } catch (err) {
      next(new Error(err.message || 'Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    socket.join(['board', userRoom(user.id)]);

    // ---- Presence (counts multiple tabs per user) ----------------------------
    const entry = online.get(user.id) || { user: { id: user.id, name: user.name, color: user.color }, sockets: 0 };
    entry.sockets += 1;
    online.set(user.id, entry);
    if (entry.sockets === 1) socket.to('board').emit('presence:join', entry.user);
    socket.emit('presence:list', presenceList());

    // ---- Chat: client → server with acknowledgement --------------------------
    const sendTimes = [];
    socket.on('chat:send', async (payload, ack = () => {}) => {
      try {
        // Simple per-socket flood protection: max 10 messages / 5 seconds
        const now = Date.now();
        while (sendTimes.length && now - sendTimes[0] > 5000) sendTimes.shift();
        if (sendTimes.length >= 10) return ack({ error: 'You are sending messages too fast' });
        sendTimes.push(now);

        const parsed = schemas.chatMessage.safeParse(payload || {});
        if (!parsed.success) return ack({ error: parsed.error.issues[0].message });
        const { text, to = null } = parsed.data;
        if (to === user.id) return ack({ error: 'You cannot message yourself' });

        const msg = await Message.create({ from: user.id, to, text });
        const out = {
          _id: msg._id,
          text: msg.text,
          to: msg.to,
          createdAt: msg.createdAt,
          from: { _id: user.id, name: user.name, color: user.color },
        };
        if (to) {
          // Direct message: only the two participants (all their tabs) get it
          io.to([userRoom(to), userRoom(user.id)]).emit('chat:message', out);
          await notify(to, { type: 'direct_message', text: `${user.name}: ${text.slice(0, 80)}` });
        } else {
          io.to('board').emit('chat:message', out);
        }
        ack({ ok: true, message: out });
      } catch (err) {
        console.error('[socket] chat:send failed', err);
        ack({ error: 'Could not send message' });
      }
    });

    // ---- Typing indicator: throttled + volatile (ok to drop) -----------------
    let lastTyping = 0;
    socket.on('chat:typing', ({ to = null } = {}) => {
      const now = Date.now();
      if (now - lastTyping < 1000) return;
      lastTyping = now;
      const target = to ? userRoom(to) : 'board';
      socket.to(target).volatile.emit('chat:typing', { user: { id: user.id, name: user.name }, to });
    });

    socket.on('disconnect', () => {
      const e = online.get(user.id);
      if (!e) return;
      e.sockets -= 1;
      if (e.sockets <= 0) {
        online.delete(user.id);
        io.to('board').emit('presence:leave', { id: user.id });
      }
    });
  });

  return io;
}

// Emit to everyone on the board (used by REST routes after DB writes).
function broadcast(event, data, { except } = {}) {
  if (!io) return;
  (except ? io.to('board').except(userRoom(except)) : io.to('board')).emit(event, data);
}

// Persist + push a user-specific notification.
async function notify(userId, { type, text, task = null }) {
  const n = await Notification.create({ user: userId, type, text, task });
  if (io) io.to(userRoom(userId.toString())).emit('notification:new', n.toJSON());
  return n;
}

// Disconnect all sockets of a user (e.g., after the user is deleted).
function kick(userId) {
  if (io) io.in(userRoom(userId)).disconnectSockets(true);
}

module.exports = { initSocket, broadcast, notify, kick, getIO: () => io, presenceList };
