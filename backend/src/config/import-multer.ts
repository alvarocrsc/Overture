import multer from 'multer';
import os from 'os';

/**
 * Multer instance for Letterboxd ZIP uploads.
 *
 * Uses disk storage (not memory) because the export ZIP can be large: the file
 * is streamed to a temp file, parsed once by the import service, then deleted.
 * Cloudinary is intentionally NOT used here — the upload is transient, not a
 * permanent user-facing asset.
 */
export const importUpload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, _file, cb) => {
      cb(null, `letterboxd-import-${Date.now()}.zip`);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are accepted'));
    }
  },
});
