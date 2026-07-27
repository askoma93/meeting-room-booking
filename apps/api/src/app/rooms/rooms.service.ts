import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type { CreateRoomDto } from './dto/create-room.dto';
import type { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import type { UpdateRoomDto } from './dto/update-room.dto';

const managedRoomSelect = {
  id: true,
  name: true,
  capacity: true,
  location: true,
  equipment: true,
  isActive: true,
} satisfies Prisma.RoomSelect;

const roomDeactivationConflict =
  'Room cannot be deactivated while it has future Active Bookings.';
const officeTimeZone = 'Europe/Kyiv';
const officeDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: officeTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const activeRoomSelect = {
  id: true,
  name: true,
  capacity: true,
  location: true,
  equipment: true,
} satisfies Prisma.RoomSelect;

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveRooms({ minCapacity, equipment, location }: ListRoomsQueryDto) {
    return this.prisma.room.findMany({
      where: {
        isActive: true,
        capacity: minCapacity === undefined ? undefined : { gte: minCapacity },
        equipment:
          equipment === undefined || equipment.length === 0
            ? undefined
            : { hasEvery: equipment },
        location:
          location === undefined
            ? undefined
            : { contains: location, mode: 'insensitive' },
      },
      select: activeRoomSelect,
      orderBy: { name: 'asc' },
    });
  }

  async getActiveRoom(roomId: string) {
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, isActive: true },
      select: activeRoomSelect,
    });

    if (!room) {
      throw new NotFoundException('Active Room not found.');
    }

    return room;
  }

  async getRoomAvailability(roomId: string, date: string) {
    await this.getActiveRoom(roomId);
    const startOfDay = officeDateTimeToUtc(date, 0);
    const endOfDay = officeDateTimeToUtc(date, 1);

    return this.prisma.booking.findMany({
      where: {
        roomId,
        status: 'ACTIVE',
        startAt: { lt: endOfDay },
        endAt: { gt: startOfDay },
      },
      select: {
        startAt: true,
        endAt: true,
      },
      orderBy: { startAt: 'asc' },
    });
  }

  listRoomsForManagement() {
    return this.prisma.room.findMany({
      select: managedRoomSelect,
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    });
  }

  createRoom(room: CreateRoomDto) {
    return this.prisma.room.create({
      data: room,
      select: managedRoomSelect,
    });
  }

  async updateRoom(roomId: string, changes: UpdateRoomDto) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, isActive: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    try {
      return await this.prisma.room.update({
        where: { id: roomId },
        data: changes,
        select: managedRoomSelect,
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2039' &&
        error.message.includes(roomDeactivationConflict)
      ) {
        throw new ConflictException(roomDeactivationConflict);
      }

      throw error;
    }
  }
}

function officeDateTimeToUtc(date: string, dayOffset: number): Date {
  const [year, month, day] = date.split('-').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day + dayOffset);
  let candidate = targetWallTime;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      officeDateTimeFormatter
        .formatToParts(new Date(candidate))
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, value]),
    );
    const representedWallTime = Date.UTC(
      Number(parts['year']),
      Number(parts['month']) - 1,
      Number(parts['day']),
      Number(parts['hour']),
      Number(parts['minute']),
      Number(parts['second']),
    );
    candidate += targetWallTime - representedWallTime;
  }

  return new Date(candidate);
}
