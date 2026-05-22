import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { AddThemeDTO } from './dto/add-theme.dto';

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

  @Get(':sessionId/participants')
  async getParticipants(@Param('sessionId') sessionId: string) {
    return await this.sessionService.getParticipants(sessionId);
  }

  @Post(':sessionId/add/theme')
  async addTheme(
    @Param('sessionId') sessionId: string,
    @Body() body: AddThemeDTO,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return await this.sessionService.addTheme(sessionId, userId, body.theme);
  }
}