import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApi } from './auth-api';

@Component({
  selector: 'mrb-auth',
  styleUrl: './auth.scss',
  template: `
    <section class="area-page" aria-labelledby="auth-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Account access</p>
          <h1 id="auth-title">Sign in</h1>
          <p class="lede">
            Use your work account to open the Active Room board.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">AUTH / 00</span>
      </header>

      <div class="auth-workspace">
        <form class="sign-in-form" (submit)="signIn($event)">
          <h2>Welcome back</h2>

          <label for="email">
            Email
            <input
              id="email"
              name="email"
              type="email"
              autocomplete="email"
              required
            />
          </label>

          <label for="password">
            Password
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
            />
          </label>

          <button type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Signing in…' : 'Sign in' }}
          </button>

          @if (errorMessage()) {
            <p class="form-error" role="alert">{{ errorMessage() }}</p>
          }
        </form>

        <aside class="access-note" aria-labelledby="demo-account-title">
          <h2 id="demo-account-title">Reviewer access</h2>
          <p>
            The seeded account opens the same room data and permissions used by
            the API.
          </p>
          <div class="demo-account">
            <span><strong>Administrator</strong></span>
            <code>admin@example.com</code>
            <code>Demo123!</code>
          </div>
        </aside>
      </div>
    </section>
  `,
})
export class Auth {
  private readonly authApi = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected signIn(event: SubmitEvent): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const email = data.get('email')?.toString() ?? '';
    const password = data.get('password')?.toString() ?? '';

    this.submitting.set(true);
    this.errorMessage.set('');
    this.authApi
      .login(email, password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: (session) => {
          localStorage.setItem('mrb.accessToken', session.accessToken);
          void this.router.navigateByUrl('/rooms');
        },
        error: () =>
          this.errorMessage.set(
            'Email or password is incorrect. Check both fields and try again.',
          ),
      });
  }
}
