import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ServiceModule } from './modules/service/service.module';
import { CompanyModule } from './modules/company/company.module';
import { AppointmentModule } from './modules/appointments/appointment.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    CommonModule,
    AuthModule,
    UserModule, 
    ServiceModule, 
    CompanyModule,
    AppointmentModule,
    ClientsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
