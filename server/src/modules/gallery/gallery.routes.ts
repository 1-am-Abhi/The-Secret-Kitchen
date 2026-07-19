import { Router } from "express";
import multer from "multer";

import { requireAdmin } from "../../middleware/auth";
import { uploadLimiter } from "../../middleware/rateLimit";
import { validate } from "../../middleware/validate";
import { AppError } from "../../utils/AppError";
import {
  createGalleryImage,
  deleteGalleryImage,
  listGallery,
  updateGalleryImage,
  uploadGalleryImage,
} from "./gallery.controller";
import {
  createGalleryImageSchema,
  galleryIdParamSchema,
  listGalleryQuerySchema,
  updateGalleryImageSchema,
  uploadGalleryImageSchema,
} from "./gallery.schema";

/**
 * Memory storage: the buffer is piped straight to Cloudinary, so nothing is
 * written to the container's filesystem. 5 MB is comfortably above a
 * phone-camera JPEG and well below anything that would strain the request pool.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!/^image\/(jpeg|png|webp|avif|gif)$/.test(file.mimetype)) {
      callback(AppError.badRequest("Only JPEG, PNG, WebP, AVIF or GIF images are accepted."));
      return;
    }
    callback(null, true);
  },
});

export const galleryRouter: Router = Router();

galleryRouter.get("/", validate({ query: listGalleryQuerySchema }), listGallery);

galleryRouter.post(
  "/upload",
  requireAdmin,
  uploadLimiter,
  upload.single("image"),
  validate({ body: uploadGalleryImageSchema }),
  uploadGalleryImage,
);

galleryRouter.post(
  "/",
  requireAdmin,
  validate({ body: createGalleryImageSchema }),
  createGalleryImage,
);
galleryRouter.patch(
  "/:id",
  requireAdmin,
  validate({ params: galleryIdParamSchema, body: updateGalleryImageSchema }),
  updateGalleryImage,
);
galleryRouter.delete(
  "/:id",
  requireAdmin,
  validate({ params: galleryIdParamSchema }),
  deleteGalleryImage,
);
