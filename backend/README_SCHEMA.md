This project expects the following minimal PostgreSQL schema (see db/schema.sql):

- users: id, full_name, email, password, created_at
- models: id, name, owner_id, created_at
- model_versions: id, model_id, version, description, file_path, uploaded_by, tags, is_active, upload_date
- activity_logs: id, user_id, model_id, version_id, action, message, created_at

Run psql -f backend/db/schema.sql to initialize the database.
