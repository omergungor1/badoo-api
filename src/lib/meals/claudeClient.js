import Anthropic from "@anthropic-ai/sdk";
import { CLAUDE_MODEL, UNIT_TYPES } from "@/lib/meals/types";

export function getAnthropicClient() {
  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "";

  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY veya CLAUDE_API_KEY environment değişkeni gerekli.",
    );
  }

  return new Anthropic({ apiKey });
}

const FOOD_ITEM_SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Türkçe yemek adı (örn: Tavuk Göğsü, Pirinç Pilavı)",
    },
    unit_type: {
      type: "string",
      enum: UNIT_TYPES,
    },
    quantity: {
      type: "number",
      description: "Miktar (gram / adet / bardak vb.)",
    },
    calories_per_unit: {
      type: "number",
      description:
        "unit_type gram ise 100g başına kcal, diğerlerinde 1 birim başına",
    },
    protein_per_unit: { type: "number" },
    carbohydrates_per_unit: { type: "number" },
    fats_per_unit: { type: "number" },
    confidence: {
      type: "number",
      description: "0-1 arası güven skoru",
    },
  },
  required: [
    "name",
    "unit_type",
    "quantity",
    "calories_per_unit",
    "protein_per_unit",
    "carbohydrates_per_unit",
    "fats_per_unit",
    "confidence",
  ],
};

export const IMAGE_SYSTEM_PROMPT = `Sen bir beslenme uzmanısın. Gönderilen tabak/öğün fotoğrafındaki TÜM yiyecekleri tanı. Her yiyecek için Türkçe isim ver (örn: 'Tavuk Göğsü', 'Pirinç Pilavı', 'Hurma'). Miktarları görsel olarak tahmin et. unit_type'ı yiyeceğin doğasına göre seç: çoğu pişmiş yemek için 'gram', sayılabilir yiyecekler (hurma, yumurta, dilim ekmek) için 'piece' veya 'slice', içecekler için 'cup' veya 'ml'. calories_per_unit ve diğer makro değerlerini unit_type='gram' ise HER ZAMAN 100 gram baz alarak, diğer unit_type'larda 1 birim baz alarak ver. Emin olmadığın değerlerde bile makul bir tahmin ver, boş bırakma. Sadece tool çağrısı yap, serbest metin yazma.`;

export function buildTextSystemPrompt(text) {
  return `Sen bir beslenme uzmanısın. Kullanıcının sesli olarak anlattığı öğünü metinden analiz et: '${text}'. İçindeki TÜM yiyecekleri ve miktarlarını çıkar. Her yiyecek için Türkçe isim ver (örn: 'Tavuk Göğsü', 'Pirinç Pilavı', 'Hurma'). Belirsiz miktarları (ör. 'bir avuç') makul gram karşılığına çevir (ör. bir avuç ~ 30g). unit_type'ı yiyeceğin doğasına göre seç: çoğu pişmiş yemek için 'gram', sayılabilir yiyecekler için 'piece' veya 'slice', içecekler için 'cup' veya 'ml'. calories_per_unit ve diğer makro değerlerini unit_type='gram' ise HER ZAMAN 100 gram baz alarak, diğer unit_type'larda 1 birim baz alarak ver. Emin olmadığın değerlerde bile makul bir tahmin ver, boş bırakma. Sadece tool çağrısı yap, serbest metin yazma.`;
}

function foodListTool(name) {
  return {
    name,
    description:
      "Öğündeki tüm yiyecekleri yapılandırılmış Türkçe liste olarak çıkar.",
    input_schema: {
      type: "object",
      properties: {
        meal_title: {
          type: "string",
          description: "Kısa Türkçe öğün başlığı (opsiyonel)",
        },
        foods: {
          type: "array",
          items: FOOD_ITEM_SCHEMA,
        },
      },
      required: ["foods"],
    },
  };
}

/**
 * Claude tool_use ile foods[] çıkarır.
 * @param {{ kind: 'image', mediaType: string, base64: string } | { kind: 'text', text: string }} input
 * @returns {Promise<{ foods: import('./types').FoodFromAI[], meal_title: string|null }>}
 */
export async function extractFoodsWithClaude(input) {
  const client = getAnthropicClient();
  const isImage = input.kind === "image";
  const toolName = isImage
    ? "extract_meal_from_image"
    : "extract_meal_from_text";
  const system = isImage
    ? IMAGE_SYSTEM_PROMPT
    : buildTextSystemPrompt(input.text);

  /** @type {import('@anthropic-ai/sdk').Anthropic.MessageCreateParams['messages']} */
  const messages = isImage
    ? [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: input.mediaType,
                data: input.base64,
              },
            },
            {
              type: "text",
              text: "Bu öğün fotoğrafındaki tüm yiyecekleri çıkar.",
            },
          ],
        },
      ]
    : [
        {
          role: "user",
          content: `Şu öğün tarifini analiz et:\n${input.text}`,
        },
      ];

  let response;
  try {
    response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      system,
      tools: [foodListTool(toolName)],
      tool_choice: { type: "tool", name: toolName },
      messages,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    const error = new Error(`Claude API hatası: ${msg}`);
    error.status = 502;
    error.cause = err;
    throw error;
  }

  const toolBlock = (response.content || []).find(
    (block) => block.type === "tool_use" && block.name === toolName,
  );

  if (!toolBlock || !toolBlock.input) {
    const error = new Error(
      "Claude tool_use döndürmedi; yapılandırılmış food listesi alınamadı.",
    );
    error.status = 502;
    throw error;
  }

  const foods = Array.isArray(toolBlock.input.foods)
    ? toolBlock.input.foods
    : [];

  if (!foods.length) {
    const error = new Error("Claude boş foods listesi döndürdü.");
    error.status = 502;
    throw error;
  }

  return {
    foods: foods.map(normalizeFoodFromAI),
    meal_title: toolBlock.input.meal_title
      ? String(toolBlock.input.meal_title)
      : null,
  };
}

function normalizeFoodFromAI(raw) {
  const unit = UNIT_TYPES.includes(raw.unit_type) ? raw.unit_type : "gram";
  return {
    name: String(raw.name || "").trim(),
    unit_type: unit,
    quantity: Number(raw.quantity) || 0,
    calories_per_unit: Number(raw.calories_per_unit) || 0,
    protein_per_unit: Number(raw.protein_per_unit) || 0,
    carbohydrates_per_unit: Number(raw.carbohydrates_per_unit) || 0,
    fats_per_unit: Number(raw.fats_per_unit) || 0,
    confidence:
      raw.confidence == null ? null : Math.min(1, Math.max(0, Number(raw.confidence))),
  };
}
