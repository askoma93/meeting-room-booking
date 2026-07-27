import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  OccupiedTimeSlot,
  RoomSummary,
  RoomsApi,
} from './rooms-api';

const officeTimeZone = 'Europe/Kyiv';
const officeDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: officeTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const officeTimeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: officeTimeZone,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const officeDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: officeTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

@Component({
  selector: 'mrb-room-detail',
  imports: [RouterLink],
  styleUrl: './room-detail.scss',
  template: `
    <section class="area-page room-detail-page" aria-labelledby="room-title">
      <a class="back-link" routerLink="/rooms">← All Rooms</a>

      <header class="area-heading room-heading">
        @if (room(); as currentRoom) {
          <div>
            <p class="eyebrow">Room schedule · Europe/Kyiv</p>
            <h1 id="room-title">{{ currentRoom.name }}</h1>
            <p class="lede">{{ currentRoom.location }}</p>
          </div>
          <dl class="room-facts" aria-label="Room details">
            <div>
              <dt>Capacity</dt>
              <dd>{{ currentRoom.capacity }} people</dd>
            </div>
            <div>
              <dt>Equipment</dt>
              <dd>{{ currentRoom.equipment.join(' · ') || 'None listed' }}</dd>
            </div>
          </dl>
        } @else {
          <div>
            <p class="eyebrow">Room schedule</p>
            <h1 id="room-title">Room</h1>
          </div>
        }
      </header>

      @if (pageError()) {
        <div class="page-state" role="alert">
          <p>{{ pageError() }}</p>
          <a routerLink="/rooms">Return to the Room board</a>
        </div>
      } @else {
        <div class="booking-workspace">
          <form class="booking-form" (submit)="createBooking($event)">
            <div class="panel-heading">
              <span class="panel-code">BOOK / 01</span>
              <h2>Choose a Time Slot</h2>
              <p>
                Occupied times are hints. The Availability Check runs again
                when you book.
              </p>
            </div>

            <label for="booking-date">
              Date
              <input
                id="booking-date"
                name="date"
                type="date"
                required
                [min]="today"
                [value]="selectedDate()"
                (change)="changeDate($event)"
              />
            </label>

            <div class="time-fields">
              <label for="start-time">
                Start
                <select
                  id="start-time"
                  name="startTime"
                  required
                  (change)="changeStartTime($event)"
                >
                  @for (time of startTimes; track time) {
                    <option [value]="time" [selected]="time === '09:00'">
                      {{ time }}
                    </option>
                  }
                </select>
              </label>

              <span class="time-arrow" aria-hidden="true">→</span>

              <label for="end-time">
                End
                <select id="end-time" name="endTime" required>
                  @for (time of endTimes; track time) {
                    <option [value]="time" [selected]="time === '09:30'">
                      {{ time }}
                    </option>
                  }
                </select>
              </label>
            </div>

            <button type="submit" [disabled]="submitting() || !room()">
              {{ submitting() ? 'Checking availability…' : 'Book Time Slot' }}
            </button>

            @if (formMessage()) {
              <p
                class="form-message"
                [class.success]="bookingCreated()"
                [attr.role]="bookingCreated() ? 'status' : 'alert'"
              >
                {{ formMessage() }}
              </p>
            }
          </form>

          <section class="day-board" aria-labelledby="occupied-title">
            <div class="day-heading">
              <div>
                <span class="panel-code">DAY / {{ selectedDate() }}</span>
                <h2 id="occupied-title">Occupied Time Slots</h2>
              </div>
              <span class="live-key"><i></i> Active Booking</span>
            </div>

            @if (availabilityLoading()) {
              <div class="availability-state" aria-live="polite">
                Reading the room board…
              </div>
            } @else if (availabilityError()) {
              <div class="availability-state" role="alert">
                <p>{{ availabilityError() }}</p>
                <button type="button" (click)="loadAvailability()">
                  Try again
                </button>
              </div>
            } @else if (occupiedSlots().length === 0) {
              <div class="availability-state empty">
                <span aria-hidden="true">○</span>
                <p>No occupied Time Slots for this day.</p>
              </div>
            } @else {
              <ol class="occupied-list" aria-live="polite">
                @for (slot of occupiedSlots(); track slot.startAt) {
                  <li>
                    <span>{{ formatTimeSlot(slot) }}</span>
                    <strong>Occupied</strong>
                  </li>
                }
              </ol>
            }

            <footer>
              <span>08:00</span>
              <span>Booking Hours</span>
              <span>20:00</span>
            </footer>
          </section>
        </div>
      }
    </section>
  `,
})
export class RoomDetail implements OnInit {
  private readonly roomsApi = inject(RoomsApi);
  private readonly route = inject(ActivatedRoute);
  private readonly roomId =
    this.route.snapshot.paramMap.get('roomId') ?? '';

  protected readonly today = officeDateFormatter.format(new Date());
  protected readonly selectedDate = signal(this.today);
  protected readonly room = signal<RoomSummary | null>(null);
  protected readonly occupiedSlots = signal<OccupiedTimeSlot[]>([]);
  protected readonly availabilityLoading = signal(true);
  protected readonly availabilityError = signal('');
  protected readonly pageError = signal('');
  protected readonly submitting = signal(false);
  protected readonly formMessage = signal('');
  protected readonly bookingCreated = signal(false);
  protected readonly startTimes = timeOptions(8 * 60, 19 * 60 + 45);
  protected readonly endTimes = timeOptions(8 * 60 + 15, 20 * 60);

  ngOnInit(): void {
    this.roomsApi.get(this.roomId).subscribe({
      next: (room) => this.room.set(room),
      error: () =>
        this.pageError.set(
          'This Active Room could not be found or your session has ended.',
        ),
    });
    this.loadAvailability();
  }

  protected changeDate(event: Event): void {
    this.selectedDate.set((event.target as HTMLInputElement).value);
    this.formMessage.set('');
    this.bookingCreated.set(false);
    this.loadAvailability();
  }

  protected changeStartTime(event: Event): void {
    const start = (event.target as HTMLSelectElement).value;
    const endSelect = (event.target as HTMLSelectElement)
      .closest('form')
      ?.querySelector<HTMLSelectElement>('#end-time');
    if (endSelect && minutesFromTime(endSelect.value) <= minutesFromTime(start)) {
      endSelect.value = timeFromMinutes(minutesFromTime(start) + 15);
    }
  }

  protected loadAvailability(): void {
    this.availabilityLoading.set(true);
    this.availabilityError.set('');
    this.roomsApi
      .getAvailability(this.roomId, this.selectedDate())
      .pipe(finalize(() => this.availabilityLoading.set(false)))
      .subscribe({
        next: (slots) => this.occupiedSlots.set(slots),
        error: () => {
          this.occupiedSlots.set([]);
          this.availabilityError.set(
            'Occupied times could not be loaded. Check the board again.',
          );
        },
      });
  }

  protected createBooking(event: SubmitEvent): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const startTime = data.get('startTime')?.toString() ?? '';
    const endTime = data.get('endTime')?.toString() ?? '';

    this.formMessage.set('');
    this.bookingCreated.set(false);
    if (minutesFromTime(endTime) <= minutesFromTime(startTime)) {
      this.formMessage.set('End time must be later than start time.');
      return;
    }

    this.submitting.set(true);
    this.roomsApi
      .createBooking(this.roomId, {
        startAt: officeDateTimeToIso(this.selectedDate(), startTime),
        endAt: officeDateTimeToIso(this.selectedDate(), endTime),
      })
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => {
          this.bookingCreated.set(true);
          this.formMessage.set('Time Slot booked. The room board is updated.');
          this.loadAvailability();
        },
        error: (error: { status?: number }) => {
          this.formMessage.set(
            error.status === 409
              ? 'That Time Slot just became occupied. Choose another time and try again.'
              : 'The Time Slot could not be booked. Check the details and try again.',
          );
          this.loadAvailability();
        },
      });
  }

  protected formatTimeSlot(slot: OccupiedTimeSlot): string {
    return `${officeTimeFormatter.format(new Date(slot.startAt))}–${officeTimeFormatter.format(new Date(slot.endAt))}`;
  }
}

function timeOptions(startMinutes: number, endMinutes: number): string[] {
  const times: string[] = [];
  for (
    let minutes = startMinutes;
    minutes <= endMinutes;
    minutes += 15
  ) {
    times.push(timeFromMinutes(minutes));
  }
  return times;
}

function timeFromMinutes(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`;
}

function minutesFromTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function officeDateTimeToIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const targetWallTime = Date.UTC(year, month - 1, day, hour, minute);
  let candidate = targetWallTime;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      officeDateTimeFormatter
        .formatToParts(new Date(candidate))
        .filter(({ type }) => type !== 'literal')
        .map(({ type, value }) => [type, value]),
    );
    const representedWallTime = Date.UTC(
      Number(parts['year']),
      Number(parts['month']) - 1,
      Number(parts['day']),
      Number(parts['hour']),
      Number(parts['minute']),
      Number(parts['second']),
    );
    candidate += targetWallTime - representedWallTime;
  }

  return new Date(candidate).toISOString();
}
