# Badoo Meal API — Mobil Entegrasyon

Bu doküman, Next.js webservice üzerindeki iki meal analiz endpoint’ini React Native / Expo mobil uygulamaya bağlamak içindir.

Base URL örneği:

```text
https://YOUR_WEB_SERVICE_DOMAIN
```

Local:

```text
http://localhost:3000
```

---

## Kimlik doğrulama (zorunlu)

Mobil uygulama zaten **Supabase Auth** kullanıyor. API’ye istek atarken kullanıcının **access token**’ını gönder.

| Header | Değer |
|--------|--------|
| `Authorization` | `Bearer <supabase_access_token>` |

### Token nereden alınır?

```js
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Oturum açıkken:
const { data: { session } } = await supabase.auth.getSession();
const accessToken = session?.access_token;

// Her istekte:
headers: {
  Authorization: `Bearer ${accessToken}`,
}
```

### Güvenlik notları

1. **Gönderilmesi gereken:** yalnızca `access_token` (Bearer). `user_id` body’de göndermenize gerek yok — sunucu token’dan `auth.users.id` çözer.
2. **Göndermeyin:** `service_role` key, `SUPABASE_SERVICE_ROLE_KEY`, Claude/Anthropic key.
3. Token expire olduysa önce `supabase.auth.refreshSession()` sonra tekrar deneyin.
4. 401 → token yok/geçersiz; kullanıcıyı login’e yönlendirin.
5. Sunucu `user_id`’yi **asla** client body’sinden güvenilir kabul etmez; Bearer token doğrulanır.

---

## Endpoint 1 — Görsel ile öğün analizi

`POST /api/meals/analyze-image`

### Request

- `Content-Type: multipart/form-data`
- Field adı: **`image`** (alternatif: `file`, `photo`)
- Auth: Bearer token

### Expo / RN örnek

```js
async function analyzeMealImage(localUri, accessToken) {
  const form = new FormData();
  form.append("image", {
    uri: localUri,
    name: "meal.jpg",
    type: "image/jpeg",
  });

  const res = await fetch(`${API_BASE}/api/meals/analyze-image`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Content-Type koyma — boundary otomatik eklenir
    },
    body: form,
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "analyze-image failed");
  return json;
}
```

### Sunucu akışı (özet)

1. Token → `user.id`
2. Görsel **sharp** ile max 768px, JPEG q80 (maliyet için)
3. Storage upload (`meal-images` bucket — bucket yoksa URL null kalabilir)
4. Claude Haiku (`claude-haiku-4-5-20251001`) tool_use → Türkçe `foods[]`
5. `badoo.meals` + fuzzy match/`badoo.foods` + `badoo.food_logs` insert
6. Güncel total’lar + satırlar JSON döner

---

## Endpoint 2 — Metin / ses transcript ile öğün analizi

`POST /api/meals/analyze-text`

Ses → metin dönüşümü **mobilde** yapılır; bu API yalnızca transcript text alır.

### Request

- `Content-Type: application/json`
- Body:

```json
{
  "text": "bir kase yoğurt ve bir avuç badem yedim"
}
```

- Auth: Bearer token

### Örnek

```js
async function analyzeMealText(text, accessToken) {
  const res = await fetch(`${API_BASE}/api/meals/analyze-text`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "analyze-text failed");
  return json;
}
```

`source` DB’de `voice` olarak kaydedilir; `raw_input` = gönderdiğiniz text.

---

## Başarılı response (her iki endpoint)

HTTP `201`

```json
{
  "meal": {
    "id": "uuid",
    "source": "image",
    "meal_title": "Tavuklu pilav tabağı",
    "total_calories": 620,
    "total_protein": 42,
    "total_carbohydrates": 55,
    "total_fats": 18,
    "eaten_at": "2026-07-15T17:00:00.000Z"
  },
  "items": [
    {
      "food_log_id": "uuid",
      "food_id": "uuid",
      "food_name": "Tavuk Göğsü",
      "quantity": 180,
      "unit_type": "gram",
      "calories": 297,
      "protein": 54,
      "carbohydrates": 0,
      "fats": 6,
      "confidence": 0.93
    }
  ]
}
```

| Alan | Anlam |
|------|--------|
| `meal` | `badoo.meals` satırı (trigger sonrası total_*) |
| `items[]` | `badoo.food_logs` satırları + AI confidence |
| `unit_type` | `gram` \| `piece` \| `cup` \| `ml` \| `tbsp` \| `slice` |

Makro formülü (sunucu):

```text
round(quantity * (foods.calories / foods.reference_amount))
```

`gram` için `reference_amount = 100`, diğer birimlerde `1`.

---

## Hata kodları

| HTTP | `code` (varsa) | Ne yapmalı |
|------|----------------|------------|
| 400 | — | Body/field eksik veya geçersiz |
| 401 | — | Token yenile / login |
| 502 | `claude_error` | AI geçici hata; retry (backoff) |
| 500 | `meal_analyze_failed` | Logla; destek |

Örnek hata:

```json
{
  "error": "Claude tool_use döndürmedi; yapılandırılmış food listesi alınamadı.",
  "code": "claude_error"
}
```

Yarım kalan meal kaydı oluşturulmaz (hata durumunda rollback).

---

## Claude çıktısı (iç akış — sizin parse etmenize gerek yok)

Model yaklaşık şu yapıda tool çağırır (Türkçe isimler):

```json
{
  "foods": [
    {
      "name": "Tavuk Göğsü",
      "unit_type": "gram",
      "quantity": 180,
      "calories_per_unit": 165,
      "protein_per_unit": 31,
      "carbohydrates_per_unit": 0,
      "fats_per_unit": 3.6,
      "confidence": 0.93
    }
  ]
}
```

Mobil UI için yeterli olan şey: endpoint’in döndürdüğü `meal` + `items`.

---

## Depolama (görsel)

- Bucket önerisi: `meal-images` (Supabase Storage)
- Path: `{user_id}/{timestamp}.jpg`
- Public URL alınamazsa `image_url` / `image_path` null olabilir; meal yine oluşur

Dashboard → Storage’da bucket oluşturup public veya signed policy verin.

---

## DB yardımcısı (bir kez)

Repodaki `sql/meal_api_helpers.sql` dosyasını SQL Editor’de çalıştırın:

- `pg_trgm` + `badoo.match_food`
- `(food_name, unit_type)` unique index
- `food_logs` → `meals.total_*` trigger

---

## Checklist (mobil)

1. Login sonrası `session.access_token` al
2. Görsel route: FormData + Bearer
3. Ses route: STT sonrası JSON `{ text }` + Bearer
4. 201 → timeline’da `meal` / `items` göster
5. 401 → refreshSession
6. 502 → kullanıcıya “tekrar dene”

---

## Örnek yardımcı (tek dosya)

```js
const API_BASE = process.env.EXPO_PUBLIC_BADOO_API_URL;

export async function withAuthHeaders(accessToken, extra = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    ...extra,
  };
}
```
