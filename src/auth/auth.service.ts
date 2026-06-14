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
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private attempts = new Map<string, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly mailerService: MailerService,
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
        profileImage: user!.profileImage
          ? `uploads/${user!.profileImage}`
          : null,
      },
      'segredo',
      { expiresIn: '1h' },
    );

    return {
      access_token: token,
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
        profileImage: user!.profileImage
          ? `uploads/${user!.profileImage}`
          : null,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      return {
        message:
          'Se o e-mail informado estiver cadastrado, um código de recuperação será enviado.',
      };
    }

    const token = crypto.randomBytes(20).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expires;
    await this.userRepository.save(user);

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: 'Recuperação de Senha - Lumen',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Olá, ${user.username}!</h2>
            <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma Lumen.</p>
            <p>Para escolher uma nova senha, clique no botão abaixo:</p>
            <a href="${resetLink}" style="background-color: #6A1B9A; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Redefinir Senha</a>
            <p>Se o botão não funcionar, copie e cole este link no seu navegador:</p>
            <p>${resetLink}</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="font-size: 12px; color: #666;">Este link é válido por 1 hora. Se você não solicitou essa mudança, ignore este e-mail.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Falha ao enviar e-mail:', error);
    }

    return {
      message:
        'Se o e-mail informado estiver cadastrado, um código de recuperação será enviado.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: dto.token },
    });

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException(
        'O token de recuperação é inválido ou expirou.',
      );
    }

    user.password = await bcrypt.hash(dto.newPassword, 12);

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Sua senha foi atualizada com sucesso!',
    };
  }
}
