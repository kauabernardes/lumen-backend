import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty({ message: 'O token é obrigatório.' })
  token: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter no mínimo 6 caracteres.' })
  @IsNotEmpty({ message: 'A nova senha não pode ser vazia.' })
  newPassword: string;
}