import { IsNotEmpty, IsDateString } from 'class-validator';

export class CreateDailyLogDto {
  @IsDateString()
  date: string;

  @IsNotEmpty()
  mood: string;

  @IsNotEmpty()
  summary: string;
}