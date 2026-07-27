import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../../database/prisma.service';
import { AppModule } from '../app.module';
import { configureApi } from '../configure-api';

describe('Booking creation API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let activeRoomId: string;
  let inactiveRoomId: string;

  const userEmail = 'creator@bookings.example.com';
  const roomNames = ['API Booking Room', 'API Inactive Booking Room'];

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

    const [activeRoom, inactiveRoom] = await Promise.all([
      prisma.room.create({
        data: {
          name: roomNames[0],
          capacity: 8,
          location: 'Floor 4',
          equipment: [],
        },
      }),
      prisma.room.create({
        data: {
          name: roomNames[1],
          capacity: 8,
          location: 'Floor 4',
          equipment: [],
          isActive: false,
        },
      }),
    ]);
    activeRoomId = activeRoom.id;
    inactiveRoomId = inactiveRoom.id;

    const response = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: userEmail,
        password: 'ValidPass123!',
      }),
    });
    const session = (await response.json()) as {
      accessToken: string;
      user: { id: string };
    };
    accessToken = session.accessToken;
    userId = session.user.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { roomId: activeRoomId } });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { roomId: { in: [activeRoomId, inactiveRoomId] } },
    });
    await prisma.room.deleteMany({ where: { name: { in: roomNames } } });
    await prisma.user.deleteMany({ where: { email: userEmail } });
    await app.close();
  });

  it('lets a User create a Future Booking for an Active Room', async () => {
    const slot = futureSlot(10, 0, 30);

    const response = await createBooking({ roomId: activeRoomId, ...slot });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: expect.any(String),
      roomId: activeRoomId,
      userId,
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: 'ACTIVE',
    });
  });

  it('rejects an overlapping Active Booking with 409 while allowing adjacent Time Slots', async () => {
    const firstSlot = futureSlot(10, 0, 30);
    expect(
      (await createBooking({ roomId: activeRoomId, ...firstSlot })).status,
    ).toBe(201);

    const overlapping = await createBooking({
      roomId: activeRoomId,
      ...futureSlot(10, 15, 30),
    });
    const adjacent = await createBooking({
      roomId: activeRoomId,
      ...futureSlot(10, 30, 30),
    });

    expect(overlapping.status).toBe(409);
    expect(adjacent.status).toBe(201);
  });

  it('allows only one of two concurrent requests for the same Time Slot', async () => {
    const slot = futureSlot(11, 0, 30);

    const responses = await Promise.all([
      createBooking({ roomId: activeRoomId, ...slot }),
      createBooking({ roomId: activeRoomId, ...slot }),
    ]);

    expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
  });

  it.each([
    ['an invalid time', { startAt: 'not-a-time', endAt: 'also-not-a-time' }],
    ['an inverted Time Slot', futureSlot(12, 0, -15)],
    ['a non-15-minute boundary', futureSlot(12, 1, 30)],
    ['a too-short Booking', futureSlot(12, 0, 10)],
    ['a Booking outside Booking Hours', futureSlot(3, 0, 30)],
    [
      'a past start',
      {
        startAt: '2020-01-01T10:00:00.000Z',
        endAt: '2020-01-01T10:30:00.000Z',
      },
    ],
  ])('rejects %s with 400', async (_caseName, slot) => {
    const response = await createBooking({ roomId: activeRoomId, ...slot });

    expect(response.status).toBe(400);
  });

  it('does not allow a User to book a deactivated Room', async () => {
    const response = await createBooking({
      roomId: inactiveRoomId,
      ...futureSlot(14, 0, 30),
    });

    expect(response.status).toBe(404);
  });

  function createBooking(booking: {
    roomId: string;
    startAt: string;
    endAt: string;
  }): Promise<Response> {
    return fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(booking),
    });
  }

  function futureSlot(
    utcHour: number,
    utcMinute: number,
    durationMinutes: number,
  ): { startAt: string; endAt: string } {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 7);
    start.setUTCHours(utcHour, utcMinute, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60_000);

    return { startAt: start.toISOString(), endAt: end.toISOString() };
  }
});
