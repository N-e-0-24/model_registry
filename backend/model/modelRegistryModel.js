import { pool } from '../config/db.js';

export const findModelByNameAndOwner = async (name, ownerId) => {
  const res = await pool.query('SELECT * FROM models WHERE name = $1 AND owner_id = $2', [name, ownerId]);
  return res.rows[0];
};

export const createModel = async (name, ownerId) => {
  const res = await pool.query(
    'INSERT INTO models (name, owner_id) VALUES ($1, $2) RETURNING *',
    [name, ownerId]
  );
  return res.rows[0];
};

export const createModelVersion = async ({ modelId, version, description, filePath, uploadedBy, tags }) => {
  const res = await pool.query(
    `INSERT INTO model_versions (model_id, version, description, file_path, uploaded_by, tags, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [modelId, version, description, filePath, uploadedBy, tags || null, true] // default to active true
  );
  return res.rows[0];
};

export const deactivateOtherVersions = async (modelId, trxClient) => {
  // set is_active=false for all other versions for given model
  if (trxClient) {
    await trxClient.query('UPDATE model_versions SET is_active = false WHERE model_id = $1', [modelId]);
  } else {
    await pool.query('UPDATE model_versions SET is_active = false WHERE model_id = $1', [modelId]);
  }
};

export const getLatestVersionsList = async (search) => {
  // We return the active version for each model (join)
  // allow optional name search (case-insensitive)
  const baseQuery = `
    SELECT m.id as model_id, m.name, m.owner_id, v.id as version_id, v.version, v.description, v.upload_date, v.is_active, v.tags
    FROM models m
    JOIN model_versions v ON v.model_id = m.id
    WHERE v.is_active = true
  `;
  const params = [];
  let q = baseQuery;
  if (search) {
    q += ' AND LOWER(m.name) LIKE $1';
    params.push(`%${search.toLowerCase()}%`);
  }
  q += ' ORDER BY v.upload_date DESC';
  const res = await pool.query(q, params);
  return res.rows;
};

export const getModelWithVersions = async (modelId) => {
  const modelRes = await pool.query('SELECT * FROM models WHERE id = $1', [modelId]);
  if (modelRes.rowCount === 0) return null;
  const versionsRes = await pool.query(
    'SELECT * FROM model_versions WHERE model_id = $1 ORDER BY upload_date DESC',
    [modelId]
  );
  return {
    model: modelRes.rows[0],
    versions: versionsRes.rows
  };
};

export const getVersionById = async (versionId) => {
  const res = await pool.query('SELECT * FROM model_versions WHERE id = $1', [versionId]);
  return res.rows[0];
};

export const setActiveVersionTransaction = async (modelId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Get all versions sorted by upload_date (oldest → newest)

   
    const versionsRes = await client.query(
      `SELECT id, version, upload_date, is_active
       FROM model_versions
       WHERE model_id = $1
       ORDER BY upload_date ASC`,
      [modelId]
    );
   
    const versions = versionsRes.rows;
    if (versions.length < 2) {
      await client.query("ROLLBACK");
      return { ok: false, message: "No previous version available to rollback." };
    }

    // 2️⃣ Find currently active version and its index
    const activeIndex = versions.findIndex((v) => v.is_active);
    if (activeIndex <= 0) {
      await client.query("ROLLBACK");
      return { ok: false, message: "No previous version exists before the current one." };
    }

    const currentVersion = versions[activeIndex];
    const previousVersion = versions[activeIndex - 1];

    // 3️⃣ Deactivate current and activate previous
    await client.query(
      "UPDATE model_versions SET is_active = false WHERE id = $1",
      [currentVersion.id]
    );

    await client.query(
      "UPDATE model_versions SET is_active = true WHERE id = $1",
      [previousVersion.id]
    );

    await client.query("COMMIT");

    return {
      ok: true,
      message: `Rolled back to version ${previousVersion.version}`,
      version: previousVersion,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Rollback failed:", err);
    return { ok: false, message: "Error during rollback", error: err };
  } finally {
    client.release();
  }
};

export const getActivityLogs = async (modelId, user_id) => {
  const conditions = [];
  const params = [];

  // Build conditions dynamically
  if (modelId) {
    params.push(modelId);
    conditions.push(`al.model_id = $${params.length}`);
  }

  if (user_id) {
    params.push(user_id);
    conditions.push(`al.user_id = $${params.length}`);
  }

  // Base query with joins
  let query = `
    SELECT 
      al.*,
      u.full_name as user_name,
      u.email as user_email,
      m.name as model_name,
      mv.version as version_number
    FROM activity_logs al
    LEFT JOIN users u ON al.user_id = u.id
    LEFT JOIN models m ON al.model_id = m.id
    LEFT JOIN model_versions mv ON al.version_id = mv.id
  `;

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY al.created_at DESC LIMIT 100';

  // Execute
  const res = await pool.query(query, params);
  return res.rows;
};
