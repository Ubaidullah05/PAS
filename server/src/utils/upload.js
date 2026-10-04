const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { env } = require('../config/env');
const { ALLOWED_UPLOAD_MIME } = require('../config/constants');
const ApiError = require('../utils/ApiError');

const uploadRoot = path.resolve(__dirname, '..', '..', env.uploadDir);

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadRoot);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  }
});

function fileFilter(req, file, cb) {
  if (!ALLOWED_UPLOAD_MIME.includes(file.mimetype)) {
    return cb(ApiError.badRequest('Only JPG, PNG, WEBP or PDF files can be uploaded'));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 1 }
});

function removeFile(fileName) {
  if (!fileName) return;
  const target = path.join(uploadRoot, fileName);
  if (target.startsWith(uploadRoot) && fs.existsSync(target)) {
    fs.unlink(target, () => {});
  }
}

module.exports = { upload, uploadRoot, removeFile };
