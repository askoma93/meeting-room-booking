import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, Prisma } from '../../generated/prisma/client';
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
      select: {
        id: true,
        name: true,
        capacity: true,
        location: true,
        equipment: true,
      },
      orderBy: { name: 'asc' },
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

    if (room.isActive && changes.isActive === false) {
      const futureActiveBookingCount = await this.prisma.booking.count({
        where: {
          roomId,
          status: BookingStatus.ACTIVE,
          startAt: { gt: new Date() },
        },
      });

      if (futureActiveBookingCount > 0) {
        throw new ConflictException(
          'Room cannot be deactivated while it has future Active Bookings.',
        );
      }
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
        error.code === 'P2004'
      ) {
        throw new ConflictException(
          'Room cannot be deactivated while it has future Active Bookings.',
        );
      }

      throw error;
    }
  }
}
