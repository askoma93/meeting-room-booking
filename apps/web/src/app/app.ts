import { Component, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthSessionStore } from './auth/auth-session';

@Component({
  imports: [RouterModule],
  selector: 'mrb-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly authSession = inject(AuthSessionStore);
  private readonly router = inject(Router);

  protected readonly isAuthenticated = this.authSession.isAuthenticated;
  protected readonly isAdministrator = this.authSession.isAdministrator;

  protected signOut(): void {
    this.authSession.close();
    void this.router.navigateByUrl('/auth');
  }
}
