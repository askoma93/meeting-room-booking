import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { API_PREFIX, configureApi } from './app/configure-api';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApi(app);

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 3000);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  await app.listen(port);
  Logger.log(`API is running on http://localhost:${port}/${API_PREFIX}`);
}

void bootstrap();
