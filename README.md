# Codveda Full-Stack Development Internship

My solutions to the Codveda Full-Stack task list. The brief asks for **two tasks per level**, and each level lives in its own folder (one "file" per level, as the submission instructions ask).

| Level | Folder | Tasks completed | Stack |
|---|---|---|---|
| 1 · Basic | [`level-1/`](level-1) | **Task 2** Simple REST API · **Task 3** HTML/CSS/JS frontend (+ Task 1 setup notes) | Node.js, Express 5, vanilla JS |
| 2 · Intermediate | [`level-2/`](level-2) | **Task 2** Authentication & Authorization · **Task 3** Database Integration | Express, MongoDB/Mongoose, bcrypt, JWT, zod |
| 3 · Advanced | [`level-3/`](level-3) | **Task 1** Full-stack MERN app · **Task 2** WebSockets (Socket.io) | MongoDB, Express, React 19 (Vite), Node.js, Socket.io |

**Live demo (Level 3):** https://taskflow-uc0b.onrender.com (free tier, so the first load after a quiet period takes ~30 s)

Each level builds on the previous one: a CRUD API → a secured API backed by a real database → a deployed real-time React app.

## Quick start

Prerequisites: **Node.js ≥ 22** and npm (see [`level-1/SETUP.md`](level-1/SETUP.md)). MongoDB is optional for local development. If `MONGO_URI` is not set, Levels 2 and 3 start an in-memory MongoDB automatically. The first run downloads the MongoDB binary (~700 MB), once per level.

```bash
# Level 1 — http://localhost:3000
cd level-1 && npm install && npm start

# Level 2 — API at http://localhost:4000/api
cd level-2 && npm install && npm start

# Level 3 — build the client, then one server serves it at http://localhost:5000
cd level-3/client && npm install && npm run build
cd ../server && npm install && npm start
```

Every level has automated tests (`npm test`): **2 + 8 + 5 tests, all passing**.

## Repository layout

```
level-1/   Express CRUD API + static frontend (public/)
level-2/   Auth + MongoDB API (src/models, src/routes, src/middleware)
level-3/   server/ (Express + Socket.io) · client/ (React) · Dockerfile
render.yaml     Render Blueprint for deploying Level 3
SUBMISSION.md   checklist + LinkedIn post template for the internship submission
```
