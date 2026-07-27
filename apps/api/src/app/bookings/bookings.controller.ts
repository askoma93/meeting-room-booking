import { Body, Controller, Post } from '@nestjs/common';
import { AuthUser } from '../auth/auth-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  createBooking(
    @AuthUser() user: AuthenticatedUser,
    @Body() booking: CreateBookingDto,
  ) {
    return this.bookingsService.createBooking(user.id, booking);
  }
}
