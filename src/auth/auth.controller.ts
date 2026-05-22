import { Body, Controller, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: any) {
    console.log(`[Auth] Login attempt for ${body.identifier} from IP ${req.ip}`);
    return this.authService.login(body.identifier, body.password, req.ip);
  }
}
