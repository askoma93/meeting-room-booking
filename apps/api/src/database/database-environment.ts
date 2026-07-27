const developmentDatabaseUrl =
  'postgresql://meeting_room:meeting_room@localhost:5432/meeting_room_booking?schema=public';
const testDatabaseUrl =
  'postgresql://meeting_room_test:meeting_room_test@localhost:5433/meeting_room_booking_test?schema=public';

export function resolveDatabaseUrl(
  environment: NodeJS.ProcessEnv = process.env,
): string {
  return (
    environment.DATABASE_URL ??
    (environment.NODE_ENV === 'test' ? testDatabaseUrl : developmentDatabaseUrl)
  );
}
