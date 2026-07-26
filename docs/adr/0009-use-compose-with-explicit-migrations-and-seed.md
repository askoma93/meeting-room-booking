# Use Docker Compose with explicit migrations and seed

The project provides Docker Compose for PostgreSQL, the API, and the web app, while local development can still run Angular and NestJS directly against the Dockerized database. Database migrations and seed data are run through explicit README commands rather than hidden container startup behavior, so setup remains understandable and CI-friendly.
