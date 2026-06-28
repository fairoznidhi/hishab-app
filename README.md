# মাসিক হিসাব অ্যাপ

**No backend needed!** Next.js talks directly to Supabase (free cloud database).

## Deploy কীভাবে করবেন — ধাপে ধাপে

---

## ধাপ ১: Supabase — বিনামূল্যে ডেটাবেজ

1. https://supabase.com → **Start your project** → Google দিয়ে সাইন আপ করুন
2. **New project** → নাম দিন "hishab" → password দিন → region: **Southeast Asia (Singapore)** → Create
3. প্রজেক্ট তৈরি হলে বাম মেনু → **SQL Editor** → **New query**
4. `supabase-setup.sql` ফাইলটি খুলুন → সব কপি করুন → SQL Editor-এ পেস্ট করুন → **Run** চাপুন
5. বাম মেনু → **Project Settings** → **API** → কপি করুন:
   - **Project URL** (যেমন: `https://abcdefgh.supabase.co`)
   - **anon / public key** (নিচে আছে)

---

## ধাপ ২: Vercel — বিনামূল্যে হোস্টিং

1. এই ফোল্ডারটি GitHub-এ আপলোড করুন (github.com → New repository)
2. https://vercel.com → **Add New Project** → GitHub repo সংযুক্ত করুন
3. **Environment Variables** যোগ করুন:
   | নাম | মান |
   |-----|-----|
   | `NEXT_PUBLIC_SUPABASE_URL` | আপনার Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | আপনার Supabase anon key |
4. **Deploy** চাপুন ✅

**হয়ে গেল!** Vercel একটি লিংক দেবে — যেকোনো ফোনে বা কম্পিউটারে সেই লিংকে ঢুকলেই অ্যাপ চলবে।

---

## লোকালে চালানো (ঐচ্ছিক)

```bash
npm install

# .env.local ফাইল তৈরি করুন:
cp .env.example .env.local
# .env.local খুলুন এবং Supabase URL ও key দিন

npm run dev
# http://localhost:3000 খুলুন
```

---

## সারাংশ

| কী | কোথায় | খরচ |
|----|--------|-----|
| ডেটাবেজ | Supabase | বিনামূল্যে (500MB) |
| ওয়েবসাইট | Vercel | বিনামূল্যে |
| Backend সার্ভার | **দরকার নেই** | — |

ডেটা Supabase-এ থাকে — কখনো মুছবে না।
