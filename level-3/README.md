# Level 3 (Advanced): TaskFlow, a Real-Time MERN Team Board

**Tasks completed:** Task 1 (Full-Stack MERN Application) and Task 2 (WebSockets for Real-Time Communication).

**Live:** https://taskflow-uc0b.onrender.com

TaskFlow is a team task board (Kanban) with live updates, team chat, direct messages and personal notifications.

```
client/  React 19 + Vite + React Router (functional components, context state, reusable UI)
server/  Express 5 + MongoDB/Mongoose + JWT auth/RBAC + Socket.io
Dockerfile   deployment (render.yaml is at the repo root)
```

## Run locally

```bash
# Option A: one server (production-like)
cd client && npm install && npm run build
cd ../server && npm install && npm start            # http://localhost:5000

# Option B: hot reload (two terminals)
cd server && npm run dev                            # API + sockets on :5000
cd client && npm run dev                            # http://localhost:5173 (proxies /api and /socket.io)

cd server && npm test                               # 5 end-to-end tests (REST + Socket.io)
```

Without `MONGO_URI`, the server uses an in-memory MongoDB and seeds two demo accounts (an **admin** and a **member**; credentials are in `server/.env.example`). To see real-time updates, log in as each user in a different browser or a private window.

## Task 1: Full-stack application

| Objective | Implementation |
|---|---|
| Fully integrated app | React SPA ↔ REST API ↔ MongoDB. Tasks have title, description, status, priority, due date, assignee and creator. Features: drag & drop between columns, search, "assigned to me" filter, admin team page with stats. |
| Auth + role-based access | bcrypt + JWT in an **HTTP-only cookie** (shared by REST and the socket handshake). Roles are `member` and `admin`. **Admin or creator** can edit everything, the **assignee** can change status only, and **admin** can manage roles and remove users. Checks run on the server; the UI hides actions you can't take, and the `/admin` route is guarded. |
| Deployment | `Dockerfile` (multi-stage: builds the client, serves it from Express) and `render.yaml` (Render Blueprint + MongoDB Atlas). Splitting frontend and backend (e.g. Vercel + Render) also works: set `VITE_API_URL` on the client and `CLIENT_ORIGIN` on the server. Production cookies use `Secure; SameSite=None`. |
| Performance | Route-level **code splitting** (`React.lazy`), vendor chunk splitting, immutable 1-year caching for hashed assets, gzip `compression`, MongoDB **indexes** for every query pattern, `.lean()` reads, `React.memo` cards, `useMemo` for derived columns, `useDeferredValue` search, **optimistic UI** with rollback. |

## Task 2: WebSockets (Socket.io)

| Objective | Implementation |
|---|---|
| WebSockets with Express + a frontend framework | Socket.io shares the Express HTTP server. React uses one shared socket through `SocketProvider` and a `useSocketEvent` hook. Sockets **authenticate with the same JWT cookie**, and unauthenticated connections are rejected. |
| Bidirectional communication | Client → server: `chat:send` (with **acknowledgements** for errors), `chat:typing`. Server → client: `task:created/updated/deleted`, `chat:message`, `presence:*`, `notification:new`. |
| User-specific notifications/messages | Each user's sockets (all tabs and devices) join a `user:<id>` room. Assignment, status-change and DM notifications go **only to the users involved**, are saved in MongoDB (unread badge, mark all read, TTL cleanup after 30 days) and pop up as toasts. **Direct messages** reach only the two participants. |
| Efficient updates | The server sends **single-task diffs** instead of whole-board refetches. The client applies them idempotently. Typing events are **throttled and `volatile`**, chat has per-socket **flood protection**, there's a `perMessageDeflate` size threshold, **connection-state recovery** for brief disconnects (plus a resync on reconnect), presence counts multiple tabs per user, and sockets of deleted users are force-disconnected. |

## REST API

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` · `/login` · `/logout` | public |
| GET | `/api/auth/me` | logged in |
| GET / POST | `/api/tasks` (`?search=&assignee=me&priority=`) | logged in |
| PATCH | `/api/tasks/:id` | admin/creator (all fields), assignee (status) |
| DELETE | `/api/tasks/:id` | admin/creator |
| GET | `/api/tasks/stats` | logged in |
| GET | `/api/messages?with=<userId>&before=<date>` | logged in (cursor pagination) |
| GET / PATCH | `/api/notifications`, `/read-all`, `/:id/read` | own only |
| GET | `/api/users` | logged in |
| PATCH / DELETE | `/api/users/:id/role`, `/api/users/:id` | admin |

## Deploy to Render (free tier)
1. Create a free **MongoDB Atlas** cluster and copy its connection string (allow access from `0.0.0.0/0`).
2. Push the repository to GitHub. `render.yaml` is already at the repo root and points to `rootDir: level-3`.
3. In Render, go to **New → Blueprint**, pick the repo, then paste your Atlas connection string as `MONGO_URI` (the app URL is detected automatically).
4. Also add `ADMIN_PASSWORD` and `DEMO_PASSWORD` with private values. In production the demo accounts are only created with these (the defaults in `.env.example` are public). Changing them and redeploying rotates the demo passwords.
