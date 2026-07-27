import { TestBed } from '@angular/core/testing';
import { createAccessToken } from '../../testing/access-token';
import { AuthSessionStore } from './auth-session';

describe('AuthSessionStore', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('restores a valid Administrator session', () => {
    localStorage.setItem(
      'mrb.accessToken',
      createAccessToken('ADMINISTRATOR', 3600),
    );

    const store = TestBed.inject(AuthSessionStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isAdministrator()).toBe(true);
  });

  it('removes an expired JWT session', () => {
    localStorage.setItem('mrb.accessToken', createAccessToken('USER', -1));

    const store = TestBed.inject(AuthSessionStore);

    expect(store.isAuthenticated()).toBe(false);
    expect(store.isAdministrator()).toBe(false);
    expect(localStorage.getItem('mrb.accessToken')).toBeNull();
  });
});
