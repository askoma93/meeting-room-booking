import { Component } from '@angular/core';
import { AreaPlaceholder } from '../area-placeholder/area-placeholder';

@Component({
  selector: 'mrb-my-bookings',
  imports: [AreaPlaceholder],
  template: `
    <section class="area-page" aria-labelledby="bookings-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Booking history</p>
          <h1 id="bookings-title">My bookings</h1>
          <p class="lede">
            Keep track of your future active bookings and cancelled booking
            history.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">BOOKINGS / 02</span>
      </header>

      <mrb-area-placeholder rail="YOUR TIME" mark="B">
        <h2>Your bookings will appear here</h2>
        <p>
          Future bookings and booking history will stay together in this area.
        </p>
      </mrb-area-placeholder>
    </section>
  `,
})
export class MyBookings {}
