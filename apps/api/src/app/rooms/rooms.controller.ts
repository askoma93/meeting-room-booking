import { Controller, Get, Query } from '@nestjs/common';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  listActiveRooms(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.listActiveRooms(query);
  }
}
