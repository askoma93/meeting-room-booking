import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthSessionStore } from './auth-session';

export const authFailureInterceptor: HttpInterceptorFn = (request, next) => {
  const authSession = inject(AuthSessionStore);
  const router = inject(Router);

  return next(request).pipe(
    catchError((error: unknown) => {
      const authenticationFailed =
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !request.url.startsWith('/api/auth/');
      if (authenticationFailed) {
        authSession.close();
        void router.navigateByUrl('/auth');
      }
      return throwError(() => error);
    }),
  );
};
