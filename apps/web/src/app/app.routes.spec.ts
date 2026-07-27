import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { appRoutes } from './app.routes';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(appRoutes)],
    });
  });

  it('opens the Rooms area at the default product route', async () => {
    const harness = await RouterTestingHarness.create('/rooms');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Rooms');
  });

  it('opens a Room detail booking page', async () => {
    const harness = await RouterTestingHarness.create('/rooms/room-1');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Room');
  });

  it('redirects the workspace entry route to Rooms', async () => {
    const harness = await RouterTestingHarness.create('/');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Rooms');
  });

  it('opens the authentication area', async () => {
    const harness = await RouterTestingHarness.create('/auth');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Sign in');
  });

  it('opens the user booking area', async () => {
    const harness = await RouterTestingHarness.create('/my-bookings');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('My bookings');
  });

  it('opens the Administrator area', async () => {
    const harness = await RouterTestingHarness.create('/administrator');

    expect(
      harness.routeNativeElement?.querySelector('h1')?.textContent,
    ).toContain('Administrator');
  });
});
