import { requireMealUser } from "@/lib/meals/auth";
import { extractFoodsWithClaude } from "@/lib/meals/claudeClient";
import { createMealWithFoods } from "@/lib/meals/createMealWithFoods";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/meals/analyze-text
 * JSON body: { text: string }
 * Auth: Authorization: Bearer <supabase_access_token>
 * source = 'voice' (STT client tarafında yapılmış transcript)
 */
export async function POST(request) {
  try {
    // TODO: auth burada entegre edilecek
    const { user } = await requireMealUser(request);

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Geçersiz JSON body" }, { status: 400 });
    }

    const text = String(body?.text || "").trim();
    if (!text) {
      return Response.json({ error: "text alanı zorunlu" }, { status: 400 });
    }

    if (text.length > 4000) {
      return Response.json(
        { error: "text çok uzun (max 4000 karakter)" },
        { status: 400 },
      );
    }

    const { foods, meal_title } = await extractFoodsWithClaude({
      kind: "text",
      text,
    });

    const result = await createMealWithFoods({
      userId: user.id,
      source: "voice",
      foods,
      mealTitle: meal_title,
      rawInput: text,
      imageUrl: null,
      imagePath: null,
    });

    return Response.json(result, { status: 201 });
  } catch (err) {
    const status = err.status || 500;
    console.error("[analyze-text]", err);
    return Response.json(
      {
        error: err.message || "Öğün analizi başarısız",
        code: status === 502 ? "claude_error" : "meal_analyze_failed",
      },
      { status: status === 401 ? 401 : status === 502 ? 502 : 500 },
    );
  }
}
