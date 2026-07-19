import type { GalleryRow } from "./types";

/**
 * Gallery rows. The storefront has no gallery data module yet, so these are
 * authored here and keyed by `imageId` — the same convention the menu uses, so
 * swapping in real photography is a Cloudinary upload plus an id change.
 */
export const galleryRows: GalleryRow[] = [
  { id: "gal-01", imageId: "gallery-dish-1", caption: "Paneer Butter Masala, finished with white butter", category: "dishes", aspect: "landscape" },
  { id: "gal-02", imageId: "gallery-dish-2", caption: "Twelve-hour Dal Makhani, straight off the low flame", category: "dishes", aspect: "square" },
  { id: "gal-03", imageId: "gallery-dish-3", caption: "Aloo paratha on the cast-iron tawa", category: "dishes", aspect: "portrait" },
  { id: "gal-04", imageId: "gallery-dish-4", caption: "Cheese Maggi, mid-pull", category: "dishes", aspect: "square" },
  { id: "gal-05", imageId: "gallery-dish-5", caption: "Idli batter, fermented overnight", category: "dishes", aspect: "landscape" },
  { id: "gal-06", imageId: "gallery-kitchen-1", caption: "The pass at 12:40 PM, mid lunch dispatch", category: "kitchen", aspect: "landscape" },
  { id: "gal-07", imageId: "gallery-kitchen-2", caption: "Vegetables in from the mandi at 6 AM", category: "kitchen", aspect: "square" },
  { id: "gal-08", imageId: "gallery-kitchen-3", caption: "Colour-coded boards, one job each", category: "kitchen", aspect: "portrait" },
  { id: "gal-09", imageId: "gallery-kitchen-4", caption: "Paneer pressed fresh every morning", category: "kitchen", aspect: "square" },
  { id: "gal-10", imageId: "gallery-team-1", caption: "Meenakshi tasting the dal before dinner service", category: "team", aspect: "portrait" },
  { id: "gal-11", imageId: "gallery-team-2", caption: "Suresh grinding the morning chutney", category: "team", aspect: "landscape" },
  { id: "gal-12", imageId: "gallery-team-3", caption: "The dispatch team, 7:20 PM", category: "team", aspect: "landscape" },
  { id: "gal-13", imageId: "gallery-pack-1", caption: "Double-walled steel tiffins in insulated sleeves", category: "packaging", aspect: "square" },
  { id: "gal-14", imageId: "gallery-pack-2", caption: "Leak-proof containers, sealed and labelled", category: "packaging", aspect: "portrait" },
  { id: "gal-15", imageId: "gallery-pack-3", caption: "Every order goes out in a thermal bag", category: "packaging", aspect: "landscape" },
  { id: "gal-16", imageId: "gallery-moment-1", caption: "A Sector 62 hostel floor, dinner sorted", category: "moments", aspect: "landscape" },
  { id: "gal-17", imageId: "gallery-moment-2", caption: "Forty-person office lunch, delivered hot", category: "moments", aspect: "square" },
  { id: "gal-18", imageId: "gallery-moment-3", caption: "Sunday thali, the way it should look", category: "moments", aspect: "portrait" },
];
