import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['apps/api/.env.test', '.env.test', 'apps/api/.env', '.env']
          : ['apps/api/.env.local', '.env.local', 'apps/api/.env', '.env'],
    }),
  ],
  controllers: [HealthController],
})
export class AppModule {}
