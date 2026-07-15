/** @typedef {'gram'|'piece'|'cup'|'ml'|'tbsp'|'slice'} UnitType */

/**
 * @typedef {Object} FoodFromAI
 * @property {string} name
 * @property {UnitType} unit_type
 * @property {number} quantity
 * @property {number} calories_per_unit
 * @property {number} protein_per_unit
 * @property {number} carbohydrates_per_unit
 * @property {number} fats_per_unit
 * @property {number} [confidence]
 */

/**
 * @typedef {Object} MatchedFood
 * @property {string} food_id
 * @property {string} food_name
 * @property {number} calories_per_unit
 * @property {number} protein_per_unit
 * @property {number} carbohydrates_per_unit
 * @property {number} fats_per_unit
 * @property {number} reference_amount
 */

/**
 * @typedef {Object} MealRow
 * @property {string} id
 * @property {string} source
 * @property {string|null} meal_title
 * @property {number|null} total_calories
 * @property {number|null} total_protein
 * @property {number|null} total_carbohydrates
 * @property {number|null} total_fats
 * @property {string|null} eaten_at
 */

/**
 * @typedef {Object} MealItem
 * @property {string} food_log_id
 * @property {string} food_id
 * @property {string} food_name
 * @property {number} quantity
 * @property {string} unit_type
 * @property {number} calories
 * @property {number} protein
 * @property {number} carbohydrates
 * @property {number} fats
 * @property {number|null} confidence
 */

/**
 * @typedef {Object} MealResponse
 * @property {MealRow} meal
 * @property {MealItem[]} items
 */

export const UNIT_TYPES = ["gram", "piece", "cup", "ml", "tbsp", "slice"];

export const CLAUDE_MODEL = "claude-haiku-4-5-20251001";

export const FUZZY_MATCH_THRESHOLD = 0.4;
