import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { SkipAuth } from './common/decorators/SkipAuth.decorator';
import { Platform } from '@prisma/client';


@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @SkipAuth()
  @Get('version/validate')
  validateVersion(@Query('version') version: string, @Query('platform') platform: Platform) {
    if(!platform) {
      throw new BadRequestException('Plataforma não fornecida');
    }

    if(!version) {
      throw new BadRequestException('Versão não fornecida');
    }

    return this.appService.validateVersion(version, platform);
  }
}
