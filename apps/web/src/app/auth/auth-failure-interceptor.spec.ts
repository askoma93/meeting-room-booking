import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { createAccessToken } from '../../testing/access-token';
import { authFailureInterceptor } from './auth-failure-interceptor';
import { AuthSessionStore } from './auth-session';

describe('authFailureInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authFailureInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('closes the session and returns to sign in after a protected 401', () => {
    const authSession = TestBed.inject(AuthSessionStore);
    authSession.open({
      accessToken: createAccessToken(),
      user: {
        id: 'user-id',
        email: 'user@example.com',
        name: 'Test User',
        role: 'USER',
      },
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');

    let responseError: unknown;
    TestBed.inject(HttpClient)
      .get('/api/rooms')
      .subscribe({ error: (error: unknown) => (responseError = error) });
    TestBed.inject(HttpTestingController)
      .expectOne('/api/rooms')
      .flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authSession.isAuthenticated()).toBe(false);
    expect(responseError).toBeInstanceOf(HttpErrorResponse);
    expect(localStorage.getItem('mrb.accessToken')).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/auth');
  });
});
