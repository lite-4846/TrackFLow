import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SignUpDto } from './auth.dto';
import { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  async signUp(@Body() dto: SignUpDto) {
    return { token: await this.authService.signUp(dto.email, dto.password) };
  }

  @Post('login')
  async logIn(@Body() dto: LoginDto) {
    return { token: await this.authService.logIn(dto.email, dto.password) };    
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  protected(@Req() req: Request) {
    return { message: 'This is protected route', user: req.user };
  }
}
