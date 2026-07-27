import { Route } from '@angular/router';
import { Administrator } from './administrator/administrator';
import { Auth } from './auth/auth';
import { MyBookings } from './my-bookings/my-bookings';
import { Rooms } from './rooms/rooms';
import { RoomDetail } from './rooms/room-detail';

export const appRoutes: Route[] = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'rooms',
  },
  {
    path: 'auth',
    component: Auth,
    title: 'Sign in · Room board',
  },
  {
    path: 'rooms',
    component: Rooms,
    title: 'Rooms · Room board',
  },
  {
    path: 'rooms/:roomId',
    component: RoomDetail,
    title: 'Room availability · Room board',
  },
  {
    path: 'my-bookings',
    component: MyBookings,
    title: 'My bookings · Room board',
  },
  {
    path: 'administrator',
    component: Administrator,
    title: 'Administrator · Room board',
  },
  {
    path: '**',
    redirectTo: 'rooms',
  },
];
