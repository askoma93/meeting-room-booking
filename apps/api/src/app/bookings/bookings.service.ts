import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
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
