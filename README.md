# Badoo Admin Panel

Next.js 16 admin paneli — Badoo mobil uygulaması (`badoo` şeması) için.

## Kurulum

1. `.env.local` doldurun:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # Dashboard → Settings → API (asla client'a koyma)
ADMIN_EMAILS=sen@ornek.com,diger@ornek.com
CLAUDE_API_KEY=              # veya ANTHROPIC_API_KEY
```

2. Supabase’de ilgili e-posta ile Auth kullanıcısı oluşturun (Dashboard → Authentication).

3. API settings’te `badoo` şemasının exposed olduğundan emin olun.

4. Meal API yardımcı SQL: `sql/meal_api_helpers.sql` (match_food + trigger).

5. Çalıştırın:

```bash
npm install
npm run dev
```

`http://localhost:3000/login` → admin e-posta ile giriş → `/admin/dashboard`

## Meal API (mobil)

| Method | Path | Body |
|--------|------|------|
| POST | `/api/meals/analyze-image` | `multipart/form-data` → `image` |
| POST | `/api/meals/analyze-text` | JSON `{ "text": "..." }` |

Auth: `Authorization: Bearer <supabase_access_token>`

Mobil entegrasyon: [`docs/mobile-meal-api.md`](docs/mobile-meal-api.md)
