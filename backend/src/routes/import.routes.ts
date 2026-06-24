import { Router } from 'express';
import { startImport, getImportStatus } from '../controllers/import.controller';
import { verifyAccessToken } from '../middleware/auth';
import { importUpload } from '../config/import-multer';

const router = Router();

router.post('/', verifyAccessToken, importUpload.single('file'), startImport);
router.get('/:id', verifyAccessToken, getImportStatus);

export default router;
