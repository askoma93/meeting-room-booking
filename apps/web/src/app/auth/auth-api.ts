import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface AuthSession {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'USER' | 'ADMINISTRATOR';
  };
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);

  register(name: string, email: string, password: string) {
    return this.http.post<AuthSession>('/api/auth/register', {
      email,
      password,
      ...(name.trim() ? { name } : {}),
    });
  }

  login(email: string, password: string) {
    return this.http.post<AuthSession>('/api/auth/login', { email, password });
  }
}
