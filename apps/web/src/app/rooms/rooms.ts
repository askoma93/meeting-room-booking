import { Component } from '@angular/core';

@Component({
  selector: 'mrb-rooms',
  template: `
    <section class="area-page" aria-labelledby="rooms-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Kyiv office · 08:00–20:00</p>
          <h1 id="rooms-title">Rooms</h1>
          <p class="lede">Find an active room that fits your next time slot.</p>
        </div>
        <span class="area-code" aria-hidden="true">ROOMS / 01</span>
      </header>

      <div class="placeholder-panel">
        <div class="schedule-rail" aria-hidden="true">
          <span>08</span>
          <span>12</span>
          <span>16</span>
          <span>20</span>
        </div>
        <div class="empty-copy">
          <span class="empty-mark" aria-hidden="true">R</span>
          <h2>Room availability will live here</h2>
          <p>
            Browse capacity, location, and equipment, then choose a time slot in
            15-minute increments.
          </p>
        </div>
      </div>
    </section>
  `,
})
export class Rooms {}
