import multer from 'multer';

/**
 * Multer instance configured to store uploads in memory as a Buffer.
 * Files are passed to Cloudinary directly without writing to disk on the
 * server. Restricted to JPEG, PNG and WebP images, max 5MB.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'));
    }
  },
});
