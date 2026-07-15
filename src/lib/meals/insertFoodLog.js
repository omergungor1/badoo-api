import { createAdminClient } from "@/lib/supabase/admin";

/**
 * food_logs satırı ekler. meals.total_* trigger ile güncellenir — ekstra update YOK.
 * Client: Supabase JS service_role, schema: badoo
 *
 * @param {{
 *   meal_id: string,
 *   user_id: string,
 *   food_id: string,
 *   food_name: string,
 *   quantity: number,
 *   unit_type: string,
 *   reference_amount: number,
 *   calories_per_unit: number,
 *   protein_per_unit: number,
 *   carbohydrates_per_unit: number,
 *   fats_per_unit: number,
 *   meal_title?: string|null,
 *   image_url?: string|null,
 *   image_path?: string|null,
 * }} params
 */
export async function insertFoodLogForMeal(params) {
  const admin = createAdminClient();
  const ref = Number(params.reference_amount) || 1;
  const qty = Number(params.quantity) || 0;

  const macros = {
    calories: Math.round(qty * (Number(params.calories_per_unit) / ref)),
    protein: Math.round(qty * (Number(params.protein_per_unit) / ref)),
    carbohydrates: Math.round(
      qty * (Number(params.carbohydrates_per_unit) / ref),
    ),
    fats: Math.round(qty * (Number(params.fats_per_unit) / ref)),
  };

  const row = {
    meal_id: params.meal_id,
    user_id: params.user_id,
    food_id: params.food_id,
    food_name: params.food_name,
    quantity: qty,
    unit_type: params.unit_type,
    calories: macros.calories,
    protein: macros.protein,
    carbohydrates: macros.carbohydrates,
    fats: macros.fats,
    is_manual: false,
    timestamp: new Date().toISOString(),
  };

  if (params.meal_title != null) row.meal_title = params.meal_title;
  if (params.image_url != null) row.image_url = params.image_url;
  if (params.image_path != null) row.image_path = params.image_path;

  const { data, error } = await admin
    .from("food_logs")
    .insert(row)
    .select("id, food_id, food_name, quantity, unit_type, calories, protein, carbohydrates, fats")
    .single();

  if (error) throw error;
  return data;
}
