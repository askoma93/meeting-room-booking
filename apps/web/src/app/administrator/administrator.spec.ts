import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Administrator } from './administrator';

describe('Administrator Room management', () => {
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
    flushManagementList(http);
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
    setInput(fixture.nativeElement, '#room-name', 'Dnipro Studio');
    clickButton(fixture.nativeElement, 'Save changes');

    const editRequest = http.expectOne('/api/rooms/room-1');
    expect(editRequest.request.method).toBe('PATCH');
    editRequest.flush({ ...rooms[0], name: 'Dnipro Studio' });
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

  function flushManagementList(http: HttpTestingController): void {
    const request = http.expectOne('/api/rooms/management');
    expect(request.request.headers.get('authorization')).toBe(
      'Bearer administrator-token',
    );
    request.flush(rooms);
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
