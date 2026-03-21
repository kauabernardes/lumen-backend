// session.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('session')
@UseGuards(AuthGuard)
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get('current')
  async get(@Req() req: any) {
    const userId = req.user.sub;
    return await this.sessionService.online(userId);
  }
  @Post(':sessionId/toggle')
  toggleTimer(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.sessionService.toggleTimer(sessionId, userId);
  }

  @Post(':sessionId/break')
  forceBreak(
    @Param('sessionId') sessionId: string,
    @Body() body: { type: 'short' | 'long' },
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.sessionService.forceBreak(sessionId, userId, body.type);
  }

  @Post(':sessionId/study')
  forceStudy(@Param('sessionId') sessionId: string, @Req() req: any) {
    const userId = req.user.sub;
    return this.sessionService.forceStudy(sessionId, userId);
  }
}
