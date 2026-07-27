import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import type { AuthenticatedUser, AuthSession } from './auth.types';
import { AuthUser } from './auth-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  register(@Body() input: RegisterDto): Promise<AuthSession> {
    return this.authService.register(input);
  }

  @Post('login')
  @Public()
  @HttpCode(200)
  login(@Body() input: LoginDto): Promise<AuthSession> {
    return this.authService.login(input);
  }

  @Get('me')
  getCurrentUser(@AuthUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
