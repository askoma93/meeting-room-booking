import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  AdministratorApi,
  EditableRoomFields,
  ManagedRoom,
} from './administrator-api';
import { BookingOversight } from './booking-oversight';

@Component({
  imports: [BookingOversight],
  selector: 'mrb-administrator',
  styleUrl: './administrator.scss',
  template: `
    <section
      class="area-page administrator-page"
      aria-labelledby="administrator-title"
    >
      <header class="area-heading">
        <div>
          <p class="eyebrow">Office operations</p>
          <h1 id="administrator-title">Administrator control room</h1>
          <p class="lede">
            Keep the Room roster accurate and oversee every Booking from one
            operational view.
          </p>
        </div>
        <span class="area-code" aria-hidden="true">ADMIN / 03</span>
      </header>

      @if (loading()) {
        <div class="management-state" aria-live="polite">
          <span class="state-mark" aria-hidden="true">A</span>
          <h2>Opening Room control…</h2>
        </div>
      } @else if (accessDenied()) {
        <div class="management-state access-denied" role="alert">
          <span class="state-mark" aria-hidden="true">403</span>
          <h2>Administrator access required</h2>
          <p>
            Administrator controls are available only to Administrators. Sign in
            with an Administrator account to continue.
          </p>
        </div>
      } @else {
        <div class="management-summary" aria-label="Room status summary">
          <p>
            <strong>{{ activeRoomCount() }}</strong> Active Rooms
          </p>
          <p>
            <strong>{{ inactiveRoomCount() }}</strong> deactivated
          </p>
          <span>Office control at a glance</span>
        </div>

        <div class="management-workspace">
          <form #roomForm class="room-form" (submit)="saveRoom($event)">
            <div class="form-heading">
              <div>
                <p class="form-mode">
                  {{ editingRoom() ? 'Editing Room' : 'New Room' }}
                </p>
                <h2>
                  {{ editingRoom()?.name ?? 'Add to the roster' }}
                </h2>
              </div>
              @if (editingRoom()) {
                <button
                  type="button"
                  class="quiet"
                  (click)="cancelEditing(roomForm)"
                >
                  Cancel
                </button>
              }
            </div>

            <label for="room-name">
              Room name
              <input
                id="room-name"
                name="name"
                required
                [attr.value]="editingRoom()?.name ?? null"
              />
            </label>

            <div class="paired-fields">
              <label for="room-capacity">
                Capacity
                <input
                  id="room-capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  inputmode="numeric"
                  required
                  [attr.value]="editingRoom()?.capacity ?? null"
                />
              </label>

              <label for="room-location">
                Location
                <input
                  id="room-location"
                  name="location"
                  required
                  [attr.value]="editingRoom()?.location ?? null"
                />
              </label>
            </div>

            <label for="room-equipment">
              Equipment
              <input
                id="room-equipment"
                name="equipment"
                placeholder="Display, Whiteboard"
                [attr.value]="editingRoom()?.equipment?.join(', ') ?? null"
              />
              <small>Separate items with commas.</small>
            </label>

            <button type="submit" [disabled]="saving()">
              {{
                saving()
                  ? 'Saving…'
                  : editingRoom()
                    ? 'Save changes'
                    : 'Add Room'
              }}
            </button>

            @if (formError()) {
              <p class="form-error" role="alert">{{ formError() }}</p>
            }
          </form>

          <section class="room-roster" aria-labelledby="room-roster-title">
            <div class="roster-heading">
              <h2 id="room-roster-title">Room roster</h2>
              <span>{{ rooms().length }} total</span>
            </div>

            @if (loadError()) {
              <div class="roster-error" role="alert">
                <p>{{ loadError() }}</p>
                <button type="button" (click)="loadRooms()">Try again</button>
              </div>
            } @else if (rooms().length === 0) {
              <div class="roster-error">
                <p>No Rooms have been added yet. Use the form to begin.</p>
              </div>
            } @else {
              <ol class="managed-room-list">
                @for (room of rooms(); track room.id) {
                  <li [class.is-inactive]="!room.isActive">
                    <div class="room-status">
                      <span aria-hidden="true"></span>
                      {{ room.isActive ? 'Active Room' : 'Deactivated' }}
                    </div>
                    <div class="room-identity">
                      <h3 data-testid="room-name">{{ room.name }}</h3>
                      <p>{{ room.location }}</p>
                    </div>
                    <div class="room-capacity">
                      <strong>{{ room.capacity }}</strong>
                      <span>people</span>
                    </div>
                    <ul [attr.aria-label]="room.name + ' equipment'">
                      @for (item of room.equipment; track item) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                    <div class="room-actions">
                      <button
                        type="button"
                        class="quiet"
                        [attr.aria-label]="'Edit ' + room.name"
                        (click)="editRoom(room)"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        class="status-action"
                        [disabled]="busyRoomId() === room.id"
                        [attr.aria-label]="
                          (room.isActive ? 'Deactivate ' : 'Reactivate ') +
                          room.name
                        "
                        (click)="toggleActiveState(room)"
                      >
                        {{ room.isActive ? 'Deactivate' : 'Reactivate' }}
                      </button>
                    </div>
                  </li>
                }
              </ol>
            }
          </section>
        </div>

        <mrb-booking-oversight />
      }
    </section>
  `,
})
export class Administrator implements OnInit {
  private readonly administratorApi = inject(AdministratorApi);

  protected readonly rooms = signal<ManagedRoom[]>([]);
  protected readonly editingRoom = signal<ManagedRoom | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly busyRoomId = signal('');
  protected readonly accessDenied = signal(false);
  protected readonly loadError = signal('');
  protected readonly formError = signal('');
  protected readonly activeRoomCount = computed(
    () => this.rooms().filter((room) => room.isActive).length,
  );
  protected readonly inactiveRoomCount = computed(
    () => this.rooms().length - this.activeRoomCount(),
  );

  ngOnInit(): void {
    this.loadRooms();
  }

  protected loadRooms(): void {
    this.loading.set(true);
    this.accessDenied.set(false);
    this.loadError.set('');
    this.administratorApi
      .listRooms()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (rooms) => this.rooms.set(rooms),
        error: (error: { status?: number }) => {
          this.rooms.set([]);
          this.accessDenied.set(error.status === 401 || error.status === 403);
          if (!this.accessDenied()) {
            this.loadError.set('The Room roster could not be loaded.');
          }
        },
      });
  }

  protected saveRoom(event: SubmitEvent): void {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const room = this.roomDetailsFrom(form);
    const editingRoom = this.editingRoom();

    this.saving.set(true);
    this.formError.set('');
    const request = editingRoom
      ? this.administratorApi.updateRoom(editingRoom.id, room)
      : this.administratorApi.createRoom(room);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (savedRoom) => {
        this.upsertRoom(savedRoom);
        this.editingRoom.set(null);
        form.reset();
      },
      error: () =>
        this.formError.set(
          'The Room could not be saved. Check that its name is unique and try again.',
        ),
    });
  }

  protected editRoom(room: ManagedRoom): void {
    this.formError.set('');
    this.editingRoom.set(room);
  }

  protected cancelEditing(form: HTMLFormElement): void {
    this.editingRoom.set(null);
    this.formError.set('');
    form.reset();
  }

  protected toggleActiveState(room: ManagedRoom): void {
    this.busyRoomId.set(room.id);
    this.formError.set('');
    this.administratorApi
      .updateRoom(room.id, { isActive: !room.isActive })
      .pipe(finalize(() => this.busyRoomId.set('')))
      .subscribe({
        next: (savedRoom) => this.upsertRoom(savedRoom),
        error: (error: { status?: number }) =>
          this.formError.set(
            error.status === 409
              ? 'This Room has future Active Bookings and cannot be deactivated.'
              : 'The Room status could not be changed. Try again.',
          ),
      });
  }

  private roomDetailsFrom(form: HTMLFormElement): EditableRoomFields {
    const data = new FormData(form);
    return {
      name: data.get('name')?.toString().trim() ?? '',
      capacity: Number(data.get('capacity')),
      location: data.get('location')?.toString().trim() ?? '',
      equipment: (data.get('equipment')?.toString() ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };
  }

  private upsertRoom(savedRoom: ManagedRoom): void {
    this.rooms.update((rooms) => {
      const nextRooms = rooms.some((room) => room.id === savedRoom.id)
        ? rooms.map((room) => (room.id === savedRoom.id ? savedRoom : room))
        : [...rooms, savedRoom];
      return nextRooms.sort(
        (left, right) =>
          Number(right.isActive) - Number(left.isActive) ||
          left.name.localeCompare(right.name),
      );
    });
  }
}
