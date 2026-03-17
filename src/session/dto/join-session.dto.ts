import { IsUUID } from 'class-validator';

export class JoinSessionDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  sessionId?: string;
}
