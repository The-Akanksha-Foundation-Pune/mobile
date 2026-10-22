const sharp = require("sharp");

const MAX_EDGE = 1600;
const JPEG_QUALITY = 82;

/**
 * Shrinks phone photos (often 3000x4000, 1-2 MB) to a feed-friendly size before storage.
 * Keeps orientation from EXIF, caps the longest edge, re-encodes as JPEG.
 * Non-images and anything sharp cannot read are returned unchanged.
 */
async function optimizeImage({ buffer, mimeType, originalName }) {
  if (!mimeType || !mimeType.startsWith("image/") || mimeType === "image/gif") {
    return { buffer, mimeType, originalName };
  }
  try {
    const output = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return {
      buffer: output,
      mimeType: "image/jpeg",
      originalName: String(originalName || "photo").replace(/\.[^.]+$/, "") + ".jpg",
    };
  } catch (err) {
    console.warn("optimizeImage: keeping original file:", err.message);
    return { buffer, mimeType, originalName };
  }
}

module.exports = { optimizeImage, MAX_EDGE };
