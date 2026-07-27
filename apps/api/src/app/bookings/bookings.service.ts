import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { CreateBookingDto } from './dto/create-booking.dto';

const bookingGranularityMilliseconds = 15 * 60 * 1000;
const bookingHoursStartMinutes = 8 * 60;
const bookingHoursEndMinutes = 20 * 60;
const officeTimeZone = 'Europe/Kyiv';
const bookingOverlapGuard = 'Booking_no_overlapping_active_bookings';
const bookingActiveRoomGuard = 'Booking_active_room_guard';
const bookingFutureStartGuard = 'Booking_future_start_guard';
const bookingOverlapConflict =
  'The Room already has an Active Booking that overlaps this Time Slot.';
const bookingDetailsSelect = {
  id: true,
  userId: true,
  roomId: true,
  startAt: true,
  endAt: true,
  status: true,
  cancelledAt: true,
  cancelledByUserId: true,
  room: {
    select: {
      name: true,
      location: true,
    },
  },
} satisfies Prisma.BookingSelect;
const managedBookingDetailsSelect = {
  ...bookingDetailsSelect,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  cancelledBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.BookingSelect;

const officeTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: officeTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBooking(userId: string, booking: CreateBookingDto) {
    const startAt = new Date(booking.startAt);
    const endAt = new Date(booking.endAt);
    validateTimeSlot(startAt, endAt);

    const room = await this.prisma.room.findFirst({
      where: { id: booking.roomId, isActive: true },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException('Active Room not found.');
    }

    try {
      validateFutureStart(startAt);

      return await this.prisma.booking.create({
        data: {
          userId,
          roomId: room.id,
          startAt,
          endAt,
        },
        select: {
          id: true,
          userId: true,
          roomId: true,
          startAt: true,
          endAt: true,
          status: true,
        },
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2039'
      ) {
        if (error.message.includes(bookingOverlapGuard)) {
          throw new ConflictException(bookingOverlapConflict);
        }

        if (error.message.includes(bookingActiveRoomGuard)) {
          throw new NotFoundException('Active Room not found.');
        }

        if (error.message.includes(bookingFutureStartGuard)) {
          throw new BadRequestException(
            'A Future Booking must start later than the current time.',
          );
        }
      }

      throw error;
    }
  }

  async listMyBookings(userId: string) {
    const checkedAt = new Date();
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      select: bookingDetailsSelect,
      orderBy: { startAt: 'asc' },
    });

    return bookings.map((booking) =>
      withCancellationEligibility(booking, checkedAt),
    );
  }

  async listBookingsForManagement() {
    const checkedAt = new Date();
    const bookings = await this.prisma.booking.findMany({
      select: managedBookingDetailsSelect,
      orderBy: { startAt: 'asc' },
    });

    return bookings.map((booking) =>
      withCancellationEligibility(booking, checkedAt),
    );
  }

  async cancelBooking(
    user: Pick<AuthenticatedUser, 'id' | 'role'>,
    bookingId: string,
  ) {
    const cancelledAt = new Date();
    const bookingAccessFilter =
      user.role === UserRole.ADMINISTRATOR ? {} : { userId: user.id };
    const cancellation = await this.prisma.booking.updateMany({
      where: {
        id: bookingId,
        ...bookingAccessFilter,
        status: 'ACTIVE',
        startAt: { gt: cancelledAt },
      },
      data: {
        status: 'CANCELLED',
        cancelledAt,
        cancelledByUserId: user.id,
      },
    });

    if (cancellation.count === 0) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: bookingId, ...bookingAccessFilter },
        select: { status: true, startAt: true },
      });

      if (!booking) {
        throw new NotFoundException('Booking not found.');
      }

      throw new BadRequestException(
        booking.status === 'CANCELLED'
          ? 'A Cancelled Booking cannot be cancelled again.'
          : 'A Booking cannot be cancelled after its Time Slot has started.',
      );
    }

    const booking =
      user.role === UserRole.ADMINISTRATOR
        ? await this.prisma.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: managedBookingDetailsSelect,
          })
        : await this.prisma.booking.findUniqueOrThrow({
            where: { id: bookingId },
            select: bookingDetailsSelect,
          });

    return withCancellationEligibility(booking, cancelledAt);
  }
}

type BookingDetails = Prisma.BookingGetPayload<{
  select: typeof bookingDetailsSelect;
}>;

function withCancellationEligibility(booking: BookingDetails, checkedAt: Date) {
  return {
    ...booking,
    canCancel:
      booking.status === 'ACTIVE' &&
      booking.startAt.getTime() > checkedAt.getTime(),
  };
}

function validateTimeSlot(startAt: Date, endAt: Date): void {
  validateFutureStart(startAt);

  if (
    startAt.getTime() % bookingGranularityMilliseconds !== 0 ||
    endAt.getTime() % bookingGranularityMilliseconds !== 0
  ) {
    throw new BadRequestException(
      'Booking start and end must be on 15-minute boundaries.',
    );
  }

  if (endAt.getTime() - startAt.getTime() < bookingGranularityMilliseconds) {
    throw new BadRequestException(
      'A Booking must be at least 15 minutes long.',
    );
  }

  const localStart = officeTimeParts(startAt);
  const localEnd = officeTimeParts(endAt);
  const isSameLocalDay = localStart.date === localEnd.date;
  const startsInsideBookingHours =
    localStart.minutes >= bookingHoursStartMinutes;
  const endsInsideBookingHours = localEnd.minutes <= bookingHoursEndMinutes;

  if (!isSameLocalDay || !startsInsideBookingHours || !endsInsideBookingHours) {
    throw new BadRequestException(
      'A Booking must fit within Booking Hours from 08:00 to 20:00 Europe/Kyiv.',
    );
  }
}

function validateFutureStart(startAt: Date): void {
  if (startAt.getTime() <= Date.now()) {
    throw new BadRequestException(
      'A Future Booking must start later than the current time.',
    );
  }
}

function officeTimeParts(date: Date): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    officeTimeFormatter
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}
