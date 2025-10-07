# Model Registry — Improved README & Developer Files

This document contains an updated `README.md`, `.env.example` files for backend and frontend, and example implementations for a centralized error middleware and express-validator usage for model endpoints. It also includes recommendations for DB migrations and responsiveness fixes for the frontend.

---

# Model Registry

A lightweight Model Registry application (Next.js frontend + Express/Postgres backend) for uploading and managing model versions with activity logs and access control.

## What this update includes

* A clear, step-by-step **README** with setup and troubleshooting.
* `backend/.env.example` and `frontend/.env.example` files.
* **Centralized error middleware** (example file) and instructions to wire it up.
* **Express-validator** example for model endpoints (upload / new-version / rollback).
* Notes on DB schema, migrations, and running `schema.sql`.
* Frontend responsiveness tips and a small Tailwind snippet to improve mobile layout.

---

## Architecture & Structure (concise)

* Frontend: Next.js (App router) running on port `3000` by default.
* Backend: Express.js API running on port `3001` by default.
* Database: PostgreSQL (connection via `DATABASE_URL` or individual env vars).

Repository layout (top-level):

```
model_registry/
├─ backend/        # Express API, controllers, models, migrations
├─ frontend/       # Next.js app (App Router)
├─ README.md       # this file
└─ .env.example    # root template
```

---

## Key Observations / Known Issues (summary)

1. **Port conflict**: Ensure frontend (`3000`) and backend (`3001`) do not overlap. Check `package.json` start scripts and `.env` values.
2. **Missing env templates**: Added `backend/.env.example` and `frontend/.env.example` below.
3. **No migration tooling**: `backend/db/schema.sql` exists; prefer adding migrations (Knex/Prisma/node-pg-migrate).
4. **Inconsistent error handling**: Example centralized error middleware included.
5. **Frontend responsiveness**: Minor layout issues on small screens — suggestions below.

---

## Quickstart (developer)

### Prerequisites

* Node.js 18+ (or project's node version)
* PostgreSQL running locally or remotely
* npm or yarn

### Clone

```bash
git clone <repo-url>
cd model_registry
```

### Backend setup

```bash
cd backend
cp .env.example .env   # edit values
npm install
# initialize DB (see schema)
psql <YOUR_DB_CONN_STRING> -f db/schema.sql
npm run dev
```

**Notes**: Backend defaults to `PORT=3001`. If you change it, update `frontend/.env.local` `NEXT_PUBLIC_API_URL` accordingly.

### Frontend setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Frontend will run at `http://localhost:3000` and backend at `http://localhost:3001` by default.

---

## .env examples

### backend/.env.example

```
# Backend server
PORT=3001

# Postgres
# Either provide a single DATABASE_URL or use individual values below
DATABASE_URL=postgres://postgres:password@localhost:5432/model_registry
# Optional alternative pieces (used only if you don't supply DATABASE_URL)
# PG_HOST=localhost
# PG_PORT=5432
# PG_DATABASE=model_registry
# PG_USER=postgres
# PG_PASSWORD=password

# JWT secret
JWT_SECRET=your_jwt_secret_here

# Optional: location for uploaded model files (relative to backend root)
UPLOAD_DIR=uploads/models

# Optional: set log level (info | debug | warn | error)
LOG_LEVEL=info
```

### frontend/.env.example

```
# Frontend dev API target — point this at your backend host
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Database schema

A minimal `backend/db/schema.sql` file should create the core tables: `users`, `models`, `model_versions`, `activity_logs`. Example (short):

```sql
-- backend/db/schema.sql (partial example)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_versions (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  file_path TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Recommendation**: Add migrations using `knex`, `Prisma Migrate`, or `node-pg-migrate` for versioned changes.

---

## API Reference (short)

All API routes are prefixed with `/api`.

### Authentication

* `POST /api/auth/register` — register user (body: `fullName`, `email`, `password`)
* `POST /api/auth/login` — login (body: `email`, `password`)

### Models

* `POST /api/models/upload` — upload a new model (multipart: `file` + fields: `name`, `version`, `description`, `tags`). Protected.
* `GET /api/models` — list latest active versions (optional `?search=name`). Protected.
* `GET /api/models/:modelId` — get model with all versions. Protected.
* `POST /api/models/:modelId/new-version` — upload a new version for existing model (multipart). Protected.
* `POST /api/models/:modelId/rollback` — rollback to a previous version (body: `{ versionId }`). Protected.
* `GET /api/models/download/:versionId` — download a version file (Protected; owner only).
* `GET /api/models/:modelId/logs` — get activity logs for a model. Protected.

**Error responses**: Controllers currently return objects like `{ message: '...' }`. See below for a standardized pattern.

---

## Standardized API error response (recommended)

```json
{ "success": false, "message": "Validation failed", "details": { "field": "error" } }
```

And on success:

```json
{ "success": true, "data": { ... } }
```

---

## Centralized error middleware (example)

Create `backend/src/middleware/errorHandler.js` and wire it up as the last middleware in `app.js` / `index.js`.

```js
// backend/src/middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  const status = err.status || 500;
  const response = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (err.details) response.details = err.details;
  // Example: differentiate validation errors
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  // log the error (replace with your logger)
  console.error(err);

  res.status(status).json(response);
};
```

**Usage**: in your Express app entry (e.g., `backend/src/index.js`):

```js
const express = require('express');
const app = express();
// ... your routes and middleware
const errorHandler = require('./middleware/errorHandler');
app.use(errorHandler);
```

Controllers should `throw` or `next(err)` with a friendly structure (e.g., `next({ status: 400, message: 'Bad request', details: { name: 'required' } })`) so the middleware formats it.

---

## Express-validator example for model endpoints

Install: `npm install express-validator`

Create a small validator module `backend/src/validators/models.js`:

```js
const { body } = require('express-validator');

exports.uploadModel = [
  body('name').isString().trim().notEmpty().withMessage('name is required'),
  body('version')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('version is required')
    // optionally add semver regex
    .matches(/^\d+\.\d+\.\d+(?:-[\w\.]+)?$/)
    .withMessage('version must be semver-like'),
];

exports.rollback = [
  body('versionId').isInt().withMessage('versionId must be an integer'),
];
```

In your route/controller:

```js
const { validationResult } = require('express-validator');
const validators = require('../validators/models');

app.post('/api/models/upload', validators.uploadModel, async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next({ status: 422, message: 'Validation failed', details: errors.mapped() });
  }

  try {
    // handle upload
    res.json({ success: true, data: { /* ... */ } });
  } catch (err) {
    next(err);
  }
});
```

This will produce clean validation failure responses via the centralized error middleware.

---

## Example: Standardized controller pattern

```js
// backend/src/controllers/modelsController.js (sketch)
exports.upload = async (req, res, next) => {
  try {
    const { name, version } = req.body;
    // validation already done by middleware
    // store file, create model and version rows...
    res.json({ success: true, data: createdVersion });
  } catch (err) {
    // If you want to attach more context to the error, do so
    err.message = err.message || 'Failed to upload model';
    next(err);
  }
};
```

---

## Frontend responsiveness notes

1. Ensure you have the responsive meta tag in `app/head` or `_document`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

2. If using Tailwind, ensure `tailwind.config.js` includes sensible breakpoints and that components use responsive utility classes, e.g. `className="p-4 sm:p-6 md:p-8"`.

3. Example card layout (Tailwind) that adapts to mobile:

```jsx
export default function ModelCard({ model }) {
  return (
    <div className="rounded-2xl p-4 sm:p-6 shadow-md">
      <h3 className="text-lg sm:text-xl font-semibold truncate">{model.name}</h3>
      <p className="text-sm sm:text-base text-muted-foreground truncate">{model.description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {model.tags?.map(t => (
          <span key={t} className="text-xs sm:text-sm px-2 py-1 border rounded-full">{t}</span>
        ))}
      </div>
    </div>
  );
}
```

4. For responsive tables, consider stacking rows on small screens or using an overflow container: `className="overflow-x-auto"` on the table wrapper.

---

## Testing & Postman

Provide a Postman collection or a simple `curl` example in README for key endpoints. Example upload `curl` (multipart):

```bash
curl -X POST "${API_BASE}/api/models/upload" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@./my_model.zip" \
  -F "name=MyModel" -F "version=1.0.0" -F "description=Initial upload"
```

---

## Developer recommendations (next steps)

1. **Standardize request validation** (we added `express-validator` example). Validate semver for versions.
2. **Add centralized error handler** (example provided). Convert controllers to `throw` or `next(err)` accordingly.
3. **Add DB migrations** with `knex` or `Prisma` for safe, versioned schema changes instead of raw `schema.sql`.
4. **Add unit and integration tests** for controllers (mock `pg` pool or use test DB). Use `jest` + `supertest`.
5. **CI/CD**: Add GitHub Actions workflow to run tests and optionally run migrations on deploy.
6. **Security**: Validate file types and size for uploads; ensure download endpoints check ownership and signed URLs if storing on S3.

---

## Files provided above (copy into repo)

* `backend/.env.example` (text shown earlier)
* `frontend/.env.example` (text shown earlier)
* `backend/src/middleware/errorHandler.js` (example code block above)
* `backend/src/validators/models.js` (validator example above)
* `backend/db/schema.sql` (short example above)

---



*End of improved README & developer notes.*
