import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Insira um formato de e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail não pode ser vazio.' })
  email: string;
}