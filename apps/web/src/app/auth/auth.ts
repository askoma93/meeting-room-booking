import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthApi } from './auth-api';
import { AuthSessionStore } from './auth-session';

type AuthMode = 'sign-in' | 'register';

const authModeContent = {
  'sign-in': {
    title: 'Sign in',
    lede: 'Use your work email to open the Active Room board.',
    formTitle: 'Welcome back',
    submittingLabel: 'Signing in…',
    submitLabel: 'Sign in',
    passwordAutocomplete: 'current-password',
  },
  register: {
    title: 'Register',
    lede: 'Register as a User and start booking Active Rooms.',
    formTitle: 'Your details',
    submittingLabel: 'Registering…',
    submitLabel: 'Register',
    passwordAutocomplete: 'new-password',
  },
} as const satisfies Record<AuthMode, Record<string, string>>;

@Component({
  selector: 'mrb-auth',
  styleUrl: './auth.scss',
  template: `
    <section class="area-page" aria-labelledby="auth-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">User access</p>
          <h1 id="auth-title">{{ content().title }}</h1>
          <p class="lede">{{ content().lede }}</p>
        </div>
        <span class="area-code" aria-hidden="true">AUTH / 00</span>
      </header>

      <div class="auth-workspace">
        <form class="auth-form" (submit)="submit($event)">
          <fieldset class="auth-mode">
            <legend>Choose access method</legend>
            <button
              type="button"
              [class.is-active]="mode() === 'sign-in'"
              [attr.aria-pressed]="mode() === 'sign-in'"
              (click)="selectMode('sign-in')"
            >
              Sign in
            </button>
            <button
              type="button"
              [class.is-active]="mode() === 'register'"
              [attr.aria-pressed]="mode() === 'register'"
              (click)="selectMode('register')"
            >
              Register
            </button>
          </fieldset>

          <h2>{{ content().formTitle }}</h2>

          @if (mode() === 'register') {
            <label for="name">
              Name <span class="optional-field">(optional)</span>
              <input
                id="name"
                name="name"
                type="text"
                autocomplete="name"
                maxlength="100"
              />
            </label>
          }

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
              [attr.autocomplete]="content().passwordAutocomplete"
              minlength="8"
              maxlength="72"
              required
            />
          </label>

          <button type="submit" [disabled]="submitting()">
            {{
              submitting() ? content().submittingLabel : content().submitLabel
            }}
          </button>

          @if (errorMessage()) {
            <p class="form-error" role="alert">{{ errorMessage() }}</p>
          }
        </form>

        <aside class="access-note" aria-labelledby="demo-account-title">
          <h2 id="demo-account-title">Reviewer access</h2>
          <p>
            The seeded User opens the same Room data and permissions used by the
            API.
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
  private readonly authSession = inject(AuthSessionStore);
  private readonly router = inject(Router);

  protected readonly mode = signal<AuthMode>('sign-in');
  protected readonly content = computed(() => authModeContent[this.mode()]);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected selectMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set('');
  }

  protected submit(event: SubmitEvent): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const name = data.get('name')?.toString() ?? '';
    const email = data.get('email')?.toString() ?? '';
    const password = data.get('password')?.toString() ?? '';
    const mode = this.mode();
    const request =
      mode === 'sign-in'
        ? this.authApi.login(email, password)
        : this.authApi.register(name, email, password);

    this.submitting.set(true);
    this.errorMessage.set('');
    request.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (session) => {
        this.authSession.open(session);
        void this.router.navigateByUrl('/rooms');
      },
      error: (error: unknown) => {
        const registrationConflict =
          mode === 'register' &&
          error instanceof HttpErrorResponse &&
          error.status === 409;
        this.errorMessage.set(
          registrationConflict
            ? 'A User with this email already exists. Sign in instead.'
            : mode === 'sign-in'
              ? 'Email or password is incorrect. Check both fields and try again.'
              : 'Registration failed. Check the fields and try again.',
        );
      },
    });
  }
}
