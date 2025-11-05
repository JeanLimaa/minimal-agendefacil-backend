import { Global, Module } from '@nestjs/common';
import { TransactionService } from './services/transaction-context.service';
import { DatabaseService } from '../services/Database.service';

@Global()
@Module({
  providers: [TransactionService, DatabaseService],
  exports: [TransactionService, DatabaseService],
})
export class CommonModule {}