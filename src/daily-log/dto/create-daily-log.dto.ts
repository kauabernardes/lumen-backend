import { IsNotEmpty, IsDateString, IsString, IsIn } from 'class-validator';

export class CreateDailyLogDto {
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsString()
  mood: string;

  @IsNotEmpty()
  @IsString()
  studiedYesterday: string;

  @IsNotEmpty()
  @IsIn(['sim', 'nao', 'quase']) // Garante que só chegue o que o rádio permite
  achievedGoal: string;

  @IsNotEmpty()
  @IsString()
  studyToday: string;
}
