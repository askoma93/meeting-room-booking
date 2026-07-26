import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  it('shows the product navigation areas', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(
      compiled.querySelector('[aria-label="Primary navigation"]'),
    ).not.toBeNull();
    expect(
      Array.from(compiled.querySelectorAll('nav a')).map((link) =>
        link.getAttribute('aria-label'),
      ),
    ).toEqual(['Rooms', 'My bookings', 'Administrator']);
    expect(compiled.querySelector('a[href="/auth"]')?.textContent).toContain(
      'Sign in',
    );
  });
});
