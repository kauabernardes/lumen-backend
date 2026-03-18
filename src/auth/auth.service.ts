import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

@Injectable()
export class AuthService {

  private attempts = new Map<string, number>()

  constructor(private prisma: PrismaService) {}

  async register(data: any) {
    const { email, username, password } = data || {}

    if (!email || !password) {
      throw new BadRequestException('Dados de registro incompletos. Verifique o corpo da requisição.')
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

  async login(identifier: string, password: string, ip: string) {
    const count = this.attempts.get(ip) || 0

    if (count >= 5) {
      throw new UnauthorizedException('Muitas tentativas. Tente novamente.')
    }

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { username: identifier }
        ]
      }
    })

    const fakeHash = '$2b$12$CwTycUXWue0Thq9StjUM0uJ8v9Z7y1Y7l9J7l9J7l9J7l9J7l9J7l'

    const hash = user ? user.password : fakeHash

    const isMatch = await bcrypt.compare(password, hash)

    if (!user || !isMatch) {
      this.attempts.set(ip, count + 1)
      await new Promise(r => setTimeout(r, 300))
      throw new UnauthorizedException('Credenciais inválidas')
    }

    this.attempts.delete(ip)

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username
      },
      'segredo',
      { expiresIn: '1h' }
    )

    return {
      access_token: token
    }
  }
}