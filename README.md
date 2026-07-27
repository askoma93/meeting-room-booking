# Meeting Room Booking

Meeting Room Booking is a reviewer-ready portfolio application for reserving
shared meeting rooms. It demonstrates a complete Angular and NestJS workflow:
authenticated users can inspect room availability, create and cancel their own
future Bookings, while Administrators manage Rooms and oversee all Bookings.

The project is intentionally small enough to review in one sitting while still
showing production-minded choices: PostgreSQL constraints protect scheduling
rules, authorization is enforced by the API, database changes are explicit,
and required user journeys run in a real browser in CI.

## What to review

- **Domain behavior:** half-open Time Slots, 15-minute Booking Granularity,
  08:00–20:00 Europe/Kyiv Booking Hours, overlap protection, Booking Ownership,
  Administrative Cancellation, and the Room Deactivation Guard.
- **Backend:** NestJS modules expose authentication, Rooms, availability, and
  Bookings through a validated REST API.
- **Data integrity:** Prisma handles the application model while committed
  PostgreSQL migrations add constraints that are stronger than UI validation.
- **Frontend:** the Angular app covers User and Administrator journeys with
  responsive room, booking, and management views.
- **Verification:** Jest/Vitest cover API and component behavior; Playwright
  exercises the required end-to-end journeys against PostgreSQL.

Architecture and domain decisions are recorded in
[`CONTEXT.md`](./CONTEXT.md) and [`docs/adr`](./docs/adr).

## Fastest evaluation: Docker Compose

Requirements: Docker with Docker Compose.

From a clean checkout, build the images, start PostgreSQL, and then run the
schema and demo-data steps explicitly:

```bash
docker compose build api web migrate seed
docker compose up -d postgres
docker compose run --rm migrate
docker compose run --rm seed
docker compose up -d api web
```

Open <http://localhost:4200>. The API health endpoint is available at
<http://localhost:3000/api/health>. `docker compose ps` should show PostgreSQL,
the API, and the web app as healthy.

The migration and seed commands are deliberately separate from container
startup. Re-running them is safe: committed migrations apply once and the demo
seed upserts stable records.

Stop the application with:

```bash
docker compose down
```

Add `--volumes` only when you also want to discard the local development
database.

## Demo accounts

All demo accounts use the password `Demo123!`.

| Role          | Email                | Suggested review path                    |
| ------------- | -------------------- | ---------------------------------------- |
| Administrator | `admin@example.com`  | Manage Rooms and inspect every Booking   |
| User          | `maksym@example.com` | Create a Booking and view My Bookings    |
| User          | `sofiia@example.com` | Compare occupied slots with owned detail |

## Architecture

```text
Browser
  |
  v
Angular web app / Nginx (:4200)
  |  /api
  v
NestJS REST API (:3000)
  |
  v
PostgreSQL 17 (:5432)
```

The Nx monorepo contains:

```text
apps/
|-- api/      # NestJS API, Prisma schema, migrations, and seed
|-- web/      # Angular application
`-- web-e2e/  # Playwright reviewer journeys
```

The web container serves the production Angular build and proxies `/api` to the
API container. Local Angular development uses the equivalent proxy in
`apps/web/proxy.conf.json`.

## Domain rules worth inspecting

- A Time Slot is half-open: a Booking ending at 10:00 does not overlap one
  starting at 10:00.
- Bookings start and end on 15-minute boundaries, last at least 15 minutes, fit
  fully within 08:00–20:00 Europe/Kyiv, and start in the future.
- Only Active Bookings occupy a Room and participate in overlap checks.
- Users can cancel only their own Future Active Bookings; Administrators can
  cancel any Future Active Booking.
- Other users' occupied slots are visible without exposing Booking Ownership.
- An Active Room cannot be deactivated while it has Future Active Bookings.
- Cancelled Bookings remain as history with a Cancellation Record.

## Local development

Requirements:

- Node.js 22.12 or newer
- npm 11.6.2
- Docker with Docker Compose

Install dependencies and create local environment files:

```bash
npm ci
cp apps/api/.env.example apps/api/.env.local
cp apps/api/.env.test.example apps/api/.env.test
```

Start and prepare the development database:

```bash
npm run db:start
npm run db:generate
npm run db:migrate
npm run db:seed
```

Run the API and web app in separate terminals:

```bash
npx nx serve api
npx nx serve web
```

The web app is at <http://localhost:4200>; the REST API is rooted at
<http://localhost:3000/api>.

The API reads `apps/api/.env.local` before `apps/api/.env`. Tests read
`apps/api/.env.test` before `apps/api/.env`. `JWT_SECRET` must be at least 32
characters and should be replaced with a random secret outside local review.

## Database commands

Migrations never run implicitly when an application container starts.

| Command                   | Purpose                                                |
| ------------------------- | ------------------------------------------------------ |
| `npm run db:start`        | Start development PostgreSQL at `localhost:5432`       |
| `npm run db:generate`     | Generate the Prisma Client                             |
| `npm run db:validate`     | Validate Prisma configuration and schema               |
| `npm run db:migrate`      | Apply committed development migrations                 |
| `npm run db:migrate:dev`  | Create and apply a migration while changing the schema |
| `npm run db:seed`         | Upsert repeatable demo data                            |
| `npm run db:stop`         | Stop development PostgreSQL                            |
| `npm run db:test:start`   | Start isolated test PostgreSQL at `localhost:5433`     |
| `npm run db:test:migrate` | Apply migrations to the test database                  |
| `npm run db:test:seed`    | Upsert test demo data                                  |
| `npm run db:test:stop`    | Stop test PostgreSQL                                   |

## Verification

Run the same checks represented in CI:

```bash
npm run db:test:start
npm run db:test:migrate
npm run db:test:seed
npm run lint
npm run typecheck
npm run test:unit
npm run test:api
npm run build
npx playwright install chromium
npm run e2e
npm run db:test:stop
```

The API tests and Playwright suite use the isolated PostgreSQL service. The
Playwright target migrates and reseeds that database, starts the API and Angular
development servers, and uses run-unique records.

Convenience commands:

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm test`             | Run all API and frontend tests           |
| `npm run e2e`          | Run required Playwright browser journeys |
| `npm run check`        | Lint, typecheck, test, and build         |
| `npm run format:check` | Check formatting for Nx-selected files   |
| `npm run graph`        | Inspect the Nx project graph             |

GitHub Actions installs from the lockfile, generates Prisma, migrates a
PostgreSQL service, runs lint and typechecking, separates frontend unit tests
from API integration tests, builds both applications, and finishes with the
required Chromium journeys.
