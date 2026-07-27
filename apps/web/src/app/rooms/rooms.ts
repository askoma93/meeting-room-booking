import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { RoomFilters, RoomSummary, RoomsApi } from './rooms-api';

@Component({
  selector: 'mrb-rooms',
  imports: [RouterLink],
  styleUrl: './rooms.scss',
  template: `
    <section class="area-page rooms-page" aria-labelledby="rooms-title">
      <header class="area-heading">
        <div>
          <p class="eyebrow">Kyiv office · Active Rooms</p>
          <h1 id="rooms-title">Rooms</h1>
          <p class="lede">
            Match the room to the meeting before choosing a time slot.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">ROOMS / 01</span>
      </header>

      <div class="room-workspace">
        <form #filtersForm class="filters" (submit)="applyFilters($event)">
          <div class="filter-heading">
            <h2>Find a fit</h2>
            <span>Room criteria</span>
          </div>

          <label class="filter-field" for="minimum-capacity">
            Minimum capacity
            <input
              id="minimum-capacity"
              name="minimumCapacity"
              type="number"
              min="1"
              inputmode="numeric"
              placeholder="Any size"
            />
          </label>

          <label class="filter-field" for="equipment">
            Equipment
            <input
              id="equipment"
              name="equipment"
              type="search"
              placeholder="Display, whiteboard…"
            />
          </label>

          <label class="filter-field" for="location">
            Location
            <input
              id="location"
              name="location"
              type="search"
              placeholder="Floor or wing"
            />
          </label>

          <div class="filter-actions">
            <button type="submit">Apply filters</button>
            <button type="button" (click)="clearFilters(filtersForm)">
              Clear
            </button>
          </div>
        </form>

        <section aria-labelledby="available-rooms-title" aria-live="polite">
          <div class="results-heading">
            <h2 id="available-rooms-title">Active Rooms</h2>
            @if (!loading() && !errorMessage()) {
              <span class="result-count">{{ resultLabel() }}</span>
            }
          </div>

          @if (loading()) {
            <div class="result-state">
              <p>Checking the room board…</p>
            </div>
          } @else if (errorMessage()) {
            <div class="result-state" role="alert">
              <p>
                {{ errorMessage() }}
                @if (needsSignIn()) {
                  <a routerLink="/auth">Sign in</a>
                } @else {
                  <button type="button" (click)="loadRooms()">Try again</button>
                }
              </p>
            </div>
          } @else if (rooms().length === 0) {
            <div class="result-state">
              <p>
                No Active Rooms match these filters. Clear one criterion and
                check again.
              </p>
            </div>
          } @else {
            <ol class="room-list">
              @for (room of rooms(); track room.id; let index = $index) {
                <li class="room-card">
                  <div>
                    <span class="room-index">
                      Room {{ (index + 1).toString().padStart(2, '0') }}
                    </span>
                    <h3 data-testid="room-name">{{ room.name }}</h3>
                    <p class="location">{{ room.location }}</p>
                  </div>
                  <div class="capacity">
                    <strong>{{ room.capacity }}</strong>
                    <span>people</span>
                  </div>
                  <ul
                    class="equipment-list"
                    [attr.aria-label]="room.name + ' equipment'"
                  >
                    @for (item of room.equipment; track item) {
                      <li>{{ item }}</li>
                    }
                  </ul>
                </li>
              }
            </ol>
          }
        </section>
      </div>
    </section>
  `,
})
export class Rooms implements OnInit {
  private readonly roomsApi = inject(RoomsApi);

  protected readonly rooms = signal<RoomSummary[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly needsSignIn = signal(false);
  ngOnInit(): void {
    this.loadRooms();
  }

  protected applyFilters(event: SubmitEvent): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget as HTMLFormElement);
    const minimumCapacity = data.get('minimumCapacity')?.toString();

    this.loadRooms({
      minCapacity: minimumCapacity ? Number(minimumCapacity) : undefined,
      equipment: data.get('equipment')?.toString() || undefined,
      location: data.get('location')?.toString().trim() || undefined,
    });
  }

  protected clearFilters(form: HTMLFormElement): void {
    form.reset();
    this.loadRooms();
  }

  protected loadRooms(filters: RoomFilters = {}): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.needsSignIn.set(false);

    this.roomsApi
      .list(filters)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rooms) => this.rooms.set(rooms),
        error: (error: { status?: number }) => {
          this.rooms.set([]);
          this.needsSignIn.set(error.status === 401);
          this.errorMessage.set(
            error.status === 401
              ? 'Your session is required to browse Active Rooms.'
              : 'The room board could not be loaded.',
          );
        },
      });
  }

  protected resultLabel(): string {
    const count = this.rooms().length;
    return `${count} ${count === 1 ? 'room' : 'rooms'} found`;
  }
}
