# Trust50

Trust50 is a Next.js + Prisma app for running small, high-trust professional rooms.

## Local development

1. Copy `.env.example` to `.env`
2. Keep `DATABASE_URL` pointed at the local SQLite file
3. Install dependencies
4. Sync the database
5. Start the app

```powershell
npm install
npm run db:push
npm run dev -- --hostname 0.0.0.0
```

Optional demo seed:

```powershell
npm run seed
```

Default local env:

- `DATABASE_URL` -> SQLite (`file:./prisma/dev.db`)
- `POSTGRES_DATABASE_URL` -> reserved for hosted Postgres validation and deployment prep
- `NEXTAUTH_URL` -> local app URL

## Postgres deployment prep

The repo now supports two Prisma schema files:

- `prisma/schema.prisma` -> local SQLite development
- `prisma/schema.postgres.prisma` -> hosted Postgres deployment

Useful commands:

```powershell
npm run generate
npm run generate:postgres
npm run db:push
npm run db:push:postgres
```

## Current stack

- Next.js App Router
- Prisma ORM
- NextAuth credentials auth
- SQLite locally today
- Postgres intended for production deployment

## Production move

Before going live:

1. Create a hosted Postgres database in Neon or Supabase
2. Set `POSTGRES_DATABASE_URL` locally
3. Run `npm run db:push:postgres`
4. In Vercel, set:
   - `DATABASE_URL` = hosted Postgres URL
   - `NEXTAUTH_SECRET` = real random secret
   - `NEXTAUTH_URL` = production domain
5. Do one deliberate cutover pass:
   - switch `prisma/schema.prisma` datasource to `postgresql`
   - point `DATABASE_URL` at hosted Postgres
   - run `npm run generate`
   - run `npm run db:push`
6. Deploy

For now, local development stays on SQLite so the current workflow does not break.

Detailed cutover steps:

- [docs/deployment-checklist.md](C:\Users\paul\Documents\New%20project\fourhops\docs\deployment-checklist.md)

## MVP slices completed

- Real registration and credential sign-in
- Room creation and membership flows
- Member voting and recommendations
- Discussions, replies, and resolution
- Shared-context profile access

## Next recommended slices

1. Move local SQLite to hosted Postgres
2. Add invite and notification emails
3. Add audit logging for joins, votes, and removals
4. Remove remaining demo seed assumptions from UX copy and fallback flows
