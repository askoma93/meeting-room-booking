import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  BookingStatus,
  PrismaClient,
  UserRole,
} from '../generated/prisma/client';

const connectionString =
  process.env.DATABASE_URL ??
  (process.env.NODE_ENV === 'test'
    ? 'postgresql://meeting_room_test:meeting_room_test@localhost:5433/meeting_room_booking_test?schema=public'
    : 'postgresql://meeting_room:meeting_room@localhost:5432/meeting_room_booking?schema=public');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const demoPassword = 'Demo123!';

const users = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Anna Kovalenko',
    email: 'admin@example.com',
    role: UserRole.ADMINISTRATOR,
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Maksym Bondarenko',
    email: 'maksym@example.com',
    role: UserRole.USER,
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Sofiia Melnyk',
    email: 'sofiia@example.com',
    role: UserRole.USER,
  },
];

const rooms = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Dnipro',
    capacity: 4,
    location: 'Floor 2 · East wing',
    equipment: ['Display', 'Whiteboard'],
    isActive: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    name: 'Hoverla',
    capacity: 8,
    location: 'Floor 2 · West wing',
    equipment: ['Display', 'Video conferencing', 'Whiteboard'],
    isActive: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    name: 'Kyiv',
    capacity: 12,
    location: 'Floor 3 · North wing',
    equipment: ['Projector', 'Video conferencing', 'Speakerphone'],
    isActive: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    name: 'Lviv',
    capacity: 6,
    location: 'Floor 3 · South wing',
    equipment: ['Display', 'Whiteboard'],
    isActive: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    name: 'Odesa',
    capacity: 10,
    location: 'Floor 4 · East wing',
    equipment: ['Projector', 'Video conferencing'],
    isActive: true,
  },
  {
    id: '20000000-0000-4000-8000-000000000006',
    name: 'Podil',
    capacity: 2,
    location: 'Floor 1 · Lobby',
    equipment: ['Display'],
    isActive: false,
  },
];

function futureUtcTime(
  referenceDate: Date,
  dayOffset: number,
  hour: number,
  minute = 0,
): Date {
  const date = new Date(referenceDate);
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(hour, minute, 0, 0);
  return date;
}

async function seed(): Promise<void> {
  const passwordHash = await hash(demoPassword, 12);

  await prisma.$transaction(async (transaction) => {
    const seededUsers = await Promise.all(
      users.map(({ id, ...user }) =>
        transaction.user.upsert({
          where: { email: user.email },
          create: { id, ...user, passwordHash },
          update: { ...user, passwordHash },
        }),
      ),
    );

    const seededRooms = await Promise.all(
      rooms.map(({ id, ...room }) =>
        transaction.room.upsert({
          where: { name: room.name },
          create: { id, ...room },
          update: room,
        }),
      ),
    );

    const [administrator, maksym, sofiia] = seededUsers;
    const [dnipro, hoverla, kyiv] = seededRooms;
    const referenceDate = new Date();
    const cancelledAt = referenceDate;

    const bookings = [
      {
        id: '30000000-0000-4000-8000-000000000001',
        userId: maksym.id,
        roomId: dnipro.id,
        startAt: futureUtcTime(referenceDate, 1, 10),
        endAt: futureUtcTime(referenceDate, 1, 11),
        status: BookingStatus.ACTIVE,
        cancelledAt: null,
        cancelledByUserId: null,
      },
      {
        id: '30000000-0000-4000-8000-000000000002',
        userId: sofiia.id,
        roomId: dnipro.id,
        startAt: futureUtcTime(referenceDate, 1, 11),
        endAt: futureUtcTime(referenceDate, 1, 11, 30),
        status: BookingStatus.ACTIVE,
        cancelledAt: null,
        cancelledByUserId: null,
      },
      {
        id: '30000000-0000-4000-8000-000000000003',
        userId: maksym.id,
        roomId: hoverla.id,
        startAt: futureUtcTime(referenceDate, 2, 13, 15),
        endAt: futureUtcTime(referenceDate, 2, 14),
        status: BookingStatus.ACTIVE,
        cancelledAt: null,
        cancelledByUserId: null,
      },
      {
        id: '30000000-0000-4000-8000-000000000004',
        userId: sofiia.id,
        roomId: kyiv.id,
        startAt: futureUtcTime(referenceDate, 3, 9, 30),
        endAt: futureUtcTime(referenceDate, 3, 10, 15),
        status: BookingStatus.CANCELLED,
        cancelledAt,
        cancelledByUserId: sofiia.id,
      },
      {
        id: '30000000-0000-4000-8000-000000000005',
        userId: maksym.id,
        roomId: kyiv.id,
        startAt: futureUtcTime(referenceDate, 4, 15),
        endAt: futureUtcTime(referenceDate, 4, 16),
        status: BookingStatus.CANCELLED,
        cancelledAt,
        cancelledByUserId: administrator.id,
      },
    ];

    await Promise.all(
      bookings.map(({ id, ...booking }) =>
        transaction.booking.upsert({
          where: { id },
          create: { id, ...booking },
          update: booking,
        }),
      ),
    );
  });
}

seed()
  .then(() => {
    console.log(
      `Seeded ${users.length} Users, ${rooms.length} Rooms, and 5 Bookings.`,
    );
  })
  .catch((error: unknown) => {
    console.error('Failed to seed demo data.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
