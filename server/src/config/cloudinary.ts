import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { AppError } from "../utils/AppError";
import { env } from "./env";

/**
 * Cloudinary wiring. Credentials are optional so the API still boots (and every
 * non-media route keeps working) on a developer machine with no media account;
 * only the upload endpoint degrades, and it does so with an explicit 503.
 */

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export interface UploadedMedia {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Streams a memory buffer straight to Cloudinary. Multer keeps the file in RAM
 * (no temp files on an ephemeral container filesystem), so the upload API's
 * stream interface is the natural fit — nothing ever touches disk.
 */
export function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; filename?: string } = {},
): Promise<UploadedMedia> {
  if (!env.cloudinaryEnabled) {
    return Promise.reject(
      new AppError(
        "Media uploads are not configured on this environment.",
        503,
        "CLOUDINARY_NOT_CONFIGURED",
      ),
    );
  }

  return new Promise<UploadedMedia>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder ?? env.CLOUDINARY_FOLDER,
        public_id: options.filename,
        resource_type: "image",
        overwrite: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(
            new AppError(
              error?.message ?? "Cloudinary upload failed.",
              502,
              "CLOUDINARY_UPLOAD_FAILED",
            ),
          );
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );

    stream.end(buffer);
  });
}

/** Best-effort CDN cleanup; a failure here must not fail the DB delete. */
export async function destroyAsset(publicId: string): Promise<void> {
  if (!env.cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // Swallowed on purpose — the gallery row is already gone from our side.
  }
}

export { cloudinary };
