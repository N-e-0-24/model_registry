-- Minimal SQL schema for model registry (Postgres)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS models (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS model_versions (
  id SERIAL PRIMARY KEY,
  model_id INTEGER REFERENCES models(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  uploaded_by INTEGER REFERENCES users(id),
  tags TEXT,
  is_active BOOLEAN DEFAULT FALSE,
  upload_date TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_model_version_unique ON model_versions (model_id, version);

CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  model_id INTEGER REFERENCES models(id),
  version_id INTEGER REFERENCES model_versions(id),
  action TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
