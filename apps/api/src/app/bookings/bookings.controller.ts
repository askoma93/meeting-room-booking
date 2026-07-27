import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
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

  @Get()
  listMyBookings(@AuthUser() user: AuthenticatedUser) {
    return this.bookingsService.listMyBookings(user.id);
  }

  @Patch(':bookingId/cancel')
  cancelMyBooking(
    @AuthUser() user: AuthenticatedUser,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.cancelMyBooking(user.id, bookingId);
  }
}
