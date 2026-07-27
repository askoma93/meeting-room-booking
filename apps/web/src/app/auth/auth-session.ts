import {
  DestroyRef,
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { AuthSession } from './auth-api';

const accessTokenKey = 'mrb.accessToken';

type UserRole = AuthSession['user']['role'];

interface SessionState {
  accessToken: string | null;
  expiresAt: number | null;
  role: UserRole | null;
}

interface JwtPayload {
  exp: number;
  role: UserRole;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionStore {
  private readonly destroyRef = inject(DestroyRef);
  private readonly state = signal(readStoredSession());
  private expirationTimer: number | undefined;

  readonly isAuthenticated = computed(() => Boolean(this.state().accessToken));
  readonly isAdministrator = computed(
    () => this.state().role === 'ADMINISTRATOR',
  );

  constructor() {
    this.scheduleExpiration(this.state().expiresAt);
    this.destroyRef.onDestroy(() => this.clearExpirationTimer());
  }

  open(session: AuthSession): void {
    const payload = readJwtPayload(session.accessToken);
    if (!payload || payload.exp * 1000 <= Date.now()) {
      this.close();
      return;
    }

    localStorage.setItem(accessTokenKey, session.accessToken);
    const expiresAt = payload.exp * 1000;
    this.state.set({
      accessToken: session.accessToken,
      expiresAt,
      role: session.user.role,
    });
    this.scheduleExpiration(expiresAt);
  }

  close(): void {
    localStorage.removeItem(accessTokenKey);
    this.clearExpirationTimer();
    this.state.set({ accessToken: null, expiresAt: null, role: null });
  }

  private scheduleExpiration(expiresAt: number | null): void {
    this.clearExpirationTimer();
    if (expiresAt === null) {
      return;
    }

    this.expirationTimer = window.setTimeout(
      () => this.close(),
      Math.max(0, expiresAt - Date.now()),
    );
  }

  private clearExpirationTimer(): void {
    if (this.expirationTimer !== undefined) {
      window.clearTimeout(this.expirationTimer);
      this.expirationTimer = undefined;
    }
  }
}

function readStoredSession(): SessionState {
  const accessToken = localStorage.getItem(accessTokenKey);
  if (!accessToken) {
    return { accessToken: null, expiresAt: null, role: null };
  }

  const payload = readJwtPayload(accessToken);
  if (!payload || payload.exp * 1000 <= Date.now()) {
    localStorage.removeItem(accessTokenKey);
    return { accessToken: null, expiresAt: null, role: null };
  }

  return {
    accessToken,
    expiresAt: payload.exp * 1000,
    role: payload.role,
  };
}

function readJwtPayload(accessToken: string): JwtPayload | null {
  try {
    const encodedPayload = accessToken.split('.')[1];
    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=');
    const payload = JSON.parse(atob(normalizedPayload)) as Partial<JwtPayload>;
    const validRole =
      payload.role === 'USER' || payload.role === 'ADMINISTRATOR';
    return typeof payload.exp === 'number' && validRole
      ? { exp: payload.exp, role: payload.role as UserRole }
      : null;
  } catch {
    return null;
  }
}
