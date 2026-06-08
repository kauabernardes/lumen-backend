import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm';

import { User } from 'src/schema/user.entity';
import { ParticipantSession } from 'src/schema/participant-session.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(ParticipantSession)
    private readonly participantSessionRepository: Repository<ParticipantSession>,
  ) {}

  async findById(id: string) {
    return this.userRepository.findOne({
      where: { id },

      select: {
        id: false,
        username: true,
        email: true,
        profileImage: true,
      },
    });
  }
  async editProfile(
    userId: string,
    updateData: { username?: string; email?: string },
    file?: Express.Multer.File,
  ) {
    if (!userId) {
      throw new BadRequestException(
        'ID do usuário não fornecido ou inválido para atualização.',
      );
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (updateData.email && updateData.email !== user.email) {
      const emailExists = await this.userRepository.findOne({
        where: { email: updateData.email },
      });
      if (emailExists) {
        throw new ConflictException(
          'Este email já está em uso por outro usuário.',
        );
      }
    }

    if (updateData.username && updateData.username !== user.username) {
      const usernameExists = await this.userRepository.findOne({
        where: { username: updateData.username },
      });
      if (usernameExists) {
        throw new ConflictException('Este username já está em uso.');
      }
    }

    let newProfileImage = user.profileImage;

    if (file) {
      if (!file.buffer) {
        throw new BadRequestException(
          'O arquivo enviado está corrompido ou vazio (Buffer não encontrado).',
        );
      }

      const uploadDir = path.join(process.cwd(), 'uploads');

      await fs.mkdir(uploadDir, { recursive: true });

      if (user.profileImage) {
        try {
          await fs.unlink(path.join(uploadDir, user.profileImage));
        } catch (err) {
          console.error(
            `Aviso ao excluir imagem antiga (pode não existir no disco): ${err.message}`,
          );
        }
      }

      const fileName = `profile_${userId}_${Date.now()}.webp`;
      const outputPath = path.join(uploadDir, fileName);

      await sharp(file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outputPath);

      newProfileImage = fileName;
    }

    const finalUsername =
      updateData.username && updateData.username.trim() !== ''
        ? updateData.username
        : user.username;
    const finalEmail =
      updateData.email && updateData.email.trim() !== ''
        ? updateData.email
        : user.email;

    await this.userRepository.update(
      { id: userId },
      {
        username: finalUsername,
        email: finalEmail,
        profileImage: newProfileImage,
      },
    );

    return {
      message: 'Perfil atualizado com sucesso',
      user: {
        username: finalUsername,
        email: finalEmail,
        imgProfile: newProfileImage ? `uploads/${newProfileImage}` : null,
      },
    };
  }

  async getUserProfile(profileUserId: string) {
    const user = await this.userRepository.findOne({
      where: {
        id: profileUserId,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return {
      username: user.username,
      email: user.email,
      imgProfile: user.profileImage ? `uploads/${user.profileImage}` : null,
    };
  }

  async getMonthlyStudyChart(userId: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 a 11

    const startDate = new Date(currentYear, currentMonth, 1);

    const endDate = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const rawData = await this.participantSessionRepository
      .createQueryBuilder('ps')
      .select('EXTRACT(DAY FROM ps.createdAt)', 'day')
      .addSelect('SUM(ps.time)', 'totalSeconds')
      .where('ps.userId = :userId', { userId })
      .andWhere('ps.createdAt >= :startDate', { startDate })
      .andWhere('ps.createdAt <= :endDate', { endDate })
      .groupBy('EXTRACT(DAY FROM ps.createdAt)')
      .getRawMany();

    const daysInMonth = endDate.getDate();
    let chartData: {
      day: number;
      timeInMinutes: number;
      timeInSeconds: number;
    }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const record = rawData.find((d) => Number(d.day) === day);

      const seconds = record ? Number(record.totalSeconds) : 0;

      chartData.push({
        day: day,
        timeInMinutes: Math.floor(seconds / 60),
        timeInSeconds: seconds,
      });
    }

    return {
      month: currentMonth + 1,
      year: currentYear,
      data: chartData,
    };
  }
}
