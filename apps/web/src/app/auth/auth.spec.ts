import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { createAccessToken } from '../../testing/access-token';
import { Auth } from './auth';

describe('Auth', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Auth],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('registers a visitor, stores the session, and opens the Room board', async () => {
    const fixture = TestBed.createComponent(Auth);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('button'));
    buttons.find((button) => button.textContent?.includes('Register'))?.click();
    fixture.detectChanges();

    setInputValue(element, '#email', 'reviewer@example.com');
    setInputValue(element, '#password', 'Demo123!');
    element
      .querySelector('form')
      ?.dispatchEvent(
        new SubmitEvent('submit', { bubbles: true, cancelable: true }),
      );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/auth/register',
    );
    expect(request.request.body).toEqual({
      email: 'reviewer@example.com',
      password: 'Demo123!',
    });
    const accessToken = createAccessToken('USER');
    request.flush({
      accessToken,
      user: {
        id: 'user-id',
        email: 'reviewer@example.com',
        name: 'E2E Reviewer',
        role: 'USER',
      },
    });
    await fixture.whenStable();

    expect(localStorage.getItem('mrb.accessToken')).toBe(accessToken);
    expect(navigate).toHaveBeenCalledWith('/rooms');
  });
});

function setInputValue(
  element: HTMLElement,
  selector: string,
  value: string,
): void {
  const input = element.querySelector<HTMLInputElement>(selector);
  if (!input) {
    throw new Error(`Missing input: ${selector}`);
  }
  input.value = value;
}
