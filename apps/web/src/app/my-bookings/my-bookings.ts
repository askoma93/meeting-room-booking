import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MyBooking, MyBookingsApi } from './my-bookings-api';

@Component({
  selector: 'mrb-my-bookings',
  styleUrl: './my-bookings.scss',
  template: `
    <section class="area-page bookings-page" aria-labelledby="bookings-title">
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

      @if (statusMessage()) {
        <p class="booking-notice" role="status">{{ statusMessage() }}</p>
      }

      @if (loading()) {
        <div class="bookings-state" aria-live="polite">
          <span class="state-mark" aria-hidden="true">B</span>
          <p>Reading your Booking board…</p>
        </div>
      } @else if (loadError()) {
        <div class="bookings-state" role="alert">
          <span class="state-mark" aria-hidden="true">!</span>
          <div>
            <h2>Bookings could not be loaded</h2>
            <p>Check your connection or sign in again, then try once more.</p>
            <button
              class="retry-bookings"
              type="button"
              (click)="loadBookings()"
            >
              Try again
            </button>
          </div>
        </div>
      } @else if (bookings().length === 0) {
        <div class="bookings-state empty">
          <span class="state-mark" aria-hidden="true">B</span>
          <div>
            <h2>No Bookings on your board</h2>
            <p>
              Book an Active Room and its Time Slot will appear here with your
              history.
            </p>
          </div>
        </div>
      } @else {
        <div class="ledger-heading">
          <div>
            <p class="eyebrow">Your schedule ledger</p>
            <h2>Active and Cancelled Bookings</h2>
          </div>
          <p>
            <strong>{{ activeCount() }}</strong> active
            <span aria-hidden="true">·</span>
            <strong>{{ cancelledCount() }}</strong> cancelled
          </p>
        </div>

        @if (actionError()) {
          <p class="action-error" role="alert">{{ actionError() }}</p>
        }

        <ol class="booking-ledger">
          @for (booking of bookings(); track booking.id) {
            <li
              class="booking-entry"
              [class.is-cancelled]="booking.status === 'CANCELLED'"
              [class.is-started]="isStarted(booking)"
            >
              <div class="time-rail">
                <time [attr.datetime]="booking.startAt">
                  <strong>{{ formatDay(booking.startAt) }}</strong>
                  <span>{{ formatTimeSlot(booking) }}</span>
                </time>
              </div>

              <article>
                <header>
                  <div>
                    <span class="booking-status">
                      {{ statusLabel(booking) }}
                    </span>
                    <h3>{{ booking.room.name }}</h3>
                    <p>{{ booking.room.location }}</p>
                  </div>

                  @if (canCancel(booking)) {
                    <button
                      class="cancel-booking"
                      type="button"
                      [disabled]="cancellingId() === booking.id"
                      [attr.aria-label]="
                        'Cancel booking for ' +
                        booking.room.name +
                        ' on ' +
                        formatDay(booking.startAt)
                      "
                      (click)="cancelBooking(booking)"
                    >
                      {{
                        cancellingId() === booking.id
                          ? 'Cancelling…'
                          : 'Cancel booking'
                      }}
                    </button>
                  }
                </header>

                <dl>
                  <div>
                    <dt>Time Slot</dt>
                    <dd>{{ formatTimeSlot(booking) }}</dd>
                  </div>
                  <div>
                    <dt>Booking status</dt>
                    <dd>{{ statusLabel(booking) }}</dd>
                  </div>
                  @if (booking.cancelledAt) {
                    <div>
                      <dt>Cancellation Record</dt>
                      <dd>{{ formatCancellation(booking.cancelledAt) }}</dd>
                    </div>
                  }
                </dl>
              </article>
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class MyBookings implements OnInit {
  private readonly myBookingsApi = inject(MyBookingsApi);
  protected readonly bookings = signal<MyBooking[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly actionError = signal('');
  protected readonly statusMessage = signal('');
  protected readonly cancellingId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadBookings();
  }

  protected loadBookings(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.myBookingsApi
      .list()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (bookings) => this.bookings.set(bookings),
        error: () => {
          this.bookings.set([]);
          this.loadError.set(true);
        },
      });
  }

  protected cancelBooking(booking: MyBooking): void {
    this.actionError.set('');
    this.statusMessage.set('');
    this.cancellingId.set(booking.id);
    this.myBookingsApi
      .cancel(booking.id)
      .pipe(finalize(() => this.cancellingId.set(null)))
      .subscribe({
        next: (cancelledBooking) => {
          this.bookings.update((bookings) =>
            bookings.map((current) =>
              current.id === cancelledBooking.id ? cancelledBooking : current,
            ),
          );
          this.statusMessage.set(
            `Booking cancelled. ${booking.room.name} is available for this Time Slot again.`,
          );
        },
        error: () =>
          this.actionError.set(
            'Booking could not be cancelled. It may have already started or been cancelled. Refresh the page and try again.',
          ),
      });
  }

  protected activeCount(): number {
    return this.bookings().filter(({ status }) => status === 'ACTIVE').length;
  }

  protected cancelledCount(): number {
    return this.bookings().filter(({ status }) => status === 'CANCELLED')
      .length;
  }

  protected canCancel(booking: MyBooking): boolean {
    return booking.canCancel;
  }

  protected isStarted(booking: MyBooking): boolean {
    return booking.status === 'ACTIVE' && !booking.canCancel;
  }

  protected statusLabel(booking: MyBooking): string {
    if (booking.status === 'CANCELLED') {
      return 'Cancelled';
    }
    return this.isStarted(booking) ? 'Started' : 'Active';
  }

  protected formatDay(date: string): string {
    return dayFormatter.format(new Date(date));
  }

  protected formatTimeSlot(booking: MyBooking): string {
    return `${timeFormatter.format(new Date(booking.startAt))}–${timeFormatter.format(new Date(booking.endAt))}`;
  }

  protected formatCancellation(date: string): string {
    return cancellationFormatter.format(new Date(date));
  }
}

const officeTimeZone = 'Europe/Kyiv';
const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const cancellationFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
