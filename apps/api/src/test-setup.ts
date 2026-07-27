process.env.DATABASE_URL ??=
  'postgresql://meeting_room_test:meeting_room_test@localhost:5433/meeting_room_booking_test?schema=public';
process.env.JWT_SECRET ??= 'test-only-jwt-secret-with-at-least-32-characters';
