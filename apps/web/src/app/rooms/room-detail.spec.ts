import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { RoomDetail } from './room-detail';

describe('Room detail booking form', () => {
  beforeEach(() => {
    localStorage.setItem('mrb.accessToken', 'test-access-token');
    TestBed.configureTestingModule({
      imports: [RoomDetail],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: convertToParamMap({ roomId: 'room-1' }) },
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('shows occupied intervals and reloads them when the selected date changes', () => {
    const fixture = TestBed.createComponent(RoomDetail);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/rooms/room-1').flush(room);
    const initialAvailability = http.expectOne(
      (request) =>
        request.url === '/api/rooms/room-1/availability' &&
        request.params.has('date'),
    );
    initialAvailability.flush([
      {
        startAt: '2030-01-15T08:00:00.000Z',
        endAt: '2030-01-15T08:30:00.000Z',
      },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('10:00–10:30');
    expect(timeOptions(fixture.nativeElement, '#start-time')).toContain(
      '08:00',
    );
    expect(timeOptions(fixture.nativeElement, '#end-time')).toContain('20:00');

    setValue(fixture.nativeElement, '#booking-date', '2030-01-16', 'change');
    fixture.detectChanges();

    http
      .expectOne(
        '/api/rooms/room-1/availability?date=2030-01-16',
      )
      .flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain(
      'No occupied Time Slots',
    );
  });

  it('keeps the backend Availability Check authoritative when a hint is stale', () => {
    const fixture = TestBed.createComponent(RoomDetail);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);

    http.expectOne('/api/rooms/room-1').flush(room);
    const initialAvailability = http.expectOne(
      (request) => request.url === '/api/rooms/room-1/availability',
    );
    initialAvailability.flush([]);

    setValue(fixture.nativeElement, '#booking-date', '2030-01-15', 'change');
    fixture.detectChanges();
    http
      .expectOne('/api/rooms/room-1/availability?date=2030-01-15')
      .flush([]);
    setValue(fixture.nativeElement, '#start-time', '10:00', 'change');
    setValue(fixture.nativeElement, '#end-time', '10:30', 'change');
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();

    const createRequest = http.expectOne('/api/bookings');
    expect(createRequest.request.method).toBe('POST');
    expect(createRequest.request.body).toEqual({
      roomId: 'room-1',
      startAt: '2030-01-15T08:00:00.000Z',
      endAt: '2030-01-15T08:30:00.000Z',
    });
    createRequest.flush(
      {
        statusCode: 409,
        message:
          'The Room already has an Active Booking that overlaps this Time Slot.',
      },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('[role="alert"]').textContent,
    ).toContain('just became occupied');
    http
      .expectOne('/api/rooms/room-1/availability?date=2030-01-15')
      .flush([
        {
          startAt: '2030-01-15T08:00:00.000Z',
          endAt: '2030-01-15T08:30:00.000Z',
        },
      ]);
  });

  const room = {
    id: 'room-1',
    name: 'Dnipro',
    capacity: 4,
    location: 'Floor 2 · East wing',
    equipment: ['Display', 'Whiteboard'],
  };

  function setValue(
    element: HTMLElement,
    selector: string,
    value: string,
    eventName: string,
  ): void {
    const control = element.querySelector(selector) as
      | HTMLInputElement
      | HTMLSelectElement;
    control.value = value;
    control.dispatchEvent(new Event(eventName, { bubbles: true }));
  }

  function timeOptions(element: HTMLElement, selector: string): string[] {
    return Array.from(
      element.querySelectorAll(`${selector} option`),
      (option) => option.textContent?.trim() ?? '',
    );
  }
});
