import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class Create {
  @IsNotEmpty({ message: 'O nome da comunidade é obrigatório' })
  @IsString({ message: 'O nome da comunidade deve ser uma string' })
  @MaxLength(50, {
    message: 'O nome da comunidade deve ter no máximo 50 caracteres',
  })
  @MinLength(5, {
    message: 'O nome da comunidade deve ter no mínimo 5 caracteres',
  })
  name: string;

  @IsString({ message: 'A descrição da comunidade deve ser uma string' })
  @IsOptional()
  description?: string;
}
