# Use Nx monorepo

The project uses an Nx monorepo with separate Angular and NestJS applications because the goal is to demonstrate a realistic full-stack workspace with shared tooling, project boundaries, and CI-friendly commands. The first version keeps the workspace small, with `apps/web`, `apps/api`, and only minimal shared libraries when they remove real duplication.
