# Use Prisma with raw SQL for advanced constraints

The backend uses Prisma for schema management, migrations, and type-safe database access because it keeps the first version approachable and testable. If booking consistency needs PostgreSQL features that Prisma cannot express cleanly, such as exclusion constraints, those constraints will be added through raw SQL migrations rather than avoiding PostgreSQL's stronger consistency tools.
