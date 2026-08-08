import multer from "multer";
import type { Request, Response, NextFunction } from "express";

// ─────────────────────────────────────────────────────────────────────────
// 🐛 BUG THAT WAS HERE: images were saved with multer's diskStorage to a
// local "uploads/tiffins" folder on the server's filesystem, and the DB
// only stored a path like "/uploads/tiffins/xxx.jpg" pointing at that file.
//
// That works fine on your own laptop, but on Render (and most cloud hosts)
// the filesystem is EPHEMERAL — every redeploy / restart / server sleep
// wipes anything written to local disk. MongoDB (Atlas) is a separate,
// persistent service, so the tiffin document + its imageUrl *string* would
// survive, but the actual image file on disk would not. Result: the
// seller's uploaded photo shows fine right after upload, then turns into a
// broken image link as soon as the server restarts — which is exactly what
// was being reported ("seller ne upload ki hai but show nahi ho rahi").
//
// ✅ FIX: stop touching the filesystem entirely. Images are now read into
// memory and converted straight into a base64 data URI, which is stored
// directly in the tiffin's `imageUrl` field in MongoDB (already a String).
// Since it lives in the database, it survives restarts/redeploys just like
// every other field on the document — no disk, no persistent-disk add-on,
// no external storage service needed.
// ─────────────────────────────────────────────────────────────────────────

// Only real image files are accepted — sellers upload from their device
// (gallery / files) and never paste a link, so we never touch external URLs.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

function getExt(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = getExt(file.originalname);
  if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, WEBP or GIF image files are allowed"));
  }
}

// ✅ In-memory storage — no file ever touches disk, so nothing to lose on
// restart. req.file.buffer holds the raw bytes for the handler below.
export const tiffinImageUpload = multer({
  storage: multer.memoryStorage(),
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

// Converts the uploaded file (still in memory) into a base64 data URI that
// can be stored directly in the `imageUrl` string field on the Tiffin doc.
export function fileToDataUri(file: Express.Multer.File): string {
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}

// ✅ No-op now (kept so existing call sites in routes.ts don't need to
// change): with images stored as data URIs inside the MongoDB document
// itself, "deleting" an old image just means the new value overwrites the
// old one in the document update — there's no separate file on disk to
// clean up anymore.
export function deleteUploadedTiffinImage(_imageUrl?: string | null) {
  // Intentionally empty.
}
