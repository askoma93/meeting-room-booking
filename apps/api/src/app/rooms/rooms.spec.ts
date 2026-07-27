import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AppModule } from '../app.module';
import { configureApi } from '../configure-api';

describe('Rooms API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  let accessToken: string;

  const roomNames = [
    'API Filter Match',
    'API Fails Capacity',
    'API Fails Equipment',
    'API Fails Location',
    'API Inactive Match',
  ];

  beforeAll(async () => {
    const testingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = testingModule.createNestApplication();
    configureApi(app);
    await app.listen(0);

    prisma = app.get(PrismaService);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;

    await prisma.room.createMany({
      data: [
        {
          name: roomNames[0],
          capacity: 10,
          location: 'Floor 3 · East wing',
          equipment: ['Display', 'Video conferencing'],
          isActive: true,
        },
        {
          name: roomNames[1],
          capacity: 4,
          location: 'Floor 3 · East wing',
          equipment: ['Display', 'Video conferencing'],
          isActive: true,
        },
        {
          name: roomNames[2],
          capacity: 10,
          location: 'Floor 3 · East wing',
          equipment: ['Display'],
          isActive: true,
        },
        {
          name: roomNames[3],
          capacity: 10,
          location: 'Floor 1 · East wing',
          equipment: ['Display', 'Video conferencing'],
          isActive: true,
        },
        {
          name: roomNames[4],
          capacity: 12,
          location: 'Floor 3 · East wing',
          equipment: ['Display', 'Video conferencing'],
          isActive: false,
        },
      ],
    });

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'browser@rooms.example.com',
        password: 'ValidPass123!',
      }),
    });
    const session = (await registerResponse.json()) as { accessToken: string };
    accessToken = session.accessToken;
  });

  afterAll(async () => {
    await prisma.room.deleteMany({ where: { name: { in: roomNames } } });
    await prisma.user.deleteMany({
      where: { email: 'browser@rooms.example.com' },
    });
    await app.close();
  });

  it('shows authenticated Users only Active Rooms', async () => {
    const response = await getRooms();

    expect(response.status).toBe(200);
    const rooms = (await response.json()) as Array<{
      name: string;
      isActive?: boolean;
    }>;
    expect(rooms.map((room) => room.name)).toEqual(
      expect.arrayContaining(roomNames.slice(0, 4)),
    );
    expect(rooms.map((room) => room.name)).not.toContain(roomNames[4]);
    expect(rooms.every((room) => room.isActive === undefined)).toBe(true);
  });

  it('filters Active Rooms by minimum capacity, equipment, and location', async () => {
    const response = await getRooms(
      '?minCapacity=8&equipment=Video%20conferencing&location=floor%203',
    );

    expect(response.status).toBe(200);
    const rooms = (await response.json()) as Array<{ name: string }>;
    expect(rooms.map((room) => room.name)).toContain(roomNames[0]);
    expect(rooms.map((room) => room.name)).not.toEqual(
      expect.arrayContaining(roomNames.slice(1)),
    );
  });

  function getRooms(query = ''): Promise<Response> {
    return fetch(`${baseUrl}/api/rooms${query}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
  }
});
