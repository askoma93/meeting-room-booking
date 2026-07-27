export function createAccessToken(
  role: 'USER' | 'ADMINISTRATOR' = 'USER',
  secondsFromNow = 3600,
): string {
  const payload = btoa(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + secondsFromNow,
      role,
    }),
  );
  return `header.${payload}.signature`;
}
