import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { HealthController } from './health.controller';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'test'
          ? ['apps/api/.env.test', '.env.test', 'apps/api/.env', '.env']
          : ['apps/api/.env.local', '.env.local', 'apps/api/.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    BookingsModule,
    RoomsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
