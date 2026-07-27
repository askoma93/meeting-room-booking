import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Administrator } from './administrator';

describe('Administrator controls', () => {
  const rooms = [
    {
      id: 'room-1',
      name: 'Dnipro',
      capacity: 4,
      location: 'Floor 2 · East wing',
      equipment: ['Display', 'Whiteboard'],
      isActive: true,
    },
    {
      id: 'room-2',
      name: 'Podil',
      capacity: 2,
      location: 'Floor 1 · Lobby',
      equipment: ['Display'],
      isActive: false,
    },
  ];
  const bookings = [
    {
      id: 'booking-1',
      userId: 'user-1',
      roomId: 'room-1',
      startAt: '2030-01-15T08:00:00.000Z',
      endAt: '2030-01-15T08:30:00.000Z',
      status: 'ACTIVE',
      cancelledAt: null,
      cancelledByUserId: null,
      cancelledBy: null,
      canCancel: true,
      room: { name: 'Dnipro', location: 'Floor 2 · East wing' },
      user: {
        id: 'user-1',
        name: 'Maksym Bondarenko',
        email: 'maksym@example.com',
      },
    },
    {
      id: 'booking-2',
      userId: 'user-2',
      roomId: 'room-2',
      startAt: '2030-01-16T10:00:00.000Z',
      endAt: '2030-01-16T10:30:00.000Z',
      status: 'CANCELLED',
      cancelledAt: '2030-01-10T08:00:00.000Z',
      cancelledByUserId: 'administrator-1',
      cancelledBy: {
        id: 'administrator-1',
        name: 'Anna Kovalenko',
        email: 'admin@example.com',
      },
      canCancel: false,
      room: { name: 'Podil', location: 'Floor 1 · Lobby' },
      user: {
        id: 'user-2',
        name: 'Sofiia Melnyk',
        email: 'sofiia@example.com',
      },
    },
  ];

  beforeEach(() => {
    localStorage.setItem('mrb.accessToken', 'administrator-token');
    TestBed.configureTestingModule({
      imports: [Administrator],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('lets an Administrator create, edit, deactivate, and reactivate Rooms', async () => {
    const fixture = TestBed.createComponent(Administrator);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    flushManagementData(http, fixture);
    fixture.detectChanges();

    fillRoomForm(fixture.nativeElement, {
      name: 'Kyiv',
      capacity: '12',
      location: 'Floor 3 · North wing',
      equipment: 'Projector, Video conferencing',
    });
    clickButton(fixture.nativeElement, 'Add Room');

    const createRequest = http.expectOne('/api/rooms');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      name: 'Kyiv',
      capacity: 12,
      location: 'Floor 3 · North wing',
      equipment: ['Projector', 'Video conferencing'],
    });
    createRequest.flush({
      ...createRequest.request.body,
      id: 'room-3',
      isActive: true,
    });
    fixture.detectChanges();
    expect(roomNames(fixture.nativeElement)).toContain('Kyiv');

    clickButton(fixture.nativeElement, 'Edit Dnipro');
    fixture.detectChanges();
    fillRoomForm(fixture.nativeElement, {
      name: 'Dnipro Studio',
      capacity: '6',
      location: 'Floor 4 В· Test wing',
      equipment: 'Projector, Speakerphone',
    });
    clickButton(fixture.nativeElement, 'Save changes');

    const editRequest = http.expectOne('/api/rooms/room-1');
    expect(editRequest.request.method).toBe('PATCH');
    expect(editRequest.request.body).toEqual({
      name: 'Dnipro Studio',
      capacity: 6,
      location: 'Floor 4 В· Test wing',
      equipment: ['Projector', 'Speakerphone'],
    });
    editRequest.flush({
      ...rooms[0],
      ...editRequest.request.body,
    });
    fixture.detectChanges();
    expect(roomNames(fixture.nativeElement)).toContain('Dnipro Studio');

    clickButton(fixture.nativeElement, 'Deactivate Dnipro Studio');
    const deactivateRequest = http.expectOne('/api/rooms/room-1');
    expect(deactivateRequest.request.body).toEqual({ isActive: false });
    deactivateRequest.flush({
      ...rooms[0],
      name: 'Dnipro Studio',
      isActive: false,
    });
    fixture.detectChanges();

    clickButton(fixture.nativeElement, 'Reactivate Dnipro Studio');
    const reactivateRequest = http.expectOne('/api/rooms/room-1');
    expect(reactivateRequest.request.body).toEqual({ isActive: true });
    reactivateRequest.flush({
      ...rooms[0],
      name: 'Dnipro Studio',
      isActive: true,
    });
    fixture.detectChanges();

    clickButton(fixture.nativeElement, 'Edit Dnipro Studio');
    fixture.detectChanges();
    setInput(fixture.nativeElement, '#room-name', 'Discarded Room name');
    clickButton(fixture.nativeElement, 'Cancel');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement.querySelector('#room-name') as HTMLInputElement)
        .value,
    ).toBe('');
    expect(roomNames(fixture.nativeElement)).toContain('Dnipro Studio');
  });

  it('shows Booking Ownership and lets an Administrator cancel any Future Active Booking', () => {
    const fixture = TestBed.createComponent(Administrator);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    flushManagementData(http, fixture);
    fixture.detectChanges();

    const bookingLedger = fixture.nativeElement.querySelector(
      '.booking-ledger',
    ) as HTMLElement;
    expect(bookingLedger.textContent).toContain('Maksym Bondarenko');
    expect(bookingLedger.textContent).toContain('maksym@example.com');
    expect(bookingLedger.textContent).toContain('Sofiia Melnyk');
    expect(bookingLedger.textContent).toContain('admin@example.com');
    expect(bookingLedger.querySelectorAll('.cancel-booking')).toHaveLength(1);

    clickButton(bookingLedger, 'Cancel Dnipro Booking for Maksym Bondarenko');
    const cancellation = http.expectOne('/api/bookings/booking-1/cancel');
    expect(cancellation.request.method).toBe('PATCH');
    cancellation.flush({
      ...bookings[0],
      status: 'CANCELLED',
      cancelledAt: '2030-01-10T09:00:00.000Z',
      cancelledByUserId: 'administrator-1',
      cancelledBy: {
        id: 'administrator-1',
        name: 'Anna Kovalenko',
        email: 'admin@example.com',
      },
      canCancel: false,
    });
    fixture.detectChanges();

    expect(bookingLedger.querySelectorAll('.cancel-booking')).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent,
    ).toContain('Administrative Cancellation recorded');
  });

  it('shows no management actions when the API rejects a regular User', () => {
    const fixture = TestBed.createComponent(Administrator);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne('/api/rooms/management')
      .flush(
        { message: 'Forbidden' },
        { status: 403, statusText: 'Forbidden' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Administrator access required',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(buttonLabels(fixture.nativeElement)).toEqual([]);
  });

  function flushManagementData(
    http: HttpTestingController,
    fixture: ComponentFixture<Administrator>,
  ): void {
    const roomsRequest = http.expectOne('/api/rooms/management');
    expect(roomsRequest.request.headers.get('authorization')).toBe(
      'Bearer administrator-token',
    );
    roomsRequest.flush(rooms);
    fixture.detectChanges();
    const bookingsRequest = http.expectOne('/api/bookings/management');
    expect(bookingsRequest.request.headers.get('authorization')).toBe(
      'Bearer administrator-token',
    );
    bookingsRequest.flush(bookings);
  }

  function fillRoomForm(
    element: HTMLElement,
    values: {
      name: string;
      capacity: string;
      location: string;
      equipment: string;
    },
  ): void {
    setInput(element, '#room-name', values.name);
    setInput(element, '#room-capacity', values.capacity);
    setInput(element, '#room-location', values.location);
    setInput(element, '#room-equipment', values.equipment);
  }

  function setInput(
    element: HTMLElement,
    selector: string,
    value: string,
  ): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function clickButton(element: HTMLElement, label: string): void {
    const button = Array.from(element.querySelectorAll('button')).find(
      (candidate) =>
        candidate.getAttribute('aria-label') === label ||
        candidate.textContent?.trim() === label,
    ) as HTMLButtonElement | undefined;
    expect(button).toBeDefined();
    button?.click();
  }

  function roomNames(element: HTMLElement): string[] {
    return Array.from(
      element.querySelectorAll('[data-testid="room-name"]'),
    ).map((heading) => heading.textContent?.trim() ?? '');
  }

  function buttonLabels(element: HTMLElement): string[] {
    return Array.from(element.querySelectorAll('button')).map(
      (button) => button.textContent?.trim() ?? '',
    );
  }
});
