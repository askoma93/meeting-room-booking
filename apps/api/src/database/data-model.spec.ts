import { BookingStatus, Prisma, UserRole } from '../generated/prisma/client';

describe('persisted meeting room booking model', () => {
  it('exposes Users, Rooms, and Bookings through Prisma', () => {
    expect(Object.values(Prisma.ModelName).sort()).toEqual([
      'Booking',
      'Room',
      'User',
    ]);
  });

  it('represents User and Administrator roles', () => {
    expect(Object.values(UserRole)).toEqual(['USER', 'ADMINISTRATOR']);
  });

  it('persists a password hash for email/password authentication', () => {
    const administrator = {
      name: 'Demo Administrator',
      email: 'admin@example.com',
      passwordHash: '$2b$12$example',
      role: UserRole.ADMINISTRATOR,
    } satisfies Prisma.UserCreateInput;

    expect(administrator.passwordHash).toBe('$2b$12$example');
  });

  it('represents Active and Cancelled Booking states', () => {
    expect(Object.values(BookingStatus)).toEqual(['ACTIVE', 'CANCELLED']);
  });

  it('accepts cancellation metadata on a Cancelled Booking', () => {
    const cancelledBooking = {
      id: '00000000-0000-4000-8000-000000000001',
      userId: '00000000-0000-4000-8000-000000000002',
      roomId: '00000000-0000-4000-8000-000000000003',
      startAt: new Date('2030-01-14T10:00:00.000Z'),
      endAt: new Date('2030-01-14T10:30:00.000Z'),
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date('2030-01-13T10:00:00.000Z'),
      cancelledByUserId: '00000000-0000-4000-8000-000000000002',
    } satisfies Prisma.BookingUncheckedCreateInput;

    expect(cancelledBooking.cancelledByUserId).toBe(
      '00000000-0000-4000-8000-000000000002',
    );
  });
});
