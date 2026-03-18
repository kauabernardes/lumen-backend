import { IsEmail, IsString, MinLength, Matches } from 'class-validator'

export class RegisterDto {

  @IsEmail()
  email: string

  @IsString()
  @MinLength(3)
  username: string

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).*$/)
  password: string

}