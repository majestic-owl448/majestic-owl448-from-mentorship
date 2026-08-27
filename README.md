# Stamp Inventory

Stamp Inventory is a web application for recording owned stamps and calculating
their current postage value for a selected country. The first release is under
development; its requirements and implementation sequence are in [`docs/`](docs/).

## Local setup

Create the local environment file before installing dependencies. Prisma reads
`DATABASE_URL` during its post-install client generation.

```bash
cp sample.env .env
pnpm install
pnpm prisma migrate dev
pnpm dev
```

Replace the placeholder SuperTokens and social login credentials in `.env` with
values for your own development apps. The local site runs at
[http://localhost:3000](http://localhost:3000).

## Project checks

Run all three checks before committing a functional change:

```bash
pnpm lint
pnpm test --run
pnpm build
```

The test setup creates a temporary SQLite database, applies the committed Prisma
migrations, and deletes the database after the test run. Tests do not write to
the development database configured in `.env`.

## Database

Local development uses [Prisma 7](https://www.prisma.io/docs) with SQLite through
the `better-sqlite3` driver adapter. The schema and migrations live in `prisma/`.
The generated client is written to `lib/generated/prisma` and re-exported as a
singleton from `lib/db.ts`.

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

SQLite is for local development only. A Vercel deployment has an ephemeral,
read-only filesystem, so production storage requires a hosted database.

## Authentication

[SuperTokens](https://supertokens.com) provides Google and Apple authentication
through its managed cloud core and prebuilt React interface. Copy `sample.env` to
`.env`, then add the core connection and OAuth credentials before running the app.

The authentication code is organized as follows:

| Path | Purpose |
| --- | --- |
| `app/config/appInfo.ts` | Domains and base paths shared by frontend and backend |
| `app/config/backend.ts` | Server recipes and SuperTokens initialization |
| `app/config/frontend.tsx` | Client recipes and Next.js router integration |
| `app/api/auth/[[...path]]/route.ts` | Authentication API routes |
| `app/auth/[[...path]]/page.tsx` | Prebuilt sign-in and sign-up interface |
| `app/components/supertokensProvider.tsx` | Client initialization and provider |
| `app/components/sessionAuthForNextJS.tsx` | Server-rendering-safe session guard |
| `app/dashboard/page.tsx` | Example protected page |

Email login is not enabled because the project does not yet have an email delivery
service. The credentials in `sample.env` are placeholders and must be replaced
before deployment.
