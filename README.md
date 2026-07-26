# Meeting Room Booking

Meeting Room Booking is being built as an Nx monorepo for an Angular web
application and a NestJS API. The repository currently contains only the
workspace foundation; product applications, booking behavior, and database
infrastructure arrive in later tickets.

## Requirements

- Node.js 22.12 or newer (an even-numbered LTS release is recommended)
- npm 11

## Setup

```bash
npm ci
npm run check
```

The baseline commands pass before projects are added. As `apps/web` and
`apps/api` arrive, Nx will automatically run each command against the projects
that expose its matching target.

| Command                | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `npm run lint`         | Lint every project with a `lint` target            |
| `npm run typecheck`    | Type-check every project with a `typecheck` target |
| `npm test`             | Test every project with a `test` target            |
| `npm run build`        | Build every project with a `build` target          |
| `npm run check`        | Run all four baseline verification commands        |
| `npm run graph`        | Open the Nx project graph                          |
| `npm run format:check` | Check formatting for files selected by Nx          |

## Next workspace steps

Install each Nx plugin when its application ticket starts, keeping all Nx
package versions aligned:

```bash
npx nx add @nx/angular
npx nx generate @nx/angular:application apps/web

npx nx add @nx/nest
npx nx generate @nx/nest:application apps/api
```

The intended application layout is:

```text
apps/
├── web/  # Angular application
└── api/  # NestJS application
```

Project decisions and domain vocabulary are recorded in
[`CONTEXT.md`](./CONTEXT.md) and [`docs/adr`](./docs/adr).
