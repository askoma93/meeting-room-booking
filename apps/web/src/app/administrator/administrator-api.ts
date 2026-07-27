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

@Injectable({ providedIn: 'root' })
export class AdministratorApi {
  private readonly http = inject(HttpClient);

  listRooms() {
    return this.http.get<ManagedRoom[]>('/api/rooms/management', {
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
}
