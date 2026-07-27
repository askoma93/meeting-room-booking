import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export class CreateRoomDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  capacity!: number;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  equipment!: string[];
}
