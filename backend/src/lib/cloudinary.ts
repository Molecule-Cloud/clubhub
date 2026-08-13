import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { ApiError } from "../utils/ApiError";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a Buffer (e.g. a generated PDF) directly to Cloudinary without
 * ever touching local disk — Railway containers are ephemeral, so anything
 * written to disk is lost on the next restart/redeploy.
 */
export async function uploadBuffer(
  buffer: Buffer,
  options: { folder: string; publicId: string; resourceType?: "image" | "raw" | "auto"; overwrite?: boolean }
): Promise<string> {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    throw ApiError.internal("File storage is not configured.");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder,
        public_id: options.publicId,
        resource_type: options.resourceType ?? "raw",
        // Defaults to false — receipts are immutable financial documents
        // and must never be silently replaced. Callers that genuinely need
        // replaceable assets (e.g. an organization's logo) opt in explicitly.
        overwrite: options.overwrite ?? false,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}
