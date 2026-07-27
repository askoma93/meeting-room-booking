import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { AdministratorApi, ManagedBooking } from './administrator-api';

@Component({
  selector: 'mrb-booking-oversight',
  styleUrl: './booking-oversight.scss',
  template: `
    <section
      class="booking-oversight"
      aria-labelledby="booking-oversight-title"
    >
      <div class="booking-oversight-heading">
        <div>
          <p class="form-mode">Booking oversight</p>
          <h2 id="booking-oversight-title">Booking ledger</h2>
          <p>
            Review Booking Ownership and record Administrative Cancellation for
            any Future Active Booking.
          </p>
        </div>
        <span>{{ bookings().length }} records</span>
      </div>

      @if (statusMessage()) {
        <p class="booking-status-message" role="status">
          {{ statusMessage() }}
        </p>
      }
      @if (actionError()) {
        <p class="booking-action-error" role="alert">
          {{ actionError() }}
        </p>
      }

      @if (loading()) {
        <div class="booking-state" aria-live="polite">
          Opening Booking ledger…
        </div>
      } @else if (loadError()) {
        <div class="booking-state" role="alert">
          <p>The Booking ledger could not be loaded.</p>
          <button type="button" (click)="loadBookings()">Try again</button>
        </div>
      } @else if (bookings().length === 0) {
        <div class="booking-state">
          <p>No Bookings have been recorded yet.</p>
        </div>
      } @else {
        <ol class="booking-ledger">
          @for (booking of bookings(); track booking.id) {
            <li [class.is-cancelled]="booking.status === 'CANCELLED'">
              <time [attr.datetime]="booking.startAt">
                <strong>{{ formatBookingDay(booking.startAt) }}</strong>
                <span>{{ formatTimeSlot(booking) }}</span>
              </time>

              <div class="booking-room">
                <span class="booking-record-status">
                  {{ bookingStatusLabel(booking) }}
                </span>
                <h3>{{ booking.room.name }}</h3>
                <p>{{ booking.room.location }}</p>
              </div>

              <div class="booking-owner">
                <span>Booking owner</span>
                <strong>{{ booking.user.name }}</strong>
                <a [href]="'mailto:' + booking.user.email">
                  {{ booking.user.email }}
                </a>
              </div>

              <div class="booking-record">
                @if (booking.cancelledAt) {
                  <span>Cancellation Record</span>
                  <strong>{{ formatCancellationRecord(booking) }}</strong>
                } @else {
                  <span>Booking status</span>
                  <strong>{{ bookingStatusLabel(booking) }}</strong>
                }
              </div>

              @if (booking.canCancel) {
                <button
                  type="button"
                  class="cancel-booking"
                  [disabled]="cancellingBookingId() === booking.id"
                  [attr.aria-label]="
                    'Cancel ' +
                    booking.room.name +
                    ' Booking for ' +
                    booking.user.name
                  "
                  (click)="cancelBooking(booking)"
                >
                  {{
                    cancellingBookingId() === booking.id
                      ? 'Cancelling…'
                      : 'Cancel Booking'
                  }}
                </button>
              }
            </li>
          }
        </ol>
      }
    </section>
  `,
})
export class BookingOversight implements OnInit {
  private readonly administratorApi = inject(AdministratorApi);

  protected readonly bookings = signal<ManagedBooking[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal(false);
  protected readonly cancellingBookingId = signal('');
  protected readonly statusMessage = signal('');
  protected readonly actionError = signal('');

  ngOnInit(): void {
    this.loadBookings();
  }

  protected loadBookings(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.administratorApi
      .listBookings()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (bookings) => this.bookings.set(bookings),
        error: () => {
          this.bookings.set([]);
          this.loadError.set(true);
        },
      });
  }

  protected cancelBooking(booking: ManagedBooking): void {
    this.cancellingBookingId.set(booking.id);
    this.statusMessage.set('');
    this.actionError.set('');
    this.administratorApi
      .cancelBooking(booking.id)
      .pipe(finalize(() => this.cancellingBookingId.set('')))
      .subscribe({
        next: (cancelledBooking) => {
          this.bookings.update((bookings) =>
            bookings.map((current) =>
              current.id === cancelledBooking.id ? cancelledBooking : current,
            ),
          );
          this.statusMessage.set(
            `Administrative Cancellation recorded for ${booking.user.name}'s ${booking.room.name} Booking.`,
          );
        },
        error: () =>
          this.actionError.set(
            'The Booking could not be cancelled. It may have already started or been cancelled. Refresh the ledger and try again.',
          ),
      });
  }

  protected formatBookingDay(date: string): string {
    return bookingDayFormatter.format(new Date(date));
  }

  protected formatTimeSlot(booking: ManagedBooking): string {
    return `${bookingTimeFormatter.format(new Date(booking.startAt))}–${bookingTimeFormatter.format(new Date(booking.endAt))}`;
  }

  protected formatCancellationRecord(booking: ManagedBooking): string {
    if (!booking.cancelledAt) {
      return 'Not cancelled';
    }
    const cancelledBy = booking.cancelledBy
      ? `${booking.cancelledBy.name} (${booking.cancelledBy.email})`
      : booking.cancelledByUserId;
    return `${bookingCancellationFormatter.format(new Date(booking.cancelledAt))} · ${cancelledBy}`;
  }

  protected bookingStatusLabel(booking: ManagedBooking): string {
    if (booking.status === 'CANCELLED') {
      return 'Cancelled';
    }
    return booking.canCancel ? 'Future Active' : 'Started';
  }
}

const officeTimeZone = 'Europe/Kyiv';
const bookingDayFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const bookingTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const bookingCancellationFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
