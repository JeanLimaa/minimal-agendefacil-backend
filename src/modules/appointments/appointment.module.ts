import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { DatabaseService } from 'src/services/Database.service';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [
    ClientsModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService, DatabaseService],
  exports: [AppointmentService],
})
export class AppointmentModule {}
