import { pool } from '../config/db.js';
import { createModel, getActivityLogs } from '../model/modelRegistryModel.js';
import { getModelWithVersions } from '../model/modelRegistryModel.js';
import { setActiveVersionTransaction } from '../model/modelRegistryModel.js';
import { getVersionById } from '../model/modelRegistryModel.js';
import { getLatestVersionsList } from '../model/modelRegistryModel.js';
import {
  findModelByNameAndOwner
} from '../model/modelRegistryModel.js';
import fs from 'fs';
import path from 'path';



export const addNewVersion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { modelId } = req.params;
    const { version, description, tags } = req.body;
    const ownerId = req.user; // From protect middleware

    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!version) return res.status(400).json({ message: 'Version is required' });

    await client.query('BEGIN');

    // Ensure model exists and belongs to the user
    const modelRes = await client.query('SELECT * FROM models WHERE id = $1', [modelId]);
    if (modelRes.rowCount === 0) {
      await client.query('ROLLBACK');
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Model not found' });
    }

    const model = modelRes.rows[0];
    if (model.owner_id !== ownerId) {
      await client.query('ROLLBACK');
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ message: 'Not authorized to update this model' });
    }

    // Check if version already exists
    const exists = await client.query(
      'SELECT * FROM model_versions WHERE model_id = $1 AND version = $2',
      [modelId, version]
    );
    if (exists.rowCount > 0) {
      await client.query('ROLLBACK');
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'This version already exists' });
    }

    // Use transactional helper to deactivate others and insert/activate new version
    const insertRes = await client.query(
      `INSERT INTO model_versions (model_id, version, description, file_path, uploaded_by, tags, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING *`,
      [modelId, version, description || null, req.file.path, ownerId, tags || null]
    );

    // Deactivate others (ensure single active)
    await client.query('UPDATE model_versions SET is_active = false WHERE model_id = $1 AND id != $2', [modelId, insertRes.rows[0].id]);

    // Add activity log
    await client.query(
      `INSERT INTO activity_logs (user_id, model_id, version_id, action, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [ownerId, modelId, insertRes.rows[0].id, 'new-version', `Added version ${version}`]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'New version uploaded successfully', version: insertRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding new version:', err);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
};

export const uploadModel = async (req, res) => {
  try {
    // fields: name, version, description, tags (optional)
    const ownerId = req.user; // from protect middleware
    const { name, version, description, tags } = req.body;
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    if (!name || !version) return res.status(400).json({ message: 'Model name and version required' });

    // find or create model
    let model = await findModelByNameAndOwner(name, ownerId);
    if (!model) {
      model = await createModel(name, ownerId);
    }

    // transaction: deactivate other versions then insert this version and set active
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // ensure unique (model_id, version) constraint checked
      const exists = await client.query(
        'SELECT * FROM model_versions WHERE model_id = $1 AND version = $2',
        [model.id, version]
      );
      if (exists.rowCount > 0) {
        // clean up uploaded file
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'This version already exists for the model' });
      }

      // insert new version
      const insertRes = await client.query(
        `INSERT INTO model_versions (model_id, version, description, file_path, uploaded_by, tags, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [model.id, version, description || null, req.file.path, ownerId, tags || null, true]
      );

      // Deactivate others (ensure single active)
      await client.query('UPDATE model_versions SET is_active = false WHERE model_id = $1 AND id != $2', [model.id, insertRes.rows[0].id]);

      // optional: record activity log
      await client.query(
        `INSERT INTO activity_logs (user_id, model_id, version_id, action, message)
         VALUES($1,$2,$3,$4,$5)`,
        [ownerId, model.id, insertRes.rows[0].id, 'upload', `Uploaded version ${version}`]
      );

      await client.query('COMMIT');

      return res.status(201).json({ model: model, version: insertRes.rows[0] });
    } catch (err) {
      await client.query('ROLLBACK');
      // cleanup file
      if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      console.error('Upload transaction error', err);
      return res.status(500).json({ message: 'Server error during upload' });
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

export const listModels = async (req, res) => {
  try {
    const search = req.query.search || null;
    const rows = await getLatestVersionsList(search);
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const getModelDetail = async (req, res) => {
  try {
    const modelId = req.params.modelId;

    if (!modelId || isNaN(Number(modelId))) {
      return res.status(400).json({ message: 'Invalid modelId' });
    }
    const data = await getModelWithVersions(modelId);
    if (!data) return res.status(404).json({ message: 'Model not found' });
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const rollbackVersion = async (req, res) => {
  try {
    const { versionId } = req.body;
    if (!versionId) return res.status(400).json({ message: 'versionId required' });

    // get version to ensure exists and permission
    const version = await getVersionById(versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // optional: check ownership (only owner can rollback)
    // fetch model to compare owner
    const modelRes = await pool.query('SELECT owner_id FROM models WHERE id = $1', [version.model_id]);
    if (modelRes.rowCount === 0) return res.status(400).json({ message: 'Model not found' });
    const ownerId = modelRes.rows[0].owner_id;
    if (ownerId !== req.user) return res.status(403).json({ message: 'Not authorized' });

    // perform transaction to set active (use helper that takes version id)
    const result = await setActiveVersionByIdTransaction(versionId);

    if (!result.ok) return res.status(400).json({ message: result.message });

    // log activity
    await pool.query(
      'INSERT INTO activity_logs (user_id, model_id, version_id, action, message) VALUES ($1,$2,$3,$4,$5)',
      [req.user, version.model_id, versionId, 'rollback', `Rolled back to version ${version.version}`]
    );

    return res.json({ message: 'Rollback successful' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const downloadVersionFile = async (req, res) => {
  try {
    const { versionId } = req.params;
    const version = await getVersionById(versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Confirm requester is owner of the model (or has explicit permission)
    const model = await getModelById(version.model_id);
    if (!model) return res.status(404).json({ message: 'Model not found' });
    if (model.owner_id !== req.user) {
      return res.status(403).json({ message: 'Not authorized to download this file' });
    }

    const filePath = version.file_path;
    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' });
    }

    // log the download action
    await pool.query(
      'INSERT INTO activity_logs (user_id, model_id, version_id, action, message) VALUES ($1,$2,$3,$4,$5)',
      [req.user, version.model_id, versionId, 'download', `Downloaded version ${version.version}`]
    );

    const filename = path.basename(filePath);
    return res.download(filePath, filename);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Server error' });
  }
};


export const fetchActivityLogs = async (req, res) => {
  try {
    const { modelId } = req.params;
    const user_id = req.user;

    const logs = await getActivityLogs(
      modelId ? parseInt(modelId) : null,
      user_id ? parseInt(user_id) : null
    );

    return res.status(200).json({
      success: true,
      count: logs.length,
      data: logs,
    });
  } catch (err) {
    console.error("Error fetching activity logs:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch activity logs",
      error: err.message,
    });
  }
};