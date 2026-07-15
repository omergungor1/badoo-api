import { createAdminClient } from "@/lib/supabase/admin";
import { FUZZY_MATCH_THRESHOLD } from "@/lib/meals/types";

/**
 * Basit bigram benzerliği (pg_trgm RPC yoksa fallback).
 */
function bigramSimilarity(a, b) {
  const s1 = String(a || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
  const s2 = String(b || "")
    .toLocaleLowerCase("tr-TR")
    .trim();
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;

  const grams = (s) => {
    const padded = ` ${s} `;
    const set = new Set();
    for (let i = 0; i < padded.length - 1; i += 1) {
      set.add(padded.slice(i, i + 2));
    }
    return set;
  };

  const g1 = grams(s1);
  const g2 = grams(s2);
  let intersection = 0;
  for (const g of g1) {
    if (g2.has(g)) intersection += 1;
  }
  return (2 * intersection) / (g1.size + g2.size);
}

/**
 * pg_trgm RPC: badoo.match_food(search_name, search_unit)
 * Client: Supabase JS service_role, schema: badoo
 *
 * @param {import('./types').FoodFromAI} foodFromAI
 * @returns {Promise<import('./types').MatchedFood>}
 */
export async function matchOrCreateFood(foodFromAI) {
  const admin = createAdminClient();
  const name = String(foodFromAI.name || "").trim();
  const unitType = foodFromAI.unit_type || "gram";

  if (!name) {
    throw new Error("food name boş olamaz");
  }

  // 1) Fuzzy match via RPC (pg_trgm)
  let matched = null;
  try {
    const { data, error } = await admin.rpc("match_food", {
      search_name: name,
      search_unit: unitType,
    });

    if (!error && data) {
      const row = Array.isArray(data) ? data[0] : data;
      if (row && Number(row.sim) >= FUZZY_MATCH_THRESHOLD) {
        matched = row;
      }
    }
  } catch (err) {
    console.warn("[matchOrCreateFood] match_food RPC başarısız, JS fallback:", err?.message || err);
  }

  // 2) Fallback: aynı unit_type adayları + JS similarity
  if (!matched) {
    const { data: candidates, error: listError } = await admin
      .from("foods")
      .select(
        "id, food_name, calories, protein, carbohydrates, fats, reference_amount",
      )
      .eq("unit_type", unitType)
      .limit(200);

    if (listError) {
      console.warn("[matchOrCreateFood] foods listesi hatası:", listError.message);
    } else {
      let best = null;
      let bestSim = 0;
      for (const row of candidates || []) {
        const sim = bigramSimilarity(row.food_name, name);
        if (sim > bestSim) {
          bestSim = sim;
          best = row;
        }
      }
      if (best && bestSim >= FUZZY_MATCH_THRESHOLD) {
        matched = { ...best, sim: bestSim };
      }
    }
  }

  if (matched) {
    const referenceAmount =
      Number(matched.reference_amount) || (unitType === "gram" ? 100 : 1);
    return {
      food_id: matched.id,
      food_name: matched.food_name,
      calories_per_unit: Number(matched.calories) || 0,
      protein_per_unit: Number(matched.protein) || 0,
      carbohydrates_per_unit: Number(matched.carbohydrates) || 0,
      fats_per_unit: Number(matched.fats) || 0,
      reference_amount: referenceAmount,
    };
  }

  // 3) Insert new AI food
  const referenceAmount = unitType === "gram" ? 100 : 1;
  const payload = {
    food_name: name,
    unit_type: unitType,
    reference_amount: referenceAmount,
    calories: Math.round(Number(foodFromAI.calories_per_unit) || 0),
    protein: Math.round(Number(foodFromAI.protein_per_unit) || 0),
    carbohydrates: Math.round(Number(foodFromAI.carbohydrates_per_unit) || 0),
    fats: Math.round(Number(foodFromAI.fats_per_unit) || 0),
    source: "ai",
  };

  // ON CONFLICT (food_name, unit_type) — unique index tablo tarafında olmalı
  const { data: upserted, error: upsertError } = await admin
    .from("foods")
    .upsert(payload, {
      onConflict: "food_name,unit_type",
      ignoreDuplicates: false,
    })
    .select(
      "id, food_name, calories, protein, carbohydrates, fats, reference_amount",
    )
    .single();

  if (upsertError) {
    // Race / unique: mevcut satırı çek
    console.warn("[matchOrCreateFood] upsert hatası, select fallback:", upsertError.message);
    const { data: existing, error: existingError } = await admin
      .from("foods")
      .select(
        "id, food_name, calories, protein, carbohydrates, fats, reference_amount",
      )
      .eq("food_name", name)
      .eq("unit_type", unitType)
      .maybeSingle();

    if (existingError || !existing) {
      throw upsertError;
    }

    return {
      food_id: existing.id,
      food_name: existing.food_name,
      calories_per_unit: Number(existing.calories) || 0,
      protein_per_unit: Number(existing.protein) || 0,
      carbohydrates_per_unit: Number(existing.carbohydrates) || 0,
      fats_per_unit: Number(existing.fats) || 0,
      reference_amount:
        Number(existing.reference_amount) || (unitType === "gram" ? 100 : 1),
    };
  }

  return {
    food_id: upserted.id,
    food_name: upserted.food_name,
    calories_per_unit: Number(upserted.calories) || 0,
    protein_per_unit: Number(upserted.protein) || 0,
    carbohydrates_per_unit: Number(upserted.carbohydrates) || 0,
    fats_per_unit: Number(upserted.fats) || 0,
    reference_amount:
      Number(upserted.reference_amount) || referenceAmount,
  };
}
