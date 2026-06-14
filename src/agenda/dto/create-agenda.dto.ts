import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateAgendaDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string; 

  @IsDateString()
  @IsNotEmpty()
  eventDate: string; }