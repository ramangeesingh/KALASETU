import multer from "multer";
import path from "node:path";
import { config } from "../config";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".bin";
    const uniqueName = `kalasetu-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/i;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed."));
    }
  },
});

export const audioMemoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (_req, file, cb) => {
    const allowed = /audio\/(webm|wav|mp3|mpeg|ogg|mp4|x-m4a|m4a|aac)/i;
    if (allowed.test(file.mimetype) || file.mimetype === "application/octet-stream") {
      cb(null, true);
    } else {
      cb(null, true); // Allow flexible audio containers from various browsers/devices
    }
  },
});
