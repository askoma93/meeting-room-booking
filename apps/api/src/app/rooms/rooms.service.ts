import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ListRoomsQueryDto } from './dto/list-rooms-query.dto';

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
}
