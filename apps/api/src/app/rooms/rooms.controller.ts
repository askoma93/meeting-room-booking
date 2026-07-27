import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UserRole } from '../../generated/prisma/client';
import { Roles } from '../auth/roles.decorator';
import { CreateRoomDto } from './dto/create-room.dto';
import { ListRoomsQueryDto } from './dto/list-rooms-query.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('management')
  @Roles(UserRole.ADMINISTRATOR)
  listRoomsForManagement() {
    return this.roomsService.listRoomsForManagement();
  }

  @Get()
  listActiveRooms(@Query() query: ListRoomsQueryDto) {
    return this.roomsService.listActiveRooms(query);
  }

  @Post()
  @Roles(UserRole.ADMINISTRATOR)
  createRoom(@Body() room: CreateRoomDto) {
    return this.roomsService.createRoom(room);
  }

  @Patch(':roomId')
  @Roles(UserRole.ADMINISTRATOR)
  updateRoom(@Param('roomId') roomId: string, @Body() changes: UpdateRoomDto) {
    return this.roomsService.updateRoom(roomId, changes);
  }
}
