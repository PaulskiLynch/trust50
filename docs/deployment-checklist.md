# Trust50 MVP Deployment Checklist

## 1. Create the hosted Postgres database

Use Neon or Supabase and copy the direct connection string.

Expected shape:

```text
postgresql://USER:PASSWORD@HOST:5432/trust50?sslmode=require
```

## 2. Prepare local env for validation

Keep local development on SQLite in `.env`:

```env
DATABASE_URL="file:./prisma/dev.db"
```

Add the hosted Postgres URL alongside it:

```env
POSTGRES_DATABASE_URL="postgresql://..."
```

## 3. Validate the Postgres schema locally

From the repo root:

```powershell
npm run generate:postgres
npm run db:push:postgres
```

Optional:

```powershell
npm run seed
```

Note: the current seed script still uses the default Prisma client, so seed should only be treated as optional demo data until the final datasource cutover is complete.

## 4. Create the Vercel project

In Vercel:

- create a new project from this repo
- framework: Next.js
- root directory: `fourhops`

## 5. Set production environment variables in Vercel

Add:

- `DATABASE_URL` = hosted Postgres URL
- `NEXTAUTH_SECRET` = long random secret
- `NEXTAUTH_URL` = production domain
- `NEXTAUTH_URL_INTERNAL` = production domain

Use [.env.production.example](C:\Users\paul\Documents\New%20project\fourhops\.env.production.example) as the reference shape.

## 6. Final datasource cutover

When ready to make Postgres the real app datasource:

1. update [prisma/schema.prisma](C:\Users\paul\Documents\New%20project\fourhops\prisma\schema.prisma)
2. change:

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

to:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

3. run:

```powershell
npm run generate
npm run db:push
```

4. commit the datasource switch
5. deploy to Vercel

## 7. Production smoke test

Verify:

- sign up works
- sign in works
- room list loads
- create room works
- apply to join works
- voting page loads
- discussion post / reply / resolve loop works
- homepage profile loads from `/api/me`

## 8. Immediately after deploy

Decide whether to keep or remove these demo-era pieces before inviting real users:

- `Use test login` entry point
- demo seed copy/content
- seeded `@fourhops.local` users
- open demo fallback in auth
