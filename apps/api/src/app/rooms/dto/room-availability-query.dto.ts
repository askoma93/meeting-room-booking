import { IsDateString, Matches } from 'class-validator';

export class RoomAvailabilityQueryDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  date!: string;
}
