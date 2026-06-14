import { Module } from '@nestjs/common';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgendaEvent } from 'src/schema/agenda.enity';

@Module({
  imports: [TypeOrmModule.forFeature([AgendaEvent])],
  controllers: [AgendaController],
  providers: [AgendaService],
})
export class AgendaModule {}
