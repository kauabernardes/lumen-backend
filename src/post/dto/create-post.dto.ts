import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsUUID()
  communityId: string;
}