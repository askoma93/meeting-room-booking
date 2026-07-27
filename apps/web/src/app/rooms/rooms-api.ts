import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface RoomSummary {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
}

export interface RoomFilters {
  minCapacity?: number;
  equipment?: string;
  location?: string;
}

export interface OccupiedTimeSlot {
  startAt: string;
  endAt: string;
}

@Injectable({ providedIn: 'root' })
export class RoomsApi {
  private readonly http = inject(HttpClient);

  list(filters: RoomFilters = {}) {
    let params = new HttpParams();

    if (filters.minCapacity !== undefined) {
      params = params.set('minCapacity', filters.minCapacity);
    }
    if (filters.equipment) {
      params = params.set('equipment', filters.equipment);
    }
    if (filters.location) {
      params = params.set('location', filters.location);
    }

    return this.http.get<RoomSummary[]>('/api/rooms', {
      headers: this.authorizationHeaders(),
      params,
    });
  }

  get(roomId: string) {
    return this.http.get<RoomSummary>(`/api/rooms/${roomId}`, {
      headers: this.authorizationHeaders(),
    });
  }

  getAvailability(roomId: string, date: string) {
    return this.http.get<OccupiedTimeSlot[]>(
      `/api/rooms/${roomId}/availability`,
      {
        headers: this.authorizationHeaders(),
        params: new HttpParams().set('date', date),
      },
    );
  }

  createBooking(
    roomId: string,
    booking: { startAt: string; endAt: string },
  ) {
    return this.http.post(
      '/api/bookings',
      { roomId, ...booking },
      { headers: this.authorizationHeaders() },
    );
  }

  private authorizationHeaders(): HttpHeaders | undefined {
    const accessToken = localStorage.getItem('mrb.accessToken');
    return accessToken
      ? new HttpHeaders({ authorization: `Bearer ${accessToken}` })
      : undefined;
  }
}
