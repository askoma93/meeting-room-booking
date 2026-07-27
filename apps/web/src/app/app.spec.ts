import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { appRoutes } from './app.routes';
import { createAccessToken } from '../testing/access-token';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(appRoutes)],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('shows the regular navigation areas to a visitor', async () => {
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
    ).toEqual(['Rooms', 'My bookings']);
    expect(compiled.querySelector('a[href="/auth"]')?.textContent).toContain(
      'Sign in',
    );
  });

  it('clears the local session when the user signs out', async () => {
    localStorage.setItem('mrb.accessToken', createAccessToken('USER'));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    const button = (
      fixture.nativeElement as HTMLElement
    ).querySelector<HTMLButtonElement>('button.sign-in');
    expect(button?.textContent).toContain('Sign out');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'a[href="/administrator"]',
      ),
    ).toBeNull();

    button?.click();
    await fixture.whenStable();

    expect(localStorage.getItem('mrb.accessToken')).toBeNull();
  });

  it('shows the Administrator area only to an Administrator', async () => {
    localStorage.setItem('mrb.accessToken', createAccessToken('ADMINISTRATOR'));
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'a[href="/administrator"]',
      ),
    ).not.toBeNull();
  });
});
