import { Module } from '@nestjs/common';
import { ServiceController } from './service.controller';
import { ServiceService } from './service.service';
import { DatabaseService } from 'src/services/Database.service';

@Module({
  imports: [],
  controllers: [ServiceController],
  providers: [ServiceService, DatabaseService],
  exports: [ServiceService],
})
export class ServiceModule {}