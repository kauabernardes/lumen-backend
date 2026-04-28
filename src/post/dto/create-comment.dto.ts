import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateComment {
  @IsString()
  @IsNotEmpty()
  content: string;
}