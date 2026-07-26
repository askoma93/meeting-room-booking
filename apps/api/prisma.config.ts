import path from 'node:path';
import { config as loadEnvironment } from 'dotenv';
import { defineConfig } from 'prisma/config';

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
  },
  datasource: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://meeting_room:meeting_room@localhost:5432/meeting_room_booking?schema=public',
  },
});
