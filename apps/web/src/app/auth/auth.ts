import { Component } from '@angular/core';
import { AreaPlaceholder } from '../area-placeholder/area-placeholder';

@Component({
  selector: 'mrb-auth',
  imports: [AreaPlaceholder],
  template: `
    <section class="area-page" aria-labelledby="auth-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Account access</p>
          <h1 id="auth-title">Sign in</h1>
          <p class="lede">
            Use your work account to book rooms and manage bookings.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">AUTH / 00</span>
      </header>

      <mrb-area-placeholder rail="ACCESS" mark="ID">
        <h2>Authentication will live here</h2>
        <p>
          Email and password access will connect this shell to your bookings and
          role.
        </p>
      </mrb-area-placeholder>
    </section>
  `,
})
export class Auth {}
