import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Rooms } from './rooms';

describe('Rooms', () => {
  const activeRooms = [
    {
      id: 'room-1',
      name: 'Dnipro',
      capacity: 4,
      location: 'Floor 2 · East wing',
      equipment: ['Display', 'Whiteboard'],
    },
    {
      id: 'room-2',
      name: 'Hoverla',
      capacity: 8,
      location: 'Floor 2 · West wing',
      equipment: ['Display', 'Video conferencing', 'Whiteboard'],
    },
  ];

  beforeEach(() => {
    localStorage.setItem('mrb.accessToken', 'test-access-token');
    TestBed.configureTestingModule({
      imports: [Rooms],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
  });

  it('loads API-backed rooms and applies capacity, equipment, and location filters', async () => {
    const fixture = TestBed.createComponent(Rooms);
    fixture.detectChanges();

    const http = TestBed.inject(HttpTestingController);
    const initialRequest = http.expectOne('/api/rooms');
    expect(initialRequest.request.headers.get('authorization')).toBe(
      'Bearer test-access-token',
    );
    initialRequest.flush(activeRooms);
    fixture.detectChanges();

    expect(roomNames(fixture.nativeElement)).toEqual(['Dnipro', 'Hoverla']);

    setInput(fixture.nativeElement, '#minimum-capacity', '6');
    fixture.detectChanges();
    setInput(fixture.nativeElement, '#equipment', 'Video conferencing');
    fixture.detectChanges();
    setInput(fixture.nativeElement, '#location', 'West wing');
    await fixture.whenStable();
    fixture.detectChanges();
    (
      fixture.nativeElement.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    const filteredRequest = http.expectOne(
      (request) =>
        request.url === '/api/rooms' &&
        request.params.get('minCapacity') === '6' &&
        request.params.get('equipment') === 'Video conferencing' &&
        request.params.get('location') === 'West wing',
    );
    filteredRequest.flush([activeRooms[1]]);
    fixture.detectChanges();

    expect(roomNames(fixture.nativeElement)).toEqual(['Hoverla']);
    expect(fixture.nativeElement.textContent).toContain('1 room found');
  });

  function roomNames(element: HTMLElement): string[] {
    return Array.from(
      element.querySelectorAll('[data-testid="room-name"]'),
    ).map((heading) => heading.textContent?.trim() ?? '');
  }

  function setInput(
    element: HTMLElement,
    selector: string,
    value: string,
    eventName = 'input',
  ): void {
    const input = element.querySelector(selector) as HTMLInputElement;
    input.value = value;
    input.dispatchEvent(new Event(eventName, { bubbles: true }));
  }
});
