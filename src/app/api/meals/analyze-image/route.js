import { requireMealUser } from "@/lib/meals/auth";
import { extractFoodsWithClaude } from "@/lib/meals/claudeClient";
import { createMealWithFoods } from "@/lib/meals/createMealWithFoods";
import { resizeMealImage, uploadMealImage } from "@/lib/meals/image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/meals/analyze-image
 * multipart/form-data: field "image" (file)
 * Auth: Authorization: Bearer <supabase_access_token>
 */
export async function POST(request) {
  let userId = null;

  try {
    // TODO: auth burada entegre edilecek
    const { user } = await requireMealUser(request);
    userId = user.id;

    const form = await request.formData();
    const file = form.get("image") || form.get("file") || form.get("photo");

    if (!file || typeof file === "string" || !file.arrayBuffer) {
      return Response.json(
        { error: "image alanı gerekli (multipart/form-data)" },
        { status: 400 },
      );
    }

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    if (!inputBuffer.length) {
      return Response.json({ error: "Boş görsel" }, { status: 400 });
    }

    const resized = await resizeMealImage(inputBuffer);

    // TODO: storage upload entegrasyonu
    const storage = await uploadMealImage({
      userId,
      buffer: resized.buffer,
      ext: "jpg",
    });

    const { foods, meal_title } = await extractFoodsWithClaude({
      kind: "image",
      mediaType: resized.mediaType,
      base64: resized.base64,
    });

    const result = await createMealWithFoods({
      userId,
      source: "image",
      foods,
      mealTitle: meal_title,
      rawInput: null,
      imageUrl: storage.image_url,
      imagePath: storage.image_path,
    });

    return Response.json(result, { status: 201 });
  } catch (err) {
    const status = err.status || 500;
    console.error("[analyze-image]", err);
    return Response.json(
      {
        error: err.message || "Öğün analizi başarısız",
        code: status === 502 ? "claude_error" : "meal_analyze_failed",
      },
      { status: status === 401 ? 401 : status === 502 ? 502 : 500 },
    );
  }
}
