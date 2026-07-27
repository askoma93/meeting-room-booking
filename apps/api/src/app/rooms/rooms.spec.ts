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
  let userAccessToken: string;
  let administratorAccessToken: string;
  let registeredUserId: string;

  const roomNames = [
    'API Filter Match',
    'API Fails Capacity',
    'API Fails Equipment',
    'API Fails Location',
    'API Inactive Match',
  ];
  const managedRoomNames = [
    'API Managed Room',
    'API Managed Room Updated',
    'API Deactivation Guard',
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
    const session = (await registerResponse.json()) as {
      accessToken: string;
      user: { id: string };
    };
    userAccessToken = session.accessToken;
    registeredUserId = session.user.id;

    const administratorLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'Demo123!',
      }),
    });
    const administratorSession = (await administratorLogin.json()) as {
      accessToken: string;
    };
    administratorAccessToken = administratorSession.accessToken;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { room: { name: { in: managedRoomNames } } },
    });
    await prisma.room.deleteMany({
      where: { name: { in: [...roomNames, ...managedRoomNames] } },
    });
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

  it('lets an Administrator create, edit, deactivate, and reactivate a Room without deleting it', async () => {
    const createResponse = await fetch(`${baseUrl}/api/rooms`, {
      method: 'POST',
      headers: administratorHeaders(),
      body: JSON.stringify({
        name: 'API Managed Room',
        capacity: 14,
        location: 'Floor 5 · North wing',
        equipment: ['Display', 'Speakerphone'],
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdRoom = (await createResponse.json()) as {
      id: string;
      isActive: boolean;
    };
    expect(createdRoom).toMatchObject({
      id: expect.any(String),
      isActive: true,
    });

    const editResponse = await fetch(`${baseUrl}/api/rooms/${createdRoom.id}`, {
      method: 'PATCH',
      headers: administratorHeaders(),
      body: JSON.stringify({
        name: 'API Managed Room Updated',
        capacity: 16,
        location: 'Floor 5 · South wing',
        equipment: ['Projector', 'Video conferencing'],
        isActive: false,
      }),
    });

    expect(editResponse.status).toBe(200);
    await expect(editResponse.json()).resolves.toMatchObject({
      id: createdRoom.id,
      name: 'API Managed Room Updated',
      capacity: 16,
      location: 'Floor 5 · South wing',
      equipment: ['Projector', 'Video conferencing'],
      isActive: false,
    });

    const managementResponse = await fetch(`${baseUrl}/api/rooms/management`, {
      headers: administratorHeaders(),
    });
    expect(managementResponse.status).toBe(200);
    const managedRooms = (await managementResponse.json()) as Array<{
      id: string;
      isActive: boolean;
    }>;
    expect(managedRooms).toContainEqual(
      expect.objectContaining({
        id: createdRoom.id,
        isActive: false,
      }),
    );

    const reactivateResponse = await fetch(
      `${baseUrl}/api/rooms/${createdRoom.id}`,
      {
        method: 'PATCH',
        headers: administratorHeaders(),
        body: JSON.stringify({ isActive: true }),
      },
    );
    expect(reactivateResponse.status).toBe(200);
    await expect(reactivateResponse.json()).resolves.toMatchObject({
      id: createdRoom.id,
      isActive: true,
    });
  });

  it('rejects regular Users from Administrator Room management actions', async () => {
    const responses = await Promise.all([
      fetch(`${baseUrl}/api/rooms/management`, {
        headers: userHeaders(),
      }),
      fetch(`${baseUrl}/api/rooms`, {
        method: 'POST',
        headers: userHeaders(),
        body: JSON.stringify({
          name: 'User Managed Room',
          capacity: 2,
          location: 'Floor 1',
          equipment: [],
        }),
      }),
      fetch(`${baseUrl}/api/rooms/${roomNames[0]}`, {
        method: 'PATCH',
        headers: userHeaders(),
        body: JSON.stringify({ isActive: false }),
      }),
    ]);

    expect(responses.map((response) => response.status)).toEqual([
      403, 403, 403,
    ]);
  });

  it('keeps an Active Room active while it has a future Active Booking', async () => {
    const room = await prisma.room.create({
      data: {
        name: 'API Deactivation Guard',
        capacity: 4,
        location: 'Floor 2',
        equipment: [],
      },
    });
    await prisma.booking.create({
      data: {
        roomId: room.id,
        userId: registeredUserId,
        startAt: new Date(Date.now() + 60 * 60 * 1000),
        endAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      },
    });

    const response = await fetch(`${baseUrl}/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: administratorHeaders(),
      body: JSON.stringify({ isActive: false }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      message:
        'Room cannot be deactivated while it has future Active Bookings.',
    });
    await expect(
      prisma.room.findUniqueOrThrow({ where: { id: room.id } }),
    ).resolves.toMatchObject({ isActive: true });
  });

  function getRooms(query = ''): Promise<Response> {
    return fetch(`${baseUrl}/api/rooms${query}`, {
      headers: userHeaders(),
    });
  }

  function userHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${userAccessToken}`,
      'content-type': 'application/json',
    };
  }

  function administratorHeaders(): Record<string, string> {
    return {
      authorization: `Bearer ${administratorAccessToken}`,
      'content-type': 'application/json',
    };
  }
});
