# Polycord

Polycord is a Next.js application built with Bun, React, Tailwind CSS, next-intl,
Discord OAuth, and Drizzle ORM. This README is a technical guide for setting up
and working on the project locally.

## Requirements

- [Bun](https://bun.sh/) for package management and scripts
- Node.js compatible with Next.js 15
- A Supabase Postgres database, or another Postgres database for local work
- Discord OAuth application credentials for login flows

## Clone And Install

```bash
git clone https://github.com/chev0004/Polycord.git
cd Polycord
bun install
```

Install Git hooks after dependencies are installed:

```bash
bun run prepare
```

## Environment

Create a local environment file from the example:

```bash
cp .env.example .env.local
```

Required variables:

| Variable | Purpose |
| --- | --- |
| `AUTH_SECRET` | Signs and verifies app session cookies. |
| `DISCORD_CLIENT_ID` | Discord OAuth application client id. |
| `DISCORD_CLIENT_SECRET` | Discord OAuth application client secret. |
| `DISCORD_REDIRECT_URI` | Discord OAuth callback URL. |
| `DATABASE_URL` | Postgres connection string used by Drizzle. |

For local development, the default Discord redirect URI is:

```text
http://localhost:3000/api/auth/discord/callback
```

## Run Locally

Start the Next.js development server:

```bash
bun run dev
```

Open the app at:

```text
http://localhost:3000
```

Build and run the production server locally:

```bash
bun run build
bun run start
```

## Staging

Staging runs at https://polycord.chev.dev on the Netlify project
`polycord-staging`. Merges to `develop` deploy automatically. Netlify calls this
project's live deployment the production context; it is still Polycord staging.
Deploy previews are disabled for this project.

Staging uses the existing Supabase database, so profile edits and deletions affect
the same data used locally. Database migrations remain an explicit operation;
the hosting build does not run them.

Set runtime values in Netlify's environment variables for the production context,
never in Git. Use the required variables above, with this Discord redirect URI:

```text
https://polycord.chev.dev/api/auth/discord/callback
```

The Discord application must allow that URI as well as the localhost callback.
Staging has its own `AUTH_SECRET` and VAPID keys. Set
`NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` for push;
the subject is `https://polycord.chev.dev`. Rebuild after changing the public key.
Product analytics is disabled with `POLYCORD_ANALYTICS_DISABLED=true`, and Stripe
variables are left unset. `netlify.toml` pins the build runtimes and adds a
`noindex, nofollow` response header for static files. `next.config.ts` adds the
same header to server-rendered responses on `polycord.chev.dev`. Leave
`POLYCORD_PUBLIC_URL` unset on staging so `robots.txt` disallows all crawling and
the sitemap stays empty.

## Operations

`GET /api/health` returns `200` when the app can reach the database and `503`
when it cannot. Backup, restore, migration and rollback procedures, and the
status of each operational control, are in
[docs/operations/readiness.md](docs/operations/readiness.md). Changes needed for a
public production site are in
[docs/operations/release-checklist.md](docs/operations/release-checklist.md).

## Database

Drizzle is configured in `drizzle.config.ts`, with schema definitions in
`src/db/schema.ts` and generated migrations in `drizzle/`.

Generate a migration after changing the schema:

```bash
bun run db:generate
```

Apply pending migrations:

```bash
bun run db:migrate
```

Open Drizzle Studio:

```bash
bun run db:studio
```

The database scripts load `.env.local`, so make sure `DATABASE_URL` is present
before running them.

## Stack Overview

| Area | Tooling |
| --- | --- |
| App framework | Next.js App Router |
| Runtime and package manager | Bun |
| UI | React, Tailwind CSS, Radix UI, React Icons |
| Forms and validation | React Hook Form, Zod |
| Internationalization | next-intl, locale files in `src/locales` |
| Auth | Discord OAuth, signed app session cookies |
| Database | Postgres, Drizzle ORM, Drizzle Kit |
| Formatting and linting | Biome, lint-staged, Husky |
| Component workbench | Storybook |

## Project Layout

| Path | Purpose |
| --- | --- |
| `src/app` | Next.js routes, layouts, and API route handlers. |
| `src/components` | Shared UI primitives and reusable components. |
| `src/features` | Feature-level UI and interaction code. |
| `src/db` | Drizzle client, schema, and database query helpers. |
| `src/lib` | Shared application utilities such as auth/session helpers. |
| `src/locales` | Locale message JSON files. |
| `drizzle` | Generated database migrations and Drizzle metadata. |
| `.storybook` | Storybook configuration. |

## Account sessions and data

Session cookies expire after 30 days and carry the unique Polycord account ID as well as the Discord identity. Server authentication requires that account record to still exist with the same ID. Only the Discord OAuth callback creates accounts; ordinary page reads and API writes cannot recreate one. Cookies issued before account binding was introduced require a new sign-in. No database migration is needed for this change.

Deleting an account invalidates all of its existing sessions. A deliberate OAuth sign-in can create a new account with a different ID; old cookies remain invalid and deleted data is not restored. Discord-keyed moderation restrictions still apply. Logout clears the current browser cookie; it does not revoke copied cookies or other devices. Deletion does not delete the Discord account or revoke Discord authorization. Users can remove Polycord under Discord User Settings > Authorized Apps separately.

The version 2 JSON export includes the account, complete editable profile and styling, settings, voice data, saved links, blocks created, submitted reports, inbox state, local subscription state, boosts, push registration IDs/dates, and account-linked activity. It excludes notification actor identities, other users' account data, reports filed by others, internal moderation/abuse records, analytics metadata, and push endpoints/keys. Exports are served with `Cache-Control: no-store`.

| Data category | Account deletion behavior |
| --- | --- |
| Account, profile, target languages, settings, voice | Deleted. |
| Saved links, blocks, reports involving the account | Deleted, including links from other accounts. |
| Account's inbox, local subscription mapping, boosts, push registrations | Deleted. Active Stripe subscriptions must first be confirmed canceled; cancellation failure preserves the account and allows retry. |
| Analytics events | Account link cleared; events, metadata and anonymous identifiers remain. |
| Moderation actions | Account and deleted-report links cleared; actions and notes remain. |
| Suspicious-activity logs | Account link cleared; action and IP data remain. |
| Rate-limit counters and Discord-keyed moderation restrictions | Remain. |
| Actor names/avatars already stored in another user's inbox | Remain. |
| Payment-provider records and backups | This deletion operation does not purge them. Provider retention and backup expiry require separate operational verification. |

Regression coverage uses an isolated localhost PostgreSQL database via `TEST_DATABASE_URL`: `bun test` checks export boundaries, cascades, retained records, failed billing cancellation and account recreation; `bun run test:e2e` checks old cookies in two browser contexts, read/write rejection, logout and localized cancellation recovery. The tests must never point at the shared staging database. Deployed Stripe lifecycle verification and public-policy reconciliation remain tracked in BILLING-002 and LEGAL-002.

## Scripts

| Script | Description |
| --- | --- |
| `bun run dev` | Start the local Next.js development server. |
| `bun run build` | Create a production build. |
| `bun run start` | Run the production build locally. |
| `bun run check:all` | Run Biome checks without writing fixes. |
| `bun run check` | Run Biome checks and write safe fixes. |
| `bun run fix:all` | Run Biome lint and format fixes. |
| `bun run format` | Format the repository with Biome. |
| `bun run db:generate` | Generate Drizzle migrations from schema changes. |
| `bun run db:migrate` | Apply pending Drizzle migrations. |
| `bun run db:studio` | Start Drizzle Studio. |
| `bun run gen:locales` | Generate locale output used by the app/tooling. |
| `bun run storybook` | Start Storybook on port 6006. |
| `bun run build-storybook` | Build the static Storybook output. |
| `bun run prepare` | Install Husky Git hooks. |

## Profile Privacy And Blocking

Public profiles remain available to signed-out visitors. When anonymous copying
is disabled, the server omits the Discord username from discovery and public
profile payloads for guests. Signed-in viewers can receive it unless a block or
profile visibility restriction applies.

Blocks apply in both directions while signed in: discovery, saved lists, direct
profile pages, voice media, saves, reports, and copy notifications exclude the
other account. Private, moderation-hidden, suspended, banned, and deleted
profiles are unavailable to other viewers. An active owner can preview their
own private voice introduction. Existing bookmarks remain stored and can
reappear after unblocking if the profile is still public.

Settings → Privacy lists the accounts you blocked. Unblocking is immediate,
including when the other account has removed or hidden their profile. You can
only remove your own blocks; a block from the other account still applies.
Previously disclosed information and signed-out public browsing cannot be
revoked by an account block.

The `copy` rate limit applies to requests that create copy notifications, not to
the browser clipboard. The UI sends those requests only after a successful
clipboard write. Rejected, blocked, and rate-limited requests create no
notification. Once a username has been disclosed, clipboard operations cannot
be reliably limited by the server.

Browser privacy checks build and serve the production app against a disposable
local database. Next.js development diagnostics can serialize database results
into RSC debug data; do not expose the development server to public traffic.

## Before Opening A PR

Run the core local checks:

```bash
bun run check:all
bunx tsc --noEmit
bun run build
```

For database changes, also run:

```bash
bun run db:migrate
```

Commit messages must follow Conventional Commits, for example:

```text
docs: update project readme
```
