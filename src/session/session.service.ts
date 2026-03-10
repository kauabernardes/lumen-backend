import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Prisma, Session } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async online(userId: string): Promise<string | null> {
    try {
      const response = await this.prisma.session.findFirst({
        where: {
          hostId: userId,
          finishedAt: null,
        },
      });
      return response?.id || null;
    } catch (error) {
      console.error('Erro ao buscar sessão online:', error);
      throw new InternalServerErrorException('Erro ao buscar sessão.');
    }
  }

  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    try {
      return await this.prisma.session.create({ data });
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw new InternalServerErrorException(`Erro ao criar sessão: ${error}`);
    }
  }

  async revoke(where: Prisma.SessionWhereUniqueInput): Promise<Session> {
    try {
      return await this.prisma.session.update({
        where: where,
        data: { finishedAt: new Date() },
      });
    } catch (error) {
      console.error('Erro ao revogar sessão:', error);
      throw new InternalServerErrorException(`Erro ao criar sessão: ${error}`);
    }
  }
}
