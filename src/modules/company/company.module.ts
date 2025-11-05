import { Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { DatabaseService } from 'src/services/Database.service';
import { CompanyController } from './company.controller';

@Module({
  imports: [],
  providers: [CompanyService, DatabaseService],
  controllers: [CompanyController],
  exports: [CompanyService],
})
export class CompanyModule {}
