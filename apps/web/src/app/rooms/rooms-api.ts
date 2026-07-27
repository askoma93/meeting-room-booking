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

    const accessToken = localStorage.getItem('mrb.accessToken');
    const headers = accessToken
      ? new HttpHeaders({ authorization: `Bearer ${accessToken}` })
      : undefined;

    return this.http.get<RoomSummary[]>('/api/rooms', { headers, params });
  }
}
