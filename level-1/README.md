# Level 1 (Basic): REST API + Vanilla Frontend

**Tasks completed:** Task 2 (Build a Simple REST API) and Task 3 (Frontend with HTML, CSS, and JavaScript).
Task 1 (development environment) is covered in [SETUP.md](SETUP.md).

![stack](https://img.shields.io/badge/Node.js-Express_5-green) ![stack](https://img.shields.io/badge/Frontend-Vanilla_JS-yellow)

## Run

```bash
npm install
npm start        # http://localhost:3000  (frontend + API)
npm run dev      # auto-restart on file changes
npm test         # automated API tests
```

## Task 2: REST API

Resource: **products**. Data persists to `data/products.json` (created and seeded on first run).

| Method | Endpoint | Description | Success |
|---|---|---|---|
| GET | `/api/products` | List products. Query params: `search`, `category`, `sort` (`price`, `-price`, `name`) | 200 |
| GET | `/api/products/:id` | Get one product | 200 |
| POST | `/api/products` | Create a product | 201 + `Location` header |
| PUT | `/api/products/:id` | Replace a product | 200 |
| PATCH | `/api/products/:id` | Partially update a product | 200 |
| DELETE | `/api/products/:id` | Delete a product | 204 |
| GET | `/api/health` | Health check | 200 |

**Error handling:** every error returns JSON `{ "error": "...", "details": { field: message } }` with the right status code:
`400` for malformed JSON, `404` for an unknown id or route, `422` for validation errors (name ≥ 2 chars, price ≥ 0, integer stock ≥ 0), and `500` for unexpected errors (logged on the server, generic message to the client).

**Testing with Postman / Thunder Client:** open [`requests.http`](requests.http) (VS Code REST Client / Thunder Client), or import the same requests into Postman. `npm test` runs the same flow automatically.

## Task 3: Frontend

`public/` holds a static layout built with HTML, CSS and vanilla JS:

- Data is loaded with the **Fetch API** and cards are rendered dynamically from a `<template>`
- Full CRUD from the UI: add, edit (pre-filled form), delete (with confirmation)
- Debounced live search and sorting, both done by the API
- Server-side validation errors appear next to the matching form fields
- Loading skeletons, empty state, success/error flash messages, and an API status badge
- Responsive CSS Grid layout (sidebar form collapses on mobile), automatic dark mode
