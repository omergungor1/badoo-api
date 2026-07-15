import { createAdminClient } from "@/lib/supabase/admin";
import { matchOrCreateFood } from "@/lib/meals/matchAndInsertFood";
import { insertFoodLogForMeal } from "@/lib/meals/insertFoodLog";

/**
 * Meal oluştur + foods sırayla match/insert + food_logs.
 * Supabase JS client transaction desteklemediği için compensating rollback:
 * hata olursa oluşturulan meal soft-delete / hard delete edilir.
 *
 * Client: Supabase service_role, schema badoo
 *
 * @param {{
 *   userId: string,
 *   source: 'image'|'voice'|'manual',
 *   foods: import('./types').FoodFromAI[],
 *   mealTitle?: string|null,
 *   rawInput?: string|null,
 *   imageUrl?: string|null,
 *   imagePath?: string|null,
 * }} params
 * @returns {Promise<import('./types').MealResponse>}
 */
export async function createMealWithFoods(params) {
  const admin = createAdminClient();
  const {
    userId,
    source,
    foods,
    mealTitle = null,
    rawInput = null,
    imageUrl = null,
    imagePath = null,
  } = params;

  const mealInsert = {
    user_id: userId,
    source,
    meal_title: mealTitle,
    raw_input: rawInput,
    image_url: imageUrl,
    image_path: imagePath,
    total_calories: 0,
    total_protein: 0,
    total_carbohydrates: 0,
    total_fats: 0,
    eaten_at: new Date().toISOString(),
  };

  const { data: meal, error: mealError } = await admin
    .from("meals")
    .insert(mealInsert)
    .select("id, source, meal_title, total_calories, total_protein, total_carbohydrates, total_fats, eaten_at")
    .single();

  if (mealError) throw mealError;

  const items = [];

  try {
    // Sırayla — aynı isimde race için Promise.all YOK
    for (const food of foods) {
      if (!food.name || !(Number(food.quantity) > 0)) continue;

      const matched = await matchOrCreateFood(food);
      const log = await insertFoodLogForMeal({
        meal_id: meal.id,
        user_id: userId,
        food_id: matched.food_id,
        food_name: matched.food_name || food.name,
        quantity: food.quantity,
        unit_type: food.unit_type,
        reference_amount: matched.reference_amount,
        calories_per_unit: matched.calories_per_unit,
        protein_per_unit: matched.protein_per_unit,
        carbohydrates_per_unit: matched.carbohydrates_per_unit,
        fats_per_unit: matched.fats_per_unit,
        meal_title: mealTitle,
        image_url: imageUrl,
        image_path: imagePath,
      });

      items.push({
        food_log_id: log.id,
        food_id: log.food_id,
        food_name: log.food_name,
        quantity: Number(log.quantity),
        unit_type: log.unit_type,
        calories: log.calories,
        protein: log.protein,
        carbohydrates: log.carbohydrates,
        fats: log.fats,
        confidence: food.confidence ?? null,
      });
    }

    if (!items.length) {
      throw new Error("Geçerli food satırı oluşturulamadı");
    }
  } catch (err) {
    // Compensating rollback
    await admin.from("food_logs").delete().eq("meal_id", meal.id);
    await admin.from("meals").delete().eq("id", meal.id);
    throw err;
  }

  // Trigger total_* güncelledikten sonra fresh meal
  const { data: freshMeal, error: freshError } = await admin
    .from("meals")
    .select(
      "id, source, meal_title, total_calories, total_protein, total_carbohydrates, total_fats, eaten_at",
    )
    .eq("id", meal.id)
    .single();

  if (freshError) throw freshError;

  return {
    meal: freshMeal,
    items,
  };
}
