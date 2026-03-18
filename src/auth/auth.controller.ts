import { Body, Controller, Post, Req } from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'

@Controller('auth')
export class AuthController {

  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() data: RegisterDto) {
    return this.authService.register(data)
  }

  @Post('login')
  async login(@Body() body: any, @Req() req: any) {
    return this.authService.login(body.identifier, body.password, req.ip)
  }

}