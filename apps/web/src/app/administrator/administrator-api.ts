import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { authorizationHeaders } from '../auth/authorization-headers';

export interface ManagedRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  isActive: boolean;
}

export interface EditableRoomFields {
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
}

export interface ManagedBooking {
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
  user: {
    id: string;
    name: string;
    email: string;
  };
  cancelledBy: {
    id: string;
    name: string;
    email: string;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class AdministratorApi {
  private readonly http = inject(HttpClient);

  listRooms() {
    return this.http.get<ManagedRoom[]>('/api/rooms/management', {
      headers: authorizationHeaders(),
    });
  }

  listBookings() {
    return this.http.get<ManagedBooking[]>('/api/bookings/management', {
      headers: authorizationHeaders(),
    });
  }

  createRoom(room: EditableRoomFields) {
    return this.http.post<ManagedRoom>('/api/rooms', room, {
      headers: authorizationHeaders(),
    });
  }

  updateRoom(
    roomId: string,
    changes: Partial<EditableRoomFields & { isActive: boolean }>,
  ) {
    return this.http.patch<ManagedRoom>(`/api/rooms/${roomId}`, changes, {
      headers: authorizationHeaders(),
    });
  }

  cancelBooking(bookingId: string) {
    return this.http.patch<ManagedBooking>(
      `/api/bookings/${bookingId}/cancel`,
      {},
      { headers: authorizationHeaders() },
    );
  }
}
