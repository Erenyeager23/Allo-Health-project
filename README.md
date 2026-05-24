# Allo — Reservations Take-Home

A small Next.js reservation app that tracks inventory across warehouses and reserves stock with expiry.

## Local development

1. Copy `.env.example` to `.env`.
2. Configure a local or hosted Postgres database in `.env`:

```env
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/allo
RESERVATION_TTL_MINUTES=10
```

3. Install dependencies:

```bash
npm install
```

4. Create the database and run the seed script:

```bash
npx prisma migrate dev --name init
npm run seed
```

5. Start the app:

```bash
npm run dev
```

6. Visit `http://localhost:3000`.

## Production / deployed environment

For production, use a hosted Postgres database and set the same `DATABASE_URL` environment variable in Vercel.

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
RESERVATION_TTL_MINUTES=10
```

Then deploy to Vercel with the Postgres database hosted on Supabase, Neon, or another managed provider.

### Why this works

The Prisma datasource is configured for Postgres in `prisma/schema.prisma`:

```prisma
provider = "postgresql"
```

This ensures the deployed app uses a hosted Postgres instance, which is required for the deliverable.

## Database seeding

Seeded stock defaults are restored by `prisma/seed.js`.

Initial stock state:

- `productId=1`, `warehouseId=1` → `total=5`, `reserved=0`
- `productId=1`, `warehouseId=2` → `total=2`, `reserved=0`
- `productId=2`, `warehouseId=1` → `total=3`, `reserved=0`

Run seed:

```bash
npm run seed
```

If a stock row already exists, seeding resets `reserved` to `0` and restores the default total.

## Expiry mechanism

- A reservation includes an `expiresAt` timestamp.
- When reservations are read or a new reservation is requested, expired pending reservations are released and their reserved stock is returned to availability.
- Confirming a reservation decrements both `reserved` and `total`.
- Releasing a reservation decrements only `reserved`.
- There is also a production-safe cleanup endpoint:

  - `POST /api/cleanup-expired`

This can be invoked from a scheduled cron job in production to keep the database clean.

## Trade-offs and future improvements

- I kept local development simple with SQLite and added support for hosted Postgres in production.
- The expiry cleanup is lazy and also available as a cron endpoint, which avoids a dedicated worker for small deployments.
- With more time, I would add:
  - proper admin UI for manual reservation and stock adjustments,
  - stronger validation and schema-level enums for `status`,
  - richer logging and background scheduled cleanup on Vercel,
  - tests for concurrent reservation behavior.
