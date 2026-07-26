import { Component } from '@angular/core';
import { AreaPlaceholder } from '../area-placeholder/area-placeholder';

@Component({
  selector: 'mrb-administrator',
  imports: [AreaPlaceholder],
  template: `
    <section class="area-page" aria-labelledby="administrator-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Office operations</p>
          <h1 id="administrator-title">Administrator</h1>
          <p class="lede">
            Manage rooms and oversee future active bookings across the office.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">ADMIN / 03</span>
      </header>

      <mrb-area-placeholder rail="CONTROL" mark="A">
        <h2>Room controls will live here</h2>
        <p>
          Room management, booking oversight, and administrative cancellations
          will share this workspace.
        </p>
      </mrb-area-placeholder>
    </section>
  `,
})
export class Administrator {}
