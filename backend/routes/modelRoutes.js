import express from 'express';
import { uploadModel , listModels , getModelDetail , rollbackVersion , downloadVersionFile, addNewVersion, fetchActivityLogs} from '../controllers/modelController.js';
import { protect } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Upload model (multipart form-data)
// fields: name, version, description, tags
router.post('/upload', protect, upload.single('file'), uploadModel);

// List models (active versions) with optional ?search=name
router.get('/', protect, listModels);

// Get model detail and all versions
router.get('/:modelId', protect, getModelDetail);

// Rollback to older version: body { versionId }
router.post('/:modelId/rollback', protect, rollbackVersion);

// Download a specific version (public? or protected)
router.get('/download/:versionId',  downloadVersionFile);


router.post('/:modelId/new-version', protect, upload.single('file'), addNewVersion);

router.get('/:modelId/logs', protect, fetchActivityLogs);

export default router;
