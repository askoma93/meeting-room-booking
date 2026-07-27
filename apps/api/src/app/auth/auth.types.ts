import type { UserRole } from '../../generated/prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  user: AuthenticatedUser;
}
