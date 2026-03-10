import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {

  constructor(private prisma: PrismaService) {}

  async register(data: any) {
   
    const { email, username, name, password } = data || {};

    if (!email || !password) {
      throw new BadRequestException('Dados de registro incompletos. Verifique o corpo da requisição.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    })

    const hash = await bcrypt.hash(password, 12)

    if (!existingUser) {
      await this.prisma.user.create({
        data: {
          email,
          username,
          name,
          password: hash
        }
      })
    }

    return {
      message: "Se os dados forem válidos, sua conta será criada."
    }
  }
}