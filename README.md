# Meeting Room Booking

Meeting Room Booking is being built as an Nx monorepo for an Angular web
application and a NestJS API backed by PostgreSQL through Prisma. The Angular
shell currently provides the route-level home for authentication, Rooms, My
Bookings, and Administrator flows.

## Requirements

- Node.js 22.12 or newer (an even-numbered LTS release is recommended)
- npm 11
- Docker with Docker Compose

## Setup

```bash
npm ci
npm run db:start
npm run db:migrate
npm run db:seed
npm run check
```

`db:start` starts PostgreSQL 17 at `localhost:5432`. The development database
uses a named Docker volume, so its data survives container restarts. Check its
health with `docker compose ps`, and stop it with `npm run db:stop`.

Start the Angular app at `http://localhost:4200`:

```bash
npx nx serve web
```

Start the NestJS API at `http://localhost:3000/api`:

```bash
npx nx serve api
```

Check that the API is running:

```bash
curl http://localhost:3000/api/health
```

The response is `{"status":"ok"}`.

## Environment configuration

The API reads local settings from `apps/api/.env.local` first and then
`apps/api/.env`. Tests read `apps/api/.env.test` first and then
`apps/api/.env`. All of these files are ignored by Git.

Copy the tracked example before starting the API:

```bash
cp apps/api/.env.example apps/api/.env.local
```

`PORT` defaults to `3000`. `DATABASE_URL` is required by the API and points at
the development PostgreSQL service in the tracked example.

## Database workflow

Prisma's schema, configuration, and migrations live under `apps/api`. Migrations
are always run explicitly; starting a container never changes the database
schema.

| Command                  | Purpose                                                |
| ------------------------ | ------------------------------------------------------ |
| `npm run db:start`       | Start the local development PostgreSQL service         |
| `npm run db:generate`    | Generate the type-safe Prisma Client                   |
| `npm run db:validate`    | Validate the Prisma configuration and schema           |
| `npm run db:migrate`     | Apply committed migrations to the development database |
| `npm run db:migrate:dev` | Create and apply a migration while changing the schema |
| `npm run db:seed`        | Upsert the repeatable demo data                        |
| `npm run db:stop`        | Stop the local development PostgreSQL service          |

The demo seed creates one Administrator, two regular Users, six Rooms, and a
mix of future Active and Cancelled Bookings. Re-running the command updates the
same records instead of creating duplicates. Seeded Booking timestamps are UTC,
use 15-minute boundaries, and fall within the 08:00–20:00 Europe/Kyiv Booking
Hours.

The demo accounts share the password `Demo123!`:

| Role          | Email                |
| ------------- | -------------------- |
| Administrator | `admin@example.com`  |
| User          | `maksym@example.com` |
| User          | `sofiia@example.com` |

Committed Prisma migrations are SQL files and may contain hand-written
PostgreSQL statements for constraints Prisma Schema Language cannot express.

### PostgreSQL integration tests

The isolated test service listens at `localhost:5433`, stores its data in a
temporary filesystem, and does not share state with development:

```bash
cp apps/api/.env.test.example apps/api/.env.test
npm run db:test:start
npm run db:test:migrate
npm run db:test:seed
npm test
npm run db:test:stop
```

Future API integration tests should use `DATABASE_URL` from `.env.test` and
reset their own data between cases. CI can use the same URL with a PostgreSQL
service instead of Docker Compose.

Nx runs each root command against projects that expose its matching target.

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run lint`         | Lint every project with a `lint` target            |
| `npm run typecheck`    | Type-check every project with a `typecheck` target |
| `npm test`             | Test every project with a `test` target            |
| `npm run build`        | Build every project with a `build` target          |
| `npm run check`        | Run all four verification commands                 |
| `npm run graph`        | Open the Nx project graph                          |
| `npm run format:check` | Check formatting for files selected by Nx          |

## Current workspace

```text
apps/
|-- api/  # NestJS API shell
`-- web/  # Angular application shell
```

Project decisions and domain vocabulary are recorded in
[`CONTEXT.md`](./CONTEXT.md) and [`docs/adr`](./docs/adr).
