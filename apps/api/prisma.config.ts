import path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { resolveDatabaseUrl } from './src/database/database-environment';

const workspaceRoot = path.resolve(__dirname, '../..');
const isTest = process.env.NODE_ENV === 'test';

loadEnvironment({
  path: isTest
    ? [
        path.join(__dirname, '.env.test'),
        path.join(workspaceRoot, '.env.test'),
        path.join(__dirname, '.env'),
        path.join(workspaceRoot, '.env'),
      ]
    : [
        path.join(__dirname, '.env.local'),
        path.join(workspaceRoot, '.env.local'),
        path.join(__dirname, '.env'),
        path.join(workspaceRoot, '.env'),
      ],
  quiet: true,
});

export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  migrations: {
    path: path.join(__dirname, 'prisma/migrations'),
    seed: 'tsx apps/api/src/database/seed.ts',
  },
  datasource: {
    url: resolveDatabaseUrl(),
  },
});
