# Meeting Room Booking

Meeting Room Booking is being built as an Nx monorepo for an Angular web
application and a NestJS API. The Angular shell currently provides the
route-level home for authentication, Rooms, My Bookings, and Administrator
flows. Booking behavior and database infrastructure arrive in later tickets.

## Requirements

- Node.js 22.12 or newer (an even-numbered LTS release is recommended)
- npm 11

## Setup

```bash
npm ci
npm run check
```

Start the Angular app at `http://localhost:4200`:

```bash
npx nx serve web
```

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
└── web/  # Angular application shell
```

Project decisions and domain vocabulary are recorded in
[`CONTEXT.md`](./CONTEXT.md) and [`docs/adr`](./docs/adr).
