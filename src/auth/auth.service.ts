import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/schema/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private attempts = new Map<string, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(data: any) {
    const { email, username, password } = data || {};

    if (!email || !password) {
      throw new BadRequestException(
        'Dados de registro incompletos. Verifique o corpo da requisição.',
      );
    }

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    const hash = await bcrypt.hash(password, 12);

    if (!existingUser) {
      await this.userRepository.save({
        email,
        username,
        password: hash,
      });
    } else {
      throw new BadRequestException(
        'Email ou nome de usuário já estão em uso. Tente outro.',
      );
    }

    return {
      message: 'Se os dados forem válidos, sua conta será criada.',
    };
  }

  async login(identifier: string, password: string, ip: string) {
    const count = this.attempts.get(ip) || 0;

    if (count >= 5) {
      throw new UnauthorizedException('Muitas tentativas. Tente novamente.');
    }

    const user = await this.userRepository.findOne({
      where: [{ email: identifier }, { username: identifier }],
    });

    const fakeHash =
      '$2b$12$CwTycUXWue0Thq9StjUM0uJ8v9Z7y1Y7l9J7l9J7l9J7l9J7l9J7l';

    const hash = user ? user.password : fakeHash;

    const isMatch = await bcrypt.compare(password, hash);

    if (!user || !isMatch) {
      const novasTentativas = count + 1;
      this.attempts.set(ip, novasTentativas);

      if (novasTentativas === 5) {
        setTimeout(
          () => {
            this.attempts.delete(ip);
          },
          15 * 60 * 1000,
        );
      }

      await new Promise((r) => setTimeout(r, 300));

      if (novasTentativas >= 5) {
        throw new UnauthorizedException(
          'Muitas tentativas. Tente novamente em 15 minutos.',
        );
      } else {
        throw new UnauthorizedException('Credenciais inválidas');
      }
    }

    this.attempts.delete(ip);

    const token = jwt.sign(
      {
        sub: user!.id,
        username: user!.username,
      },
      'segredo',
      { expiresIn: '1h' },
    );

    return {
      access_token: token,
    };
  }
}
