---
kind: configuration_system
name: Environment-based Configuration via Next.js process.env
category: configuration_system
scope:
    - '**'
source_files:
    - .env.example
    - lib/supabase/client.ts
    - next.config.ts
    - vercel.json
---

KasFlow uses a straightforward environment-variable configuration system driven by Next.js's built-in process.env loader. There is no dedicated config module, YAML/JSON config files, or feature-flag framework — configuration is split across three layers:

1. Local development defaults: .env.example documents every required and optional variable (Supabase URL/anon/service-role keys, app base URL, TikTok Shop credentials) and instructs developers to copy it to .env.local.

2. Runtime access via process.env: Every runtime value is read directly from process.env at the call site. The Supabase browser client in lib/supabase/client.ts reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to construct the client; API routes throughout app/api/... read the same variables plus SUPABASE_SERVICE_ROLE_KEY for server-side operations. Redirect URLs are composed from NEXT_PUBLIC_APP_URL with fallbacks to request.url / request.nextUrl.origin.

3. Build/runtime toggles: next.config.ts holds only Next.js-level flags (reactStrictMode, typescript.ignoreBuildErrors). vercel.json is present but empty, relying on Vercel's native env-var injection rather than build-time overrides.

Key conventions observed:
- All client-visible values must be prefixed NEXT_PUBLIC_; secrets like SUPABASE_SERVICE_ROLE_KEY and TIKTOK_APP_SECRET are deliberately not prefixed and never imported into client code.
- Optional integrations (TikTok Shop) are gated by presence of their own env vars (TIKTOK_APP_KEY, TIKTOK_APP_SECRET) rather than a central flag store.
- A small helper isSupabaseConfigured in lib/supabase/client.ts checks that both Supabase URL and anon key are set, providing a minimal readiness probe.
- No schema validation or default-fallback logic exists around env loading — missing variables surface as runtime errors (e.g., the ! non-null assertions on Supabase URL/key).

There is no centralized config object, no per-environment file switching (dev/staging/prod), and no secret manager integration beyond what the hosting platform (Vercel) provides.