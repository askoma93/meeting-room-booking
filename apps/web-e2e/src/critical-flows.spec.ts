import { expect, Page, test } from '@playwright/test';

const demoPassword = 'Demo123!';
const runIdentifier = Date.now();
const isolatedBookingDayOffset = bookingDayOffsetFor(runIdentifier);

interface TimeSlotInput {
  date: string;
  start: string;
  end: string;
}

interface RoomFormInput {
  name: string;
  capacity: string;
  location: string;
  equipment: string;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/auth');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(demoPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(/\/rooms$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Rooms' }),
  ).toBeVisible();
}

async function openRoom(page: Page, roomName: string): Promise<void> {
  await page.getByRole('link', { name: roomName, exact: true }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: roomName, exact: true }),
  ).toBeVisible();
}

async function chooseTimeSlot(
  page: Page,
  { date, start, end }: TimeSlotInput,
): Promise<void> {
  const dateInput = page.getByLabel('Date');
  await dateInput.fill(date);
  await dateInput.press('Tab');
  await page.getByLabel('Start').selectOption(start);
  await page.getByLabel('End').selectOption(end);
}

async function fillRoomForm(
  page: Page,
  { name, capacity, location, equipment }: RoomFormInput,
): Promise<void> {
  await page.getByLabel('Room name').fill(name);
  await page.getByLabel('Capacity').fill(capacity);
  await page.getByLabel('Location').fill(location);
  await page.getByRole('textbox', { name: /^Equipment/ }).fill(equipment);
}

async function bookTimeSlot(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Book Time Slot' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Time Slot booked. The room board is updated.',
  );
}

function bookingDayOffsetFor(identifier: number): number {
  return 30 + (Math.floor(identifier / 1000) % 1_000_000);
}

function futureOfficeDate(daysAhead: number): string {
  const officeParts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Kyiv',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  const futureDate = new Date(
    Date.UTC(
      Number(officeParts['year']),
      Number(officeParts['month']) - 1,
      Number(officeParts['day']) + daysAhead,
    ),
  );
  return futureDate.toISOString().slice(0, 10);
}

test('a User creates a Booking, sees an overlap rejected, and cancels their Future Booking', async ({
  page,
}) => {
  const bookingDate = futureOfficeDate(isolatedBookingDayOffset);

  await signIn(page, 'maksym@example.com');
  await openRoom(page, 'Lviv');

  await chooseTimeSlot(page, {
    date: bookingDate,
    start: '16:00',
    end: '16:30',
  });
  await bookTimeSlot(page);

  await chooseTimeSlot(page, {
    date: bookingDate,
    start: '16:15',
    end: '16:45',
  });
  await page.getByRole('button', { name: 'Book Time Slot' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'That Time Slot just became occupied. Choose another time and try again.',
  );

  await page.getByRole('link', { name: 'My bookings' }).click();
  const booking = page
    .locator('.booking-entry')
    .filter({ has: page.locator(`time[datetime^="${bookingDate}"]`) })
    .filter({ has: page.getByRole('heading', { name: 'Lviv', exact: true }) });
  await expect(booking).toContainText('16:00–16:30');
  await booking
    .getByRole('button', { name: /Cancel booking for Lviv/ })
    .click();

  await expect(page.getByRole('status')).toHaveText(
    'Booking cancelled. Lviv is available for this Time Slot again.',
  );
  await expect(booking).toContainText('Cancelled');
});

test('an Administrator creates, edits, deactivates, and reactivates a Room', async ({
  page,
}) => {
  const roomName = `E2E Atlas ${runIdentifier}`;
  const editedRoomName = `${roomName} Updated`;

  await signIn(page, 'admin@example.com');
  await page.getByRole('link', { name: 'Administrator' }).click();
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Administrator control room',
    }),
  ).toBeVisible();

  await fillRoomForm(page, {
    name: roomName,
    capacity: '5',
    location: 'Floor 5 · Test wing',
    equipment: 'Display, Whiteboard',
  });
  await page.getByRole('button', { name: 'Add Room' }).click();

  const createdRoom = page.locator('.managed-room-list > li').filter({
    has: page.getByRole('heading', { name: roomName, exact: true }),
  });
  await expect(createdRoom).toContainText('Floor 5 · Test wing');
  await expect(createdRoom).toContainText('5');

  await createdRoom.getByRole('button', { name: `Edit ${roomName}` }).click();
  await fillRoomForm(page, {
    name: editedRoomName,
    capacity: '7',
    location: 'Floor 6 · QA wing',
    equipment: 'Projector, Speakerphone',
  });
  await page.getByRole('button', { name: 'Save changes' }).click();

  const editedRoom = page.locator('.managed-room-list > li').filter({
    has: page.getByRole('heading', {
      name: editedRoomName,
      exact: true,
    }),
  });
  await expect(editedRoom).toContainText('Floor 6 · QA wing');
  await expect(editedRoom).toContainText('7');
  await expect(editedRoom).toContainText('Projector');
  await expect(editedRoom).toContainText('Speakerphone');

  await editedRoom
    .getByRole('button', { name: `Deactivate ${editedRoomName}` })
    .click();
  await expect(editedRoom).toContainText('Deactivated');

  await editedRoom
    .getByRole('button', { name: `Reactivate ${editedRoomName}` })
    .click();
  await expect(editedRoom).toContainText('Active Room');
});

test("an Administrator records Administrative Cancellation for another User's Booking", async ({
  page,
}) => {
  const bookingDate = futureOfficeDate(isolatedBookingDayOffset + 1);

  await signIn(page, 'maksym@example.com');
  await openRoom(page, 'Odesa');
  await chooseTimeSlot(page, {
    date: bookingDate,
    start: '14:00',
    end: '14:30',
  });
  await bookTimeSlot(page);

  await signIn(page, 'admin@example.com');
  await page.getByRole('link', { name: 'Administrator' }).click();

  const booking = page
    .locator('mrb-booking-oversight .booking-ledger > li')
    .filter({ has: page.locator(`time[datetime^="${bookingDate}"]`) })
    .filter({ hasText: 'Odesa' })
    .filter({ hasText: 'Maksym Bondarenko' });
  await expect(booking).toContainText('Future Active');
  await booking
    .getByRole('button', {
      name: 'Cancel Odesa Booking for Maksym Bondarenko',
    })
    .click();

  await expect(page.getByRole('status')).toHaveText(
    "Administrative Cancellation recorded for Maksym Bondarenko's Odesa Booking.",
  );
  await expect(booking).toContainText('Cancelled');
});
