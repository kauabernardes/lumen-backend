import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  Patch,
  UseInterceptors,
  UploadedFile,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get(':id')
  async getUser(@Param('id') id: string, @Req() req) {
    return this.userService.getUserProfile(id);
  }

  @UseGuards(AuthGuard)
  @Patch('profile')
  @UseInterceptors(FileInterceptor('file')) // "file" deve ser o mesmo nome no FormData do front
  async editProfile(
    @Req() req,
    @Body() body: { username?: string; email?: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.userService.editProfile(req.user.sub, body, file);
  }

  @Get(':id/session/stats/')
  @UseGuards(AuthGuard)
  async getMonthlyChart(@Param('id') id: string) {
    return this.userService.getMonthlyStudyChart(id);
  }
}
