import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import type { Request, Response, NextFunction } from "express";

// ✅ Images uploaded by sellers for their meals/tiffins live here. Served
// statically at /uploads/tiffins (see registerRoutes in server/routes.ts).
export const TIFFIN_UPLOAD_DIR = path.join(process.cwd(), "uploads", "tiffins");

if (!fs.existsSync(TIFFIN_UPLOAD_DIR)) {
  fs.mkdirSync(TIFFIN_UPLOAD_DIR, { recursive: true });
}

// Only real image files are accepted — sellers upload from their device
// (gallery / files) and never paste a link, so we never touch external URLs.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TIFFIN_UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ALLOWED_EXTENSIONS.has(ext) ? ext : ".jpg";
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`;
    cb(null, uniqueName);
  },
});

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP or GIF image files are allowed"));
  }
}

export const tiffinImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
    files: 1,
  },
});

// Wraps multer's single-file upload so file-type/size errors come back as a
// clean JSON response instead of crashing the request.
export function handleTiffinImageUpload(req: Request, res: Response, next: NextFunction) {
  const uploader = tiffinImageUpload.single("image");
  uploader(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "Image is too large. Max size is 5MB." });
      }
      return res.status(400).json({ message: err.message });
    }
    if (err) {
      return res.status(400).json({ message: (err as Error).message || "Invalid image file" });
    }
    next();
  });
}

export function deleteUploadedTiffinImage(imageUrl?: string | null) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/tiffins/")) return;
  const filename = path.basename(imageUrl);
  const filePath = path.join(TIFFIN_UPLOAD_DIR, filename);
  fs.unlink(filePath, () => {
    // best-effort cleanup — ignore errors (file may already be gone)
  });
}
