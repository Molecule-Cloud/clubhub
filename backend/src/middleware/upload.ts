import multer from "multer";
import { ApiError } from "../utils/ApiError";

/**
 * Memory storage, not disk storage — the uploaded file buffer goes straight
 * to Cloudinary (lib/cloudinary.ts's uploadBuffer) and is never written to
 * the container's local disk. Consistent with the same "no local disk"
 * discipline used for generated PDF receipts, since Railway containers are
 * ephemeral.
 */
const storage = multer.memoryStorage();

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Builds a single-file image upload middleware for the given form field
 * name, with errors routed through the app's centralized error handler
 * instead of multer's own default (raw, unformatted) error response.
 * Shared by both the organization logo upload and the user avatar upload —
 * same size limit, same allowed types, same error handling, different
 * field name and (at the call site) different destination folder.
 */
function createImageUploadMiddleware(fieldName: string, fileLabel: string) {
  const upload = multer({
    storage,
    limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(new Error(`${fileLabel} must be a PNG, JPEG, WebP, or SVG image.`));
      }
      cb(null, true);
    },
  }).single(fieldName);

  return function handleUpload(req: Parameters<typeof upload>[0], res: Parameters<typeof upload>[1], next: (err?: unknown) => void) {
    upload(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return next(ApiError.badRequest(`${fileLabel} is too large. Maximum size is 5MB.`));
        }
        return next(ApiError.badRequest(err.message));
      }
      if (err) return next(ApiError.badRequest(err instanceof Error ? err.message : "Invalid file upload."));
      next();
    });
  };
}

export const handleLogoUpload = createImageUploadMiddleware("logo", "Logo");
export const handleAvatarUpload = createImageUploadMiddleware("avatar", "Avatar");
