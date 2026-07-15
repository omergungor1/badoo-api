import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Görseli max 768px / jpeg q80'e küçültür.
 * @param {Buffer} inputBuffer
 * @returns {Promise<{ buffer: Buffer, mediaType: 'image/jpeg', base64: string }>}
 */
export async function resizeMealImage(inputBuffer) {
  const buffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: 768,
      height: 768,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  return {
    buffer,
    mediaType: "image/jpeg",
    base64: buffer.toString("base64"),
  };
}

/**
 * Supabase Storage upload.
 * // TODO: storage upload entegrasyonu — meal-images bucket + public/signed URL
 * Bucket: SUPABASE_MEAL_IMAGES_BUCKET (default meal-images)
 *
 * @param {{ userId: string, buffer: Buffer, ext?: string }} params
 * @returns {Promise<{ image_url: string|null, image_path: string|null }>}
 */
export async function uploadMealImage({ userId, buffer, ext = "jpg" }) {
  const bucket =
    process.env.SUPABASE_MEAL_IMAGES_BUCKET || "meal-images";
  const admin = createAdminClient();
  const imagePath = `${userId}/${Date.now()}.${ext}`;

  try {
    const { error } = await admin.storage.from(bucket).upload(imagePath, buffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

    if (error) {
      console.warn("[uploadMealImage] upload başarısız:", error.message);
      // TODO: storage upload entegrasyonu — bucket yoksa meal kaydı yine devam eder
      return { image_url: null, image_path: null };
    }

    const { data } = admin.storage.from(bucket).getPublicUrl(imagePath);
    return {
      image_url: data?.publicUrl || null,
      image_path: imagePath,
    };
  } catch (err) {
    console.warn("[uploadMealImage] beklenmeyen hata:", err?.message || err);
    return { image_url: null, image_path: null };
  }
}
