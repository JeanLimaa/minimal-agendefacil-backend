import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { DatabaseService } from 'src/services/Database.service';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService, DatabaseService],
  exports: [ClientsService],
})
export class ClientsModule {}
