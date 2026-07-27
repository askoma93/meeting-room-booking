import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface ManagedRoom {
  id: string;
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
  isActive: boolean;
}

export interface RoomDetails {
  name: string;
  capacity: number;
  location: string;
  equipment: string[];
}

@Injectable({ providedIn: 'root' })
export class AdministratorApi {
  private readonly http = inject(HttpClient);

  listRooms() {
    return this.http.get<ManagedRoom[]>('/api/rooms/management', {
      headers: this.authorizationHeaders(),
    });
  }

  createRoom(room: RoomDetails) {
    return this.http.post<ManagedRoom>('/api/rooms', room, {
      headers: this.authorizationHeaders(),
    });
  }

  updateRoom(
    roomId: string,
    changes: Partial<RoomDetails & { isActive: boolean }>,
  ) {
    return this.http.patch<ManagedRoom>(`/api/rooms/${roomId}`, changes, {
      headers: this.authorizationHeaders(),
    });
  }

  private authorizationHeaders(): HttpHeaders {
    const accessToken = localStorage.getItem('mrb.accessToken');
    return accessToken
      ? new HttpHeaders({ authorization: `Bearer ${accessToken}` })
      : new HttpHeaders();
  }
}
