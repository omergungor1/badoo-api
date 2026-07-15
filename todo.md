Şimdi bir api eklememiz gerekiyor buraya. Eklediğin api için mobil uygulama api bağlantısı için bir doc dosyası üretmelisin. Buna bakarak mobil uygulamaya bu iki web servisi entegre edeceğim. Mobil app de supabase auth kullanıyor. Api güvenliği için kullanıcının hangi bilgisini güvenlik ve auth için gödnermesi gerektiğini de belirtmelisin api entegrasyon dökümanında.


 Kullanıcı bir öğün resmini yükleyince mobil uygulama kullanıcı tokeni ile veya neye ihtiyacın varsa onun ile birlikte resmi bu arpiye gönderecek. Daha sonra resim analiz edilecek, bu resimde hangi foods @db.sql:43  var analiz edilecek. Claude apiden şuna benzer bir cevap gelmeli: 

{
  foods: [
    {
      name: "Chicken breast",
      grams: 180,
      confidence: 0.93
    },
    {
      name: "Rice",
      grams: 120
    }
  ]
}

---

Next.js (App Router) projemde iki yeni API route yazmanı istiyorum. Amaç: kullanıcının
yediği yemeği (resim veya text anlatım ile) Claude API kullanarak analiz edip
veritabanına "meal" (öğün) olarak kaydetmek.

## GENEL KURALLAR

- Claude API sadece TEK İŞ yapacak: gönderilen görseli veya metni, yapılandırılmış
  bir "food listesi" JSON'una çevirecek. Kalori/protein/karbonhidrat/yağ hesaplaması,
  veritabanı eşleştirmesi, insert/update işlemleri TAMAMEN bizim Next.js kodumuzda
  yapılacak. Claude'a "veritabanına kaydet" gibi bir sorumluluk verme.
- Claude'a gönderilen prompt'ta yemek isimlerinin MUTLAKA TÜRKÇE dönmesini iste
  (örn. "Tavuk Göğsü", "Pirinç Pilavı", "Hurma"). Çünkü badoo.foods.food_name veritabanında Türkçe tutuluyor ve fuzzy match Türkçe isimle yapılacak.
- Claude API çağrısında `tools` (tool_use) kullan, serbest metin/markdown parse etme.
  Model: "claude-haiku-4-5-20251001" kullan (maliyet için yeterli, Sonnet'e gerek yok).
- Görsel her zaman API'ye gönderilmeden önce sharp ile resize edilecek (max 768px genişlik, jpeg quality 80 -> kullanıcı tel ile çektiği resmi gönderecek. Yüksek çözünürlük api maliyetini arttırıyor. Yapay zeka api maliyetini çok düşük tutmamız gerekiyor. Bu nedenle gereken yerde minimum token harcamamız gerekiyor.). Bu hem Claude token maliyetini hem upload süresini düşürür.
- Sesli input bizim tarafımıza artık TEXT olarak geliyor (speech-to-text zaten client
  tarafında/başka bir serviste yapılmış oluyor, biz sadece transcript text alıyoruz).
  Bu route'a görsel gönderme, direkt text gönder.

## VERİTABANI ŞEMASI (mevcut + yeni, aşağıdaki gibi TypeScript tipleri de üret)

badoo.foods:
  id uuid, food_name text, unit_type text ('gram'|'piece'|'cup'|'ml'|'tbsp'|'slice'),
  reference_amount numeric (gram için 100, diğerleri için 1),
  calories integer, protein integer, carbohydrates integer, fats integer,
  source text ('ai'|'manual'|'verified'), created_at timestamptz

badoo.meals:
  id uuid, user_id uuid, meal_title text, source text ('image'|'voice'|'manual'),
  raw_input text, image_url text, image_path text,
  total_calories integer, total_protein integer, total_carbohydrates integer,
  total_fats integer, eaten_at timestamptz, created_at, updated_at, deleted_at

badoo.food_logs (mevcut tablo, meal ile ilişkilendirildi):
  id uuid, user_id uuid, food_id uuid (FK -> foods), meal_id uuid (FK -> meals),
  quantity numeric, unit_type text, food_name text (snapshot),
  meal_title text, image_url text, image_path text,
  calories integer, protein integer, carbohydrates integer, fats integer,
  is_manual boolean, timestamp timestamptz, deleted_at timestamptz

  NOT: food_logs = meal içindeki her bir yiyecek satırı. meal_id ile hangi öğüne
  ait olduğu belli olur. calories/protein/carb/fat burada SNAPSHOT olarak tutulur
  (quantity * foods tablosundaki per-unit değer), foods tablosu değişse bile
  geçmiş kayıtlar bozulmaz.

  Hesaplama formülü HER ZAMAN böyle: 
    food_logs.calories = round(quantity * (foods.calories / foods.reference_amount))
  (protein/carb/fat için aynı formül)

## SERVİS 1: POST /api/meals/analyze-image

1. multipart/form-data ile image al (Next.js route handler, FormData kullan).
2. user_id'yi auth session'dan al (mevcut auth yapımı kullan, kod içinde
   `// TODO: auth burada entegre edilecek` yorumu bırak, ben dolduracağım).
3. sharp ile resize et: max width 768px, jpeg quality 80, buffer'a çevir, base64'e encode et.
4. Resmi bir storage'a yükle (mevcut storage helper'ım yok,
   `// TODO: storage upload entegrasyonu` yorumu bırak) ve image_url / image_path
   elde et — meals tablosuna bunları da yazacağız. -> 
5. Claude API'ye tool_use ile şu şemada bir tool tanımla ve zorunlu kıl:

   tool adı: extract_meal_from_image
   input_schema:
     foods: array of {
       name: string (TÜRKÇE yemek adı, örn "Tavuk Göğsü"),
       unit_type: enum [gram, piece, cup, ml, tbsp, slice],
       quantity: number (kaç gram / kaç adet / kaç bardak),
       calories_per_unit: number (unit_type gram ise 100g başına, diğerlerinde 1 birim başına),
       protein_per_unit: number,
       carbohydrates_per_unit: number,
       fats_per_unit: number,
       confidence: number (0-1)
     }

   System prompt olarak şunu kullan (aynen, sadece gerekirse küçük iyileştirme yap):
   "Sen bir beslenme uzmanısın. Gönderilen tabak/öğün fotoğrafındaki TÜM yiyecekleri
   tanı. Her yiyecek için Türkçe isim ver (örn: 'Tavuk Göğsü', 'Pirinç Pilavı', 'Hurma').
   Miktarları görsel olarak tahmin et. unit_type'ı yiyeceğin doğasına göre seç:
   çoğu pişmiş yemek için 'gram', sayılabilir yiyecekler (hurma, yumurta, dilim ekmek)
   için 'piece' veya 'slice', içecekler için 'cup' veya 'ml'. calories_per_unit ve
   diğer makro değerlerini unit_type='gram' ise HER ZAMAN 100 gram baz alarak,
   diğer unit_type'larda 1 birim baz alarak ver. Emin olmadığın değerlerde bile
   makul bir tahmin ver, boş bırakma."

6. Claude cevabından foods[] array'ini al.
7. Yeni bir badoo.meals kaydı oluştur: source='image', image_url, image_path,
   meal_title = Claude'dan gelen genel bir başlık tahmini olabilir (opsiyonel,
   yoksa null bırak, total_* alanları trigger ile otomatik dolacak, o yüzden
   burada 0 ile insert et).
8. foods[] içindeki her eleman için adım 9-11'i sırayla çalıştır (Promise.all
   DEĞİL, sırayla — race condition'dan kaçının çünkü aynı isim iki kez insert
   edilebilir).

## SERVİS 2: POST /api/meals/analyze-text

Aynı akış ama:
- Body: { text: string, user_id... } — JSON body, multipart değil.
- Resize/upload adımı yok.
- source='voice', raw_input = gelen text, image_url/image_path null.
- Claude'a gönderilecek system prompt aynı mantıkta ama görsel yerine metin analiz
  edecek şekilde uyarlanmalı:
  "Sen bir beslenme uzmanısın. Kullanıcının sesli olarak anlattığı öğünü metinden
  analiz et: '{text}'. İçindeki TÜM yiyecekleri ve miktarlarını çıkar..." (devamı
  yukarıdaki gibi, aynı tool şeması kullanılacak, tool adı: extract_meal_from_text)
- Kullanıcı "bir avuç kabak çekirdeği" gibi belirsiz miktar söylerse, bunu makul
  bir gram karşılığına çevir (örn "bir avuç" ~ 30g), quantity ve unit_type'ı
  buna göre doldur.

## PAYLAŞILAN MANTIK (her iki route'ta da kullanılacak, ayrı bir lib dosyasına çıkar)

Dosya: lib/meals/matchAndInsertFood.ts

Fonksiyon: async function matchOrCreateFood(foodFromAI: {
  name, unit_type, calories_per_unit, protein_per_unit, carbohydrates_per_unit, fats_per_unit
}): Promise<{ food_id: string, calories_per_unit, protein_per_unit, carbohydrates_per_unit, fats_per_unit, reference_amount }>

Mantık:
1. Postgres'te pg_trgm ile fuzzy match dene:
   select id, food_name, calories, protein, carbohydrates, fats, reference_amount,
          similarity(food_name, $1) as sim
   from badoo.foods
   where unit_type = $2 and food_name % $1
   order by sim desc
   limit 1;

   ($1 = AI'den gelen isim, $2 = AI'den gelen unit_type — unit_type de eşleşmeli,
   çünkü aynı yiyecek farklı birimde farklı satır olabilir)

2. Eğer sim >= 0.4 ise: bu satırı kullan, foods tablosuna insert YAPMA, mevcut
   id ve değerlerini döndür.

3. Eğer eşleşme yoksa: 
   - reference_amount = unit_type === 'gram' ? 100 : 1
   - foods tablosuna insert et: food_name (AI'den gelen Türkçe isim), unit_type,
     reference_amount, calories = round(calories_per_unit), protein = round(...),
     carbohydrates = round(...), fats = round(...), source = 'ai'
   - ON CONFLICT (food_name, unit_type) DO UPDATE kullan (race condition için
     iki eşzamanlı istek aynı yeni yiyeceği eklemeye çalışırsa hata almasın,
     mevcut satırı döndürsün): 
     insert into badoo.foods (...) values (...) 
     on conflict (food_name, unit_type) do update set food_name = excluded.food_name
     returning *;
   - yeni satırı döndür.

Dosya: lib/meals/insertFoodLog.ts

Fonksiyon: async function insertFoodLogForMeal(params: {
  meal_id, user_id, food_id, food_name, quantity, unit_type,
  reference_amount, calories_per_unit, protein_per_unit, carbohydrates_per_unit, fats_per_unit
}): Promise<void>

Mantık:
- calories = round(quantity * (calories_per_unit / reference_amount))
- protein = round(quantity * (protein_per_unit / reference_amount))
- carbohydrates = round(quantity * (carbohydrates_per_unit / reference_amount))
- fats = round(quantity * (fats_per_unit / reference_amount))
- badoo.food_logs tablosuna insert et: meal_id, user_id, food_id, food_name (snapshot),
  quantity, unit_type, calories, protein, carbohydrates, fats, is_manual=false,
  timestamp = now()
- Trigger otomatik olarak meals.total_* alanlarını güncelleyecek, burada
  ekstra bir update sorgusu YAZMA.

## HER İKİ ROUTE'UN SONUNDA

- meals tablosundan (trigger'ın güncellediği) fresh veriyi tekrar select et
  (total_calories vs. güncel gelsin) ve food_logs join'i ile beraber şu formatta
  dön:

  {
    meal: {
      id, source, meal_title, total_calories, total_protein,
      total_carbohydrates, total_fats, eaten_at
    },
    items: [
      { food_log_id, food_id, food_name, quantity, unit_type,
        calories, protein, carbohydrates, fats, confidence }
    ]
  }

## HATA YÖNETİMİ

- Claude API çağrısı başarısız olursa (rate limit, timeout) 502 dön, meals
  kaydı oluşturma (ya da oluşturduysan rollback et — transaction kullan,
  meal insert + food_log insert'leri tek transaction içinde olsun ki
  yarım kalmış meal kaydı oluşmasın).
- Claude'un tool_use çağırmayıp düz metin dönmesi ihtimaline karşı response
  içinde tool_use bloğu var mı kontrol et, yoksa 502 + anlamlı hata mesajı dön.
- foods insert sırasında unique constraint çakışması ON CONFLICT ile zaten
  yönetiliyor, ekstra try/catch'e gerek yok ama yine de sarmalayıp logla.

## DOSYA YAPISI ÖNERİSİ

app/api/meals/analyze-image/route.ts
app/api/meals/analyze-text/route.ts
lib/meals/claudeClient.ts        (Anthropic client init + shared config)
lib/meals/matchAndInsertFood.ts
lib/meals/insertFoodLog.ts
lib/meals/types.ts               (FoodFromAI, MealResponse gibi tipler)

Environment variable: ANTHROPIC_API_KEY (.env.local'da zaten olduğunu varsay).

Şimdi bu iki route'u, yukarıdaki lib dosyalarıyla birlikte, TypeScript ve
Next.js App Router route handler standartlarına uygun şekilde yaz. Transaction
için mevcut db client'ımı (pg / Supabase client / Prisma — hangisini kullanıyorsam
ona uygun) kullan, kodun neresinde hangi client'ı varsaydığını yorum olarak belirt.
```

---

# Kısa Not

- `foods.calories/protein/carbohydrates/fats` kolonlarınız `integer` — bu yüzden formülde `round()` kullandım, küsuratlı değer kaybı olur ama bu seviye bir hassasiyet kayb bu use-case için sorun değil. İsterseniz `numeric` tipine çevirip daha hassas tutabilirsiniz, prompttaki `reference_amount` ekleme mantığı bundan etkilenmez.
- `similarity() >= 0.4` eşiği başlangıç için makul, gerçek kullanımda "Tavuk Göğsü Izgara" vs "Tavuk Göğsü" gibi varyasyonlarda çok fazla duplicate food oluşuyorsa eşiği düşürüp test edin ya da embedding tabanlı arama (pgvector) düşünülebilir — ama trigram başlangıç için maliyetsiz ve yeterli.



