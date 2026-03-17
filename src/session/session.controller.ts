// session.controller.ts
import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get(':userId')
  async get(@Param('userId') userId: string) {
    return await this.sessionService.online(userId);
  }

  @Post(':sessionId/toggle')
  toggleTimer(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string,
  ) {
    return this.sessionService.toggleTimer(sessionId, userId);
  }

  @Post(':sessionId/break')
  forceBreak(
    @Param('sessionId') sessionId: string,
    @Body() body: { userId: string; type: 'short' | 'long' },
  ) {
    return this.sessionService.forceBreak(sessionId, body.userId, body.type);
  }

  @Post(':sessionId/study')
  forceStudy(
    @Param('sessionId') sessionId: string,
    @Body('userId') userId: string,
  ) {
    return this.sessionService.forceStudy(sessionId, userId);
  }
}
