import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, ParseIntPipe } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/GetUser.decorator';
import { RoleGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/Roles.decorator';
@UseGuards(JwtAuthGuard, RoleGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(
    @Body() createClientDto: CreateClientDto,
    @GetUser('companyId') companyId: number,
  ) {
    createClientDto.companyId = companyId;
    return this.clientsService.create(createClientDto);
  }

  // Simplified: only ADMIN can list all clients in the academic version
  @Roles(['ADMIN'])
  @Get()
  findAll(
    @GetUser('companyId') companyId: number,
  ) {
    return this.clientsService.findAll(companyId);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('companyId') companyId: number,
  ) {
    return this.clientsService.findOne(id, companyId);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() createClientDto: CreateClientDto,
    @GetUser('companyId') companyId: number,
  ) {
    createClientDto.companyId = companyId; // Garantir que o companyId é do authenticated user
    return this.clientsService.update(id, createClientDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('companyId') companyId: number,
  ) {
    return this.clientsService.remove(id, companyId);
  }

  @Patch(':id/block')
  blockClient(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('companyId') companyId: number,
  ) {
    return this.clientsService.blockClient(id, companyId);
  }
}
