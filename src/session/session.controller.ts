import { SessionService } from './session.service';
import { Controller, Get, Param } from '@nestjs/common';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':userId')
  async get(@Param('userId') userId: string) {
    return await this.sessionService.online(userId);
  }
}
