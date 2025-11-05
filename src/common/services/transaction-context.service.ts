import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseService } from '../../services/Database.service';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  private readonly asyncLocalStorage = new AsyncLocalStorage<Prisma.TransactionClient>();

  // Executa código dentro de um contexto de transação
  async runInTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return this.asyncLocalStorage.run(tx, callback);
    });
  }

  // Retorna a instância do Prisma (transação ou normal)
  getPrismaInstance(): PrismaClient | Prisma.TransactionClient {
    const tx = this.asyncLocalStorage.getStore();
    return tx || this.prisma;
  }

  constructor(private readonly prisma: DatabaseService) {}
}