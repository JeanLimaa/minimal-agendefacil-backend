import { Controller, Post, Body, UseGuards, Req, Get, Put } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserLoginDto } from './dto/user-login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/GetUser.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: UserLoginDto) {
    return this.authService.login(body);
  }

  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@GetUser("userId") userId: number) {
    return this.authService.getMe(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @GetUser("userId") userId: number,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }
}