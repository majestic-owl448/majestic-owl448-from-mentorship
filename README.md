This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database

[Prisma 7](https://www.prisma.io/docs) against a local SQLite file (`data.db`, gitignored),
through the `better-sqlite3` driver adapter. The connection string lives in `DATABASE_URL`.

```bash
npx prisma migrate dev     # apply/create migrations
npx prisma generate        # regenerate the client (also runs on install)
npx prisma studio          # browse the data
```

The client is generated into `lib/generated/prisma` (gitignored) and re-exported as a
singleton from `lib/db.ts`. Schema and migrations live in `prisma/`.

SQLite is local-only: a Vercel deployment has an ephemeral, read-only filesystem, so
moving off the file means switching the datasource provider to Postgres and pointing
`DATABASE_URL` at a hosted database.

## Authentication

Auth is handled by [SuperTokens](https://supertokens.com) against a managed cloud core,
using the ThirdParty recipe (Google, Apple) with the prebuilt React UI.

Email-based login (Passwordless OTP / magic link) is intentionally not enabled — it
needs an email delivery service configured first.

Setup:

```bash
cp sample.env .env
```

Fill in `SUPERTOKENS_CONNECTION_URI` and `SUPERTOKENS_API_KEY` from your app on the
[SuperTokens dashboard](https://supertokens.com/dashboard), plus the OAuth client
credentials for each social provider.

Layout:

| Path | Purpose |
| --- | --- |
| `app/config/appInfo.ts` | Domains and base paths shared by frontend and backend |
| `app/config/backend.ts` | Recipe list, core connection, `ensureSuperTokensInit()` |
| `app/config/frontend.tsx` | Client recipe list, prebuilt UI list, Next router wiring |
| `app/api/auth/[[...path]]/route.ts` | All auth APIs |
| `app/auth/[[...path]]/page.tsx` | Prebuilt sign-in/sign-up UI |
| `app/components/supertokensProvider.tsx` | Client-side `SuperTokens.init` + wrapper |
| `app/components/sessionAuthForNextJS.tsx` | SSR-safe `SessionAuth` guard |
| `app/dashboard/page.tsx` | Example protected page |

Route handlers are protected with `withSession` from `supertokens-node/nextjs` — see
`app/api/data/route.ts`, which returns 401 without a valid session.

The social credentials in `sample.env` are SuperTokens' public demo OAuth apps. Replace
them with your own before deploying anywhere real, and update `NEXT_PUBLIC_API_DOMAIN`
and `NEXT_PUBLIC_WEBSITE_DOMAIN` to the deployed origin.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
