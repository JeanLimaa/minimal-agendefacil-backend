import { BadRequestException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { Service } from '@prisma/client';
import { DatabaseService } from 'src/services/Database.service';
import { CreateServiceDTO } from './dto/create-service.dto';
import { UpdateServiceDTO } from './dto/update-service.dto';
import { TransactionService } from 'src/common/services/transaction-context.service';

@Injectable()
export class ServiceService {
    private readonly logger = new Logger(ServiceService.name);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly transactionService: TransactionService
    ) {}
    
    public async create(data: CreateServiceDTO, companyId: number): Promise<Service> {
        try {
            const prisma = this.transactionService.getPrismaInstance();

            this.logger.log('Creating new service', { 
                serviceName: data.details.name, 
                companyId 
            });

            const existingService = await prisma.service.findFirst({
                where: {
                    name: data.details.name,
                    companyId
                }
            });

            if (existingService) {
                this.logger.warn('Service name already exists', { 
                    serviceName: data.details.name, 
                    companyId, 
                    existingServiceId: existingService.id 
                });
                throw new BadRequestException('Serviço com esse nome já existe');
            }

            if(data.pricing.price <= 1) {
                this.logger.warn('Invalid service price', { 
                    serviceName: data.details.name, 
                    companyId 
                });
                throw new BadRequestException('O preço do serviço deve ser maior ou igual a R$ 1,00');
            }

            const service = await this.prisma.service.create({
                data: {
                    ...data.details,
                    ...data.pricing,
                    companyId
                }
            });

            this.logger.log('Service created successfully', { 
                serviceId: service.id, 
                serviceName: service.name, 
                companyId 
            });

            return service;
        } catch (error) {
            this.logger.error('Error creating service', error.stack, { 
                serviceName: data.details.name, 
                companyId 
            });
            throw error;
        }
    }

    public async update(id: number, data: UpdateServiceDTO, companyId: number): Promise<Service> {
        try {
            this.logger.log('Updating service', { serviceId: id, companyId });

            const service = await this.prisma.service.findUnique({
                where: { id }
            })

            if (!service) {
                this.logger.warn('Service not found for update', { serviceId: id, companyId });
                throw new NotFoundException('Serviço não encontrado');
            }

            if(service.companyId !== companyId) {
                this.logger.warn('Unauthorized service update attempt', { 
                    serviceId: id, 
                    serviceCompanyId: service.companyId, 
                    requestCompanyId: companyId 
                });
                throw new BadRequestException('Você não tem permissão para editar este serviço');
            }

            if(data.pricing.price <= 1) {
                this.logger.warn('Invalid service price', { 
                    serviceName: data.details.name, 
                    companyId 
                });
                throw new BadRequestException('O preço do serviço deve ser maior ou igual a R$ 1,00');
            }
            
            const updatedService = await this.prisma.service.update({
                where: { id },
                data: {
                    ...data.details,
                    ...data.pricing
                },
            });

            this.logger.log('Service updated successfully', { 
                serviceId: id, 
                serviceName: updatedService.name, 
                companyId 
            });

            return updatedService;
        } catch (error) {
            this.logger.error('Error updating service', error.stack, { serviceId: id, companyId });
            throw error;
        }
    }

    public async delete(id: number): Promise<Service> {
        try {
            this.logger.log('Deleting service (soft delete)', { serviceId: id });

            const service = await this.prisma.service.findUnique({
                where: { id }
            })

            if (!service) {
                this.logger.warn('Service not found for deletion', { serviceId: id });
                throw new NotFoundException('Serviço não encontrado');
            }

            const deletedService = await this.prisma.service.update({
                where: { id },
                data: {
                    deletedAt: new Date(),
                    isActive: false
                }
            });

            this.logger.log('Service deleted successfully (soft delete)', { 
                serviceId: id, 
                serviceName: service.name, 
                companyId: service.companyId 
            });

            return deletedService;
        } catch (error) {
            this.logger.error('Error deleting service', error.stack, { serviceId: id });
            throw error;
        }
    }

    public async listByCompanyId(companyId: number): Promise<Service[]> {
        try {
            this.logger.log('Listing services by company', { companyId });

            const services = await this.prisma.service.findMany({
                where: {
                    companyId: companyId, 
                    isActive: true
                }
            });

            this.logger.log('Services listed successfully by company', { 
                companyId, 
                serviceCount: services.length 
            });

            return services;
        } catch (error) {
            this.logger.error('Error listing services by company', error.stack, { companyId });
            throw error;
        }
    }

    public async getById(id: number): Promise<Service> {
        try {
            this.logger.log('Getting service by ID', { serviceId: id });

            const service = await this.prisma.service.findUniqueOrThrow({
                where: { id, isActive: true }
            });

            this.logger.log('Service retrieved successfully', { 
                serviceId: id, 
                serviceName: service.name, 
                companyId: service.companyId 
            });

            return service;
        } catch (error) {
            this.logger.error('Error getting service by ID', error.stack, { serviceId: id });
            throw error;
        }
    }

    public async getByIds(ids: number[]): Promise<Service[]> {
        try {
            const services = await this.prisma.service.findMany({
                where: {
                    id: { in: ids },
                    isActive: true
                }
            });

            return services;
        } catch (error) {
            throw error;
        }
    }
}
