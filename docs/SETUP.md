# Supabase setup

## 1. Create the project

1. Create a project at supabase.com (choose an EU region if most visitors are in
   North Macedonia/Europe).
2. **Authentication → Providers → Email:** keep e-mail login enabled.
3. **Authentication → Sign In / Up:** disable *Allow new users to sign up*. Staff
   accounts are created by an administrator (step 4). Even if sign-up stays enabled,
   new accounts have no role and cannot access or change anything.

## 2. Apply the migrations

With the Supabase CLI:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push            # applies supabase/migrations/*.sql in order
```

Or paste each file from `supabase/migrations/` into **SQL Editor** in filename order.

The storage migration creates a public `media` bucket (2 MB, images only) that only
staff can write to. It is skipped automatically on plain PostgreSQL.

## 3. Load the starter content (optional)

Run `supabase/seed.sql` in the SQL editor (or `supabase db reset` locally). It
publishes the 11 categories and 14 use cases, and inserts 25 starter tools, 3 guides,
1 comparison and 2 lists **in review status**. Nothing is visible to visitors until an
editor verifies it against the official website and publishes it. Starter tools have
no prices: enter them during verification.

## 4. Create the first administrator

1. **Authentication → Users → Add user** — create the user with a strong password
   (do not reuse it anywhere, do not commit it).
2. In **SQL Editor**, grant the role (replace the e-mail):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'urednik@example.mk';
```

Use `'editor'` for editors (can create, edit, verify and publish; cannot delete,
see newsletter e-mails or change site settings). Remove access with
`delete from public.user_roles where user_id = …`.

3. Sign in at `/admin`. The dashboard warns until **Поставки** contains the
   publisher name and contact e-mail — enter only real, registered details.

## 5. Environment variables

Copy `.env.example` and fill in (Supabase → Project Settings → API):

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the **publishable / anon** key — never the service role key (the build refuses it) |
| `VITE_SITE_URL` | canonical production URL, e.g. `https://www.example.mk` |
| `VITE_ADSENSE_CLIENT`, `VITE_AD_SLOT_*` | leave empty until AdSense approval (see DEPLOYMENT.md) |

No server-side secrets are required by the application. The optional YouTube search uses
the `YOUTUBE_API_KEY` Edge Function secret (docs/YOUTUBE.md).

## 6. Editorial workflow

1. **Проверка** lists tools that need review or re-verification.
2. Open a tool, compare pricing, free plan, platforms and features with the official
   website, fix the fields, save, then **Означи проверено** with a note (source). The
   next review date defaults to 90 days. Every change is logged in the history.
3. Set status to **Објавено**. The database rejects publishing incomplete records.
4. Use **Преглед** to see drafts on the real page (`?preview=1`, staff only).
5. Visitor suggestions arrive in **Предлози**; they never become public automatically.
