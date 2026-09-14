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
same header to server-rendered responses on `polycord.chev.dev`. Remove staging
indexing rules when configuring a public production site.

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
