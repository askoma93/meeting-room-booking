import { ValidationPipe, type INestApplication } from '@nestjs/common';

export const API_PREFIX = 'api';

export function configureApi(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
}
