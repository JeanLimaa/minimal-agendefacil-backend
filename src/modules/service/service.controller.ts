import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CompanyService } from '../company/company.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateServiceDTO } from './dto/create-service.dto';
import { UpdateServiceDTO } from './dto/update-service.dto';
import { ParseIntPipe } from '@nestjs/common';
import { GetUser } from 'src/common/decorators/GetUser.decorator';

@Controller('services')
export class ServiceController {
    constructor(
        private readonly serviceService: ServiceService,
    ) {}

    @UseGuards(JwtAuthGuard)
    @Post()
    public async create(
        @Body() body: CreateServiceDTO,
        @GetUser("companyId") companyId: number,
    ){
        return await this.serviceService.create(body, companyId);
    }

    @UseGuards(JwtAuthGuard)
    @Put(":id")
    public async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateServiceDTO,
        @GetUser("companyId") companyId: number,
    ){
        return await this.serviceService.update(id, body, companyId);
    }

    @UseGuards(JwtAuthGuard)
    @Delete(":id")
    public async delete(
        @Param('id', ParseIntPipe) id: number,
    ){
        return await this.serviceService.delete(id);
    }

    @Get("/list/company/:companyId")
    public async listByCompanyId(
        @Param('companyId', ParseIntPipe) companyId: number,
    ){
        return await this.serviceService.listByCompanyId(companyId);
    }
    

    @UseGuards(JwtAuthGuard)
    @Get()
    public async listAll(
        @GetUser("companyId") companyId: number,
    ){
        return await this.serviceService.listByCompanyId(companyId);
    }

    @Get(":id")
    public async getById(
        @Param('id', ParseIntPipe) id: number,
    ){
        return await this.serviceService.getById(id);
    }
}