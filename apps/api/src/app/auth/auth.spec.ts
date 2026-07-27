import type { AddressInfo } from 'node:net';
import { Controller, Get, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppModule } from '../app.module';
import { configureApi } from '../configure-api';
import { Roles } from './roles.decorator';

@Controller('role-check')
class RoleCheckController {
  @Get('administrator')
  @Roles(UserRole.ADMINISTRATOR)
  administratorOnly(): { permitted: true } {
    return { permitted: true };
  }
}

describe('Auth API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [RoleCheckController],
    }).compile();

    app = testingModule.createNestApplication();
    configureApi(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { endsWith: '@auth.example.com' } },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a visitor as a regular User', async () => {
    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'new-user@auth.example.com',
        password: 'ValidPass123!',
        role: 'ADMINISTRATOR',
      }),
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      accessToken: expect.any(String),
      user: {
        id: expect.any(String),
        email: 'new-user@auth.example.com',
        name: 'new-user',
        role: 'USER',
      },
    });
  });

  it('logs in a registered User and authenticates subsequent requests', async () => {
    await registerUser('login-user@auth.example.com');

    const loginResponse = await login(
      'login-user@auth.example.com',
      'ValidPass123!',
    );
    expect(loginResponse.status).toBe(200);
    const session = (await loginResponse.json()) as {
      accessToken: string;
      user: { role: string };
    };
    expect(session.user.role).toBe('USER');

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { authorization: `Bearer ${session.accessToken}` },
    });

    expect(meResponse.status).toBe(200);
    await expect(meResponse.json()).resolves.toMatchObject({
      email: 'login-user@auth.example.com',
      role: 'USER',
    });
  });

  it('logs in the seeded Administrator', async () => {
    const response = await login('admin@example.com', 'Demo123!');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      accessToken: expect.any(String),
      user: {
        email: 'admin@example.com',
        role: 'ADMINISTRATOR',
      },
    });
  });

  it('rejects unauthenticated requests to protected routes', async () => {
    const [missingToken, invalidToken] = await Promise.all([
      fetch(`${baseUrl}/api/auth/me`),
      fetch(`${baseUrl}/api/auth/me`, {
        headers: { authorization: 'Bearer not-a-valid-token' },
      }),
    ]);

    expect(missingToken.status).toBe(401);
    expect(invalidToken.status).toBe(401);
  });

  it('allows only Administrators through Administrator role checks', async () => {
    await registerUser('role-user@auth.example.com');
    const userSession = (await (
      await login('role-user@auth.example.com', 'ValidPass123!')
    ).json()) as { accessToken: string };
    const administratorSession = (await (
      await login('admin@example.com', 'Demo123!')
    ).json()) as { accessToken: string };

    const userResponse = await fetch(
      `${baseUrl}/api/role-check/administrator`,
      {
        headers: { authorization: `Bearer ${userSession.accessToken}` },
      },
    );
    const administratorResponse = await fetch(
      `${baseUrl}/api/role-check/administrator`,
      {
        headers: {
          authorization: `Bearer ${administratorSession.accessToken}`,
        },
      },
    );

    expect(userResponse.status).toBe(403);
    expect(administratorResponse.status).toBe(200);
    await expect(administratorResponse.json()).resolves.toEqual({
      permitted: true,
    });
  });

  async function registerUser(email: string): Promise<Response> {
    return fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password: 'ValidPass123!' }),
    });
  }

  async function login(email: string, password: string): Promise<Response> {
    return fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }
});
