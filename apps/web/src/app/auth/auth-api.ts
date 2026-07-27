import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

interface AuthSession {
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

  login(email: string, password: string) {
    return this.http.post<AuthSession>('/api/auth/login', { email, password });
  }
}
