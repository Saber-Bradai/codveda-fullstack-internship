# Level 2 (Intermediate): Authentication, Authorization & Database Integration

**Tasks completed:** Task 2 (Authentication and Authorization) and Task 3 (Database Integration).
The React frontend (Task 1) is part of the Level 3 app.

## Run

```bash
npm install
cp .env.example .env   # optional; without MONGO_URI an in-memory MongoDB is used and auto-seeded
npm start              # http://localhost:4000/api
npm test               # 8 integration tests against an in-memory MongoDB
```

With a real database, run `npm run seed` once to create the admin account and sample data (credentials come from `.env`).

## Task 2: Authentication & Authorization

| Objective | Implementation |
|---|---|
| bcrypt + JWT | Passwords are hashed with **bcrypt (12 rounds)** in a Mongoose `pre('save')` hook. Login issues a **JWT** (`sub`, `role`, expiry). |
| Secure token storage | The JWT is set as an **HTTP-only, SameSite, Secure-in-production cookie** that JavaScript can't read. A `Bearer` header also works for Postman and mobile clients. |
| Protect routes / roles | `authenticate` middleware verifies the token and reloads the user from the database, so role changes and deletions apply immediately. `authorize('admin')` restricts routes by role. **Ownership checks** let users edit only their own products (admins can edit any). |
| Hash before saving | `password` has `select: false` and is stripped from JSON output, so it never leaves the server. |
| Extras | Rate limiting on login/register, the same error for unknown email and wrong password (prevents user enumeration), `helmet` security headers, password strength rules, public signups always get the `user` role. |

## Task 3: Database Integration (MongoDB + Mongoose)

**Models and relationships**
```
User 1 ──< Product >── 1 Category
  1                │
  └──< Review >────┘   (one review per user per product)
```
- `Product.category → Category` and `Product.createdBy → User` (references, populated in responses)
- `Category.productCount`: virtual populate (one-to-many count)
- `Review → Product + User`, which keeps `Product.ratingAvg/ratingCount` updated through an aggregation pipeline

**Indexing and optimization**
- Unique indexes: `User.email`, `Category.slug`, and compound unique `Review(product, user)`
- **Text index** on `Product(name, description)` for `?search=`
- **Compound index** `Product(category, price)` for filter + sort (verified with `explain()` in the tests)
- `Product(createdBy, createdAt)` for "my products"
- `.lean()` reads, `Promise.all` for count + page queries, pagination capped at 100, projections on populate, denormalized rating summary

**Validation before saving:** requests are validated with **zod** before they reach the database (body and query params). Mongoose schema validators run as a second layer. Errors map to `422` with per-field details, duplicates to `409`, invalid ids to `400`.

## API

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | public |
| POST | `/api/auth/login` | public |
| POST | `/api/auth/logout` | public |
| GET | `/api/auth/me` | logged in |
| GET | `/api/products?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=` | public |
| GET | `/api/products/:id` | public |
| GET | `/api/products/mine` | logged in |
| POST | `/api/products` | logged in |
| PATCH / DELETE | `/api/products/:id` | owner or admin |
| GET / POST | `/api/products/:id/reviews` | public / logged in |
| GET | `/api/categories` | public |
| POST / PUT / DELETE | `/api/categories/:id?` | admin |
| GET | `/api/users` | admin |
| PATCH | `/api/users/:id/role` | admin |
| DELETE | `/api/users/:id` | admin |

Ready-made requests for Thunder Client / REST Client are in [`requests.http`](requests.http).
