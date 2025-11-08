import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { BlockAppointmentDto } from './dto/block-appointment.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/GetUser.decorator';
import { SkipAuth } from 'src/common/decorators/SkipAuth.decorator';
import { CreateAdminAppointmentDto, CreateClientAppointmentDto } from './dto/create-appointment.dto';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard)
@Controller('appointment')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
  ) {}

  @SkipAuth()
  @Get("/pending")
  findAll() {
    return this.appointmentService.listPendingAppointments();
  }

  @Patch("complete/:id")
  public async markAsCompleted(
    @Param('id', ParseIntPipe) id: number,
    @GetUser("companyId", ParseIntPipe) companyId: number,
  ) {
    return await this.appointmentService.markAsCompleted(id, companyId);
  }

  @Patch("cancel/:id")
  public async markAsCanceled(
    @Param('id', ParseIntPipe) id: number,
    @GetUser("companyId", ParseIntPipe) companyId: number,
  ) {
    return await this.appointmentService.markAsCanceled(id, companyId);
  }

  @Get('/company')
  findAllByCompany(
    @GetUser("companyId", ParseIntPipe) companyId: number
  ) {
    return this.appointmentService.findAllByCompany(companyId);
  }

  @Get('/client/:clientId')
  findAllByClient(
    @Param('clientId', ParseIntPipe) clientId: number,
    @GetUser("companyId", ParseIntPipe) companyId: number
  ) {
    return this.appointmentService.findAllByClient(clientId, companyId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.findAppointmentById(id);
  }

  @SkipAuth()
  @Post('client')
  createClientAppointment(@Body() createClientAppointmentDto: CreateClientAppointmentDto) {
    return this.appointmentService.createAppointment(createClientAppointmentDto, 'client');
  }

  @Post('admin')
  createAdminAppointment(
    @Body() createAdminAppointmentDto: CreateAdminAppointmentDto,
    @GetUser("role") role: Role
  ) {
    return this.appointmentService.createAppointment(createAdminAppointmentDto, 'admin', role);
  }

  @Post('block')
  createBlock(
    @Body() dto: BlockAppointmentDto,
    @GetUser("companyId", ParseIntPipe) companyId: number
  ) {
    return this.appointmentService.createBlock(dto, companyId);
  }

  @Get('blocks/company')
  findBlocksByCompany(
    @GetUser("companyId", ParseIntPipe) companyId: number
  ) {
    return this.appointmentService.findBlocksByCompany(companyId);
  }

  @Delete('block/:id')
  deleteBlock(
    @Param('id', ParseIntPipe) id: number,
    @GetUser("companyId", ParseIntPipe) companyId: number
  ) {
    return this.appointmentService.deleteBlock(id, companyId);
  }

  @Put('admin/:id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAppointmentDto: CreateAdminAppointmentDto,
    @GetUser("role") role: Role,
  ) {
    return this.appointmentService.updateAppointment(id, updateAppointmentDto, role);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.appointmentService.deleteAppointment(id);
  }
}
