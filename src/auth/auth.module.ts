import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/schema/user.entity';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.exemplo.com', 
        port: 587,
        secure: false,
        auth: {
          user: 'seu-email@lumen.com', 
          pass: 'sua-senha-ou-token', 
        },
      },
      defaults: {
        from: '"Lumen Plataforma" <seu-email@lumen.com>',
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}