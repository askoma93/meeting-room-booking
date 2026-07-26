import { Route } from '@angular/router';
import { Administrator } from './administrator/administrator';
import { Auth } from './auth/auth';
import { MyBookings } from './my-bookings/my-bookings';
import { Rooms } from './rooms/rooms';

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
