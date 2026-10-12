# Footnotes

Day-by-day travel itinerary planner: a list of places on a map, ordered by walking and
public-transport time, with fixed arrival times respected and tour-guide notes per place.

- **App:** Vue 3, Vite, TypeScript, Pinia. Hosted on GitHub Pages at `/footnotes/`.
- **Maps and routing:** Google Maps Platform (Maps JavaScript, Places, Routes).
- **Auth, database, server functions:** Supabase. New users are pending until an admin approves them.
- **AI notes:** OpenAI, called only from Supabase Edge Functions.

## Develop

```sh
cp .env.example .env.local   # then fill in the Google Maps key
npm install
npm run dev
```

`npm run build` type-checks and builds; `npm run test:unit` runs Vitest; `npm run lint` lints.

## Database

The schema lives in `supabase/migrations`. Apply it with the Supabase CLI
(`supabase link --project-ref mdxgydrsbedypjefimdy && supabase db push`) or paste the file into
the dashboard's SQL editor.

After your first sign-in, make yourself admin once in the SQL editor:

```sql
update public.profiles set approved = true, is_admin = true where email = 'you@example.com';
```

## Guide notes

`supabase/functions/place-info` writes the tour-guide note and suggested visit length for a place
with OpenAI, then stores them so each place is generated once. Deploy it and set its key with:

```sh
supabase functions deploy place-info
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set OPENAI_MODEL=...   # optional; defaults to gpt-4o-mini
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`. It needs Pages set to "GitHub Actions" as
the source, two repository variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`) and one repository
secret (`VITE_GOOGLE_MAPS_KEY`).

The Maps key is never committed, but it does end up in the built JavaScript that browsers download.
Restrict it in Google Cloud to the Pages domain and to the Maps JavaScript, Places and Routes APIs.
