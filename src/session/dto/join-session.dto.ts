import { IsString, IsUUID, IsOptional } from 'class-validator';

export class JoinSessionDto {
  @IsString()
  token: string;

  @IsOptional()
  @IsUUID()
  sessionId?: string;
}
