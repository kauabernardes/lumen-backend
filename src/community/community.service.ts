import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Create } from './dto/create.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: Create, userId: string) {
    try {
      const exist = await this.prisma.community.findFirst({
        where: {
          name: payload.name,
        },
      });
      if (exist) {
        throw new ConflictException('Comunidade com esse nome já existe');
      }

      const community = await this.prisma.community.create({
        data: {
          name: payload.name,
          description: payload.description || '',
          authorId: userId,
        },
      });
      return {
        message: 'Comunidade criada com sucesso',
        community: community,
      };
    } catch (error) {
      throw error;
    }
  }
}
