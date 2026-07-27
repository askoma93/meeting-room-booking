import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { authorizationHeaders } from '../auth/authorization-headers';

export interface MyBooking {
  id: string;
  userId: string;
  roomId: string;
  startAt: string;
  endAt: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledAt: string | null;
  cancelledByUserId: string | null;
  canCancel: boolean;
  room: {
    name: string;
    location: string;
  };
}

@Injectable({ providedIn: 'root' })
export class MyBookingsApi {
  private readonly http = inject(HttpClient);

  list() {
    return this.http.get<MyBooking[]>('/api/bookings', {
      headers: authorizationHeaders(),
    });
  }

  cancel(bookingId: string) {
    return this.http.patch<MyBooking>(
      `/api/bookings/${bookingId}/cancel`,
      {},
      { headers: authorizationHeaders() },
    );
  }
}
