import { SessionWhereUniqueInput } from './../../generated/prisma/models/Session';
import { Injectable } from '@nestjs/common';
import { Prisma, Session } from 'generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private prisma: PrismaService) {}

  async online(userId: string): Promise<string | null> {
    const response: Session | null = await this.prisma.session.findFirst({
      where: {
        hostId: userId,
        finishedAt: null,
      },
    });
    return response?.id || null;
  }

  async create(data: Prisma.SessionCreateInput): Promise<Session> {
    const response: Session = await this.prisma.session.create({ data });
    return response;
  }
}
