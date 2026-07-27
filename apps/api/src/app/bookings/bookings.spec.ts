import type { AddressInfo } from 'node:net';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AppModule } from '../app.module';
import { configureApi } from '../configure-api';

describe('Bookings API', () => {
  let app: INestApplication;
  let baseUrl: string;
  let prisma: PrismaService;
  let accessToken: string;
  let administratorAccessToken: string;
  let administratorId: string;
  let userId: string;
  let otherUserId: string;
  let activeRoomId: string;
  let inactiveRoomId: string;

  const userEmail = 'creator@bookings.example.com';
  const administratorEmail = 'administrator@bookings.example.com';
  const otherUserEmail = 'other-user@bookings.example.com';
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

    const administratorRegistration = await fetch(
      `${baseUrl}/api/auth/register`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: administratorEmail,
          password: 'ValidPass123!',
        }),
      },
    );
    const administratorSession = (await administratorRegistration.json()) as {
      user: { id: string };
    };
    administratorId = administratorSession.user.id;
    await prisma.user.update({
      where: { id: administratorId },
      data: { role: UserRole.ADMINISTRATOR },
    });
    const administratorLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: administratorEmail,
        password: 'ValidPass123!',
      }),
    });
    administratorAccessToken = (
      (await administratorLogin.json()) as { accessToken: string }
    ).accessToken;

    const otherUser = await prisma.user.create({
      data: {
        email: otherUserEmail,
        name: 'Other User',
        passwordHash: 'not-used-in-this-test',
      },
      select: { id: true },
    });
    otherUserId = otherUser.id;
  });

  afterEach(async () => {
    await prisma.booking.deleteMany({ where: { roomId: activeRoomId } });
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({
      where: { roomId: { in: [activeRoomId, inactiveRoomId] } },
    });
    await prisma.room.deleteMany({ where: { name: { in: roomNames } } });
    await prisma.user.deleteMany({
      where: {
        email: { in: [userEmail, administratorEmail, otherUserEmail] },
      },
    });
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

  it('shows a User their own Active and Cancelled Bookings without exposing another User booking', async () => {
    const activeSlot = futureSlot(9, 0, 30);
    const cancelledSlot = futureSlot(10, 0, 30);
    const otherUserSlot = futureSlot(11, 0, 30);
    const cancelledAt = new Date();

    await Promise.all([
      prisma.booking.create({
        data: {
          userId,
          roomId: activeRoomId,
          ...dates(activeSlot),
        },
      }),
      prisma.booking.create({
        data: {
          userId,
          roomId: activeRoomId,
          ...dates(cancelledSlot),
          status: 'CANCELLED',
          cancelledAt,
          cancelledByUserId: userId,
        },
      }),
      prisma.booking.create({
        data: {
          userId: otherUserId,
          roomId: activeRoomId,
          ...dates(otherUserSlot),
        },
      }),
    ]);

    const response = await request('/api/bookings');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        userId,
        roomId: activeRoomId,
        startAt: activeSlot.startAt,
        status: 'ACTIVE',
        canCancel: true,
        cancelledAt: null,
        cancelledByUserId: null,
        room: expect.objectContaining({ name: roomNames[0] }),
      }),
      expect.objectContaining({
        userId,
        roomId: activeRoomId,
        startAt: cancelledSlot.startAt,
        status: 'CANCELLED',
        canCancel: false,
        cancelledAt: cancelledAt.toISOString(),
        cancelledByUserId: userId,
      }),
    ]);
  });

  it('lets an Administrator inspect every Booking with Booking Ownership details', async () => {
    const userSlot = futureSlot(9, 0, 30);
    const otherUserSlot = futureSlot(10, 0, 30);
    await Promise.all([
      prisma.booking.create({
        data: {
          userId,
          roomId: activeRoomId,
          ...dates(userSlot),
        },
      }),
      prisma.booking.create({
        data: {
          userId: otherUserId,
          roomId: activeRoomId,
          ...dates(otherUserSlot),
        },
      }),
    ]);

    const response = await administratorRequest('/api/bookings/management');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId,
          startAt: userSlot.startAt,
          user: {
            id: userId,
            name: expect.any(String),
            email: userEmail,
          },
        }),
        expect.objectContaining({
          userId: otherUserId,
          startAt: otherUserSlot.startAt,
          user: {
            id: otherUserId,
            name: 'Other User',
            email: otherUserEmail,
          },
        }),
      ]),
    );
  });

  it('rejects Booking oversight for a regular User', async () => {
    const response = await request('/api/bookings/management');

    expect(response.status).toBe(403);
  });

  it('lets an Administrator cancel another User Future Active Booking and records the Administrator', async () => {
    const otherUserBooking = await prisma.booking.create({
      data: {
        userId: otherUserId,
        roomId: activeRoomId,
        ...dates(futureSlot(13, 0, 30)),
      },
    });

    const response = await administratorRequest(
      `/api/bookings/${otherUserBooking.id}/cancel`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      id: otherUserBooking.id,
      userId: otherUserId,
      status: 'CANCELLED',
      canCancel: false,
      cancelledAt: expect.any(String),
      cancelledByUserId: administratorId,
      cancelledBy: {
        id: administratorId,
        name: expect.any(String),
        email: administratorEmail,
      },
    });
  });

  it('lets a User cancel their own Future Active Booking and releases its Time Slot', async () => {
    const slot = futureSlot(12, 0, 30);
    const created = await createBooking({ roomId: activeRoomId, ...slot });
    const booking = (await created.json()) as { id: string };

    const cancellation = await request(`/api/bookings/${booking.id}/cancel`, {
      method: 'PATCH',
    });

    expect(cancellation.status).toBe(200);
    await expect(cancellation.json()).resolves.toMatchObject({
      id: booking.id,
      status: 'CANCELLED',
      canCancel: false,
      cancelledAt: expect.any(String),
      cancelledByUserId: userId,
    });
    expect(
      (
        await createBooking({
          roomId: activeRoomId,
          ...slot,
        })
      ).status,
    ).toBe(201);
  });

  it("masks another User's Booking as not found", async () => {
    const otherUserBooking = await prisma.booking.create({
      data: {
        userId: otherUserId,
        roomId: activeRoomId,
        ...dates(futureSlot(13, 0, 30)),
      },
    });

    const response = await request(
      `/api/bookings/${otherUserBooking.id}/cancel`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      message: 'Booking not found.',
    });
  });

  it('rejects cancellation of an already Cancelled Booking', async () => {
    const cancelledBooking = await prisma.booking.create({
      data: {
        userId,
        roomId: activeRoomId,
        ...dates(futureSlot(14, 0, 30)),
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledByUserId: userId,
      },
    });

    const response = await request(
      `/api/bookings/${cancelledBooking.id}/cancel`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(400);
  });

  it('rejects cancellation after an Active Booking has started', async () => {
    const startAt = new Date(Date.now() + 1_000);
    const startedBooking = await prisma.booking.create({
      data: {
        userId,
        roomId: activeRoomId,
        startAt,
        endAt: new Date(startAt.getTime() + 15 * 60_000),
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1_100));

    const response = await request(
      `/api/bookings/${startedBooking.id}/cancel`,
      { method: 'PATCH' },
    );

    expect(response.status).toBe(400);
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

  function request(path: string, init: RequestInit = {}): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    });
  }

  function administratorRequest(
    path: string,
    init: RequestInit = {},
  ): Promise<Response> {
    return fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${administratorAccessToken}`,
        ...init.headers,
      },
    });
  }

  function dates(slot: { startAt: string; endAt: string }): {
    startAt: Date;
    endAt: Date;
  } {
    return {
      startAt: new Date(slot.startAt),
      endAt: new Date(slot.endAt),
    };
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
