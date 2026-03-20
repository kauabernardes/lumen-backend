import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Create } from './dto/create.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: Create, userId: string) {
    try {
      const community = await this.prisma.community.create({
        data: {
          name: payload.name,
          description: payload.description,
          authorId: userId,
        },
      });
      return {
        message: 'Comunidade criada com sucesso',
        community: community,
      };
    } catch (error) {
      console.error('Erro ao criar comunidade:', error);
      throw error;
    }
  }
}
