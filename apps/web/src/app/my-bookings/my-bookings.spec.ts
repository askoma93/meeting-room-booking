import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MyBookings } from './my-bookings';

describe('My Bookings', () => {
  beforeEach(() => {
    localStorage.setItem('mrb.accessToken', 'test-access-token');
    TestBed.configureTestingModule({
      imports: [MyBookings],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('shows Active and Cancelled Booking history and cancels only a Future Active Booking', () => {
    vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2040-01-01T00:00:00.000Z').getTime(),
    );
    const fixture = TestBed.createComponent(MyBookings);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    const listRequest = http.expectOne('/api/bookings');
    expect(listRequest.request.headers.get('authorization')).toBe(
      'Bearer test-access-token',
    );
    listRequest.flush(bookings);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dnipro');
    expect(fixture.nativeElement.textContent).toContain('Podil');
    expect(fixture.nativeElement.textContent).toContain('Cancelled');
    const cancelButtons =
      fixture.nativeElement.querySelectorAll('.cancel-booking');
    expect(cancelButtons).toHaveLength(1);

    cancelButtons[0].click();
    fixture.detectChanges();

    const cancellation = http.expectOne('/api/bookings/booking-future/cancel');
    expect(cancellation.request.method).toBe('PATCH');
    cancellation.flush({
      ...bookings[0],
      status: 'CANCELLED',
      canCancel: false,
      cancelledAt: '2030-01-10T08:00:00.000Z',
      cancelledByUserId: 'user-1',
    });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelectorAll('.cancel-booking'),
    ).toHaveLength(0);
    expect(
      fixture.nativeElement.querySelector('[role="status"]').textContent,
    ).toContain('Booking cancelled');
  });

  it('explains a load failure and lets the User try again', () => {
    const fixture = TestBed.createComponent(MyBookings);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http
      .expectOne('/api/bookings')
      .flush({}, { status: 500, statusText: 'Server error' });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Bookings could not be loaded');
    fixture.nativeElement.querySelector('.retry-bookings').click();
    fixture.detectChanges();
    http.expectOne('/api/bookings').flush([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'No Bookings on your board',
    );
  });

  it('keeps the Booking actionable when cancellation is rejected', () => {
    const fixture = TestBed.createComponent(MyBookings);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/bookings').flush([bookings[0]]);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.cancel-booking').click();
    fixture.detectChanges();
    http
      .expectOne('/api/bookings/booking-future/cancel')
      .flush({}, { status: 400, statusText: 'Bad request' });
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('Booking could not be cancelled');
    expect(
      fixture.nativeElement.querySelectorAll('.cancel-booking'),
    ).toHaveLength(1);
  });

  const bookings = [
    {
      id: 'booking-future',
      userId: 'user-1',
      roomId: 'room-1',
      startAt: '2030-01-15T08:00:00.000Z',
      endAt: '2030-01-15T08:30:00.000Z',
      status: 'ACTIVE',
      canCancel: true,
      cancelledAt: null,
      cancelledByUserId: null,
      room: { name: 'Dnipro', location: 'Floor 2 · East wing' },
    },
    {
      id: 'booking-cancelled',
      userId: 'user-1',
      roomId: 'room-2',
      startAt: '2030-01-16T10:00:00.000Z',
      endAt: '2030-01-16T10:30:00.000Z',
      status: 'CANCELLED',
      canCancel: false,
      cancelledAt: '2030-01-10T08:00:00.000Z',
      cancelledByUserId: 'user-1',
      room: { name: 'Podil', location: 'Floor 3 · West wing' },
    },
    {
      id: 'booking-started',
      userId: 'user-1',
      roomId: 'room-3',
      startAt: '2025-01-15T08:00:00.000Z',
      endAt: '2025-01-15T08:30:00.000Z',
      status: 'ACTIVE',
      canCancel: false,
      cancelledAt: null,
      cancelledByUserId: null,
      room: { name: 'Lviv', location: 'Floor 1' },
    },
  ];
});
