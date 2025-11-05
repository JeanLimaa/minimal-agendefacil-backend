import { BadRequestException, Injectable, NotFoundException, UnauthorizedException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseService } from 'src/services/Database.service';
import slugify from 'slugify';
import { UpdateCompanyProfileDto } from './dto/update-company-profile.dto';
import { CreateCompanyAddressDTO } from './dto/create-company-address.dto';

// Minimal DTO types for working hours (settings module removed in simplified version)
type DailyWorkingHoursDto = {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
};

type CompanyWorkingHoursDto = {
    serviceInterval?: number;
    workingHours: DailyWorkingHoursDto[];
};
import { parseTimeToMinutes, validateTimeRange, validateDayOfWeek } from 'src/common/helpers/time.helper';
import { TransactionService } from '../../common/services/transaction-context.service';

@Injectable()
export class CompanyService {
    private readonly logger = new Logger(CompanyService.name);

    constructor(
        private readonly prisma: DatabaseService,
        private readonly transactionService: TransactionService,
    ) { }

    public async getCompanyAvailableTimes(companyId: number) {
        return { availableTimes: ['09:00', '10:00', '11:00', '14:00', '15:00'] };
    }

    public async createCompany(
        data: Omit<Prisma.CompanyCreateInput, 'link'>
    ) {
        try {
            const prisma = this.transactionService.getPrismaInstance();

            this.logger.log('Starting company creation', { email: data.email, name: data.name });

            const link = await this.generateUniqueLink(data.name);

            if (!link) {
                this.logger.error('Failed to generate unique link for company', '', { name: data.name });
                throw new BadRequestException('Não foi possível gerar um link único para a empresa');
            }

            // Verificar se empresa com email já existe
            const existingCompany = await prisma.company.findFirst({
                where: { email: data.email }
            });

            if (existingCompany) {
                this.logger.warn('Attempt to create company with existing email', { email: data.email });
                throw new UnauthorizedException('Empresa com esse e-mail já existe');
            }

            const company = await prisma.company.create({
                data: {
                    ...data,
                    link
                }
            });

            this.logger.log('Company created successfully', { 
                companyId: company.id, 
                email: data.email,
                link: company.link 
            });

            // Popular horários de funcionamento iniciais
            await this.createInitialCompanyWorkingHours(company.id);

            this.logger.log('Initial working hours created for company', { companyId: company.id });

            return company;
        } catch (error) {
            this.logger.error('Company creation failed', error.stack, { email: data.email, name: data.name });
            throw error;
        }
    }

    public async getCompanyServices(companyId: number) {
        const services = await this.prisma.service.findMany({
            where: {
                companyId,
                isActive: true
            }
        });
        return services;
    }

    public async getCompanyWorkingHours(companyId: number) {
        const workingHours = await this.prisma.companyWorkingHour.findMany({
            where: { companyId },
            orderBy: { dayOfWeek: 'asc' }
        });

        return workingHours.map(hour => ({
            dayOfWeek: hour.dayOfWeek,
            startTime: hour.startTime,
            endTime: hour.endTime
        }));
    }

    public async findCompanyById(id: number) {
        try {
            this.logger.log('Finding company by ID', { companyId: id });

            const company = await this.prisma.company.findUnique({
                where: { id }
            });

            if (company) {
                this.logger.log('Company found successfully', { companyId: id });
            } else {
                this.logger.warn('Company not found', { companyId: id });
            }

            return company;
        } catch (error) {
            this.logger.error('Error finding company by ID', error.stack, { companyId: id });
            throw error;
        }
    }

    public async findCompanyIdByUserId(userId: number) {
        const prisma = this.transactionService.getPrismaInstance();

        const user = await prisma.user.findFirst({
            where: {
                id: userId
            }
        });

        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado');
        }

        return user.companyId;
    }

    public async getCompanyByName(name: string) {
        const company = await this.prisma.company.findFirst({
            where: {
                name: name
            }
        });

        if (!company) {
            throw new UnauthorizedException('Empresa não encontrada');
        }

        return company;
    }

    public async updateCompanyProfile(companyId: number, data: UpdateCompanyProfileDto) {
        try {
            this.logger.log('Starting company profile update', { companyId });

            const prisma = this.transactionService.getPrismaInstance();
            
            const result = await this.transactionService.runInTransaction(async () => {
                // Atualizar dados da empresa
                const company = await prisma.company.update({
                    where: { id: companyId },
                    data: {
                        name: data.profile.name,
                        phone: data.profile.phone,
                        email: data.profile.email,
                        description: data?.profile.description,
                    },
                });

                this.logger.log('Company profile updated successfully', {
                    companyId,
                    name: data.profile.name
                });

                // Atualizar endereço da empresa
                await this.createOrUpdateCompanyAddress(companyId, data.address, prisma);

                this.logger.log('Company address updated successfully', { companyId });

                return company;
            });

            return result;
        } catch (error) {
            this.logger.error('Company profile update failed', error.stack, { companyId });
            throw error;
        }
    }

    public async getCompanyInfo(companyId: number) {
        const company = await this.prisma.company.findUniqueOrThrow({
            where: { id: companyId }
        });

        const companyData = {
            name: company.name,
            email: company.email,
            phone: company.phone,
            description: company.description,
        }

        const companyAddress = await this.prisma.companyAddress.findFirst({
            where: { companyId }
        });

        const companyAddressData = {
            zipCode: companyAddress?.zipCode || '',
            street: companyAddress?.street || '',
            number: companyAddress?.number || '',
            neighborhood: companyAddress?.neighborhood || '',
            city: companyAddress?.city || '',
            state: companyAddress?.state || '',
            country: companyAddress?.country || ''
        }

        return {
            profile: companyData,
            address: companyAddress ? companyAddressData : null,
            schedule: {
                workingHours: await this.getCompanyWorkingHours(companyId),
                serviceInterval: company.intervalBetweenAppointments
            }
        };
    }

    public async getCompanyByLinkName(linkName: string) {
        const company = await this.prisma.company.findFirst({
            where: {
                link: linkName
            },
            include: {
                companyAddress: true,
                companyWorkingHours: {
                    orderBy: { dayOfWeek: 'asc' }
                },
            }
        });

        if (!company) {
            throw new NotFoundException('Empresa não encontrada');
        }

        return company;
    }

    public async updateCompanyWorkingHours(
        companyId: number,
        data: CompanyWorkingHoursDto
    ) {
        try {
            const prisma = this.transactionService.getPrismaInstance();

            this.logger.log('Starting company working hours update', { 
                companyId, 
                workingHoursCount: data.workingHours.length 
            });

            // Verificar se a empresa existe
            const company = await this.prisma.company.findUnique({
                where: { id: companyId }
            });

            if (!company) {
                this.logger.warn('Company not found for working hours update', { companyId });
                throw new NotFoundException('Empresa não encontrada');
            }

            const result = await this.transactionService.runInTransaction(async () => {
                // Atualizar intervalo entre atendimentos
                await this.updateServiceInterval(prisma, companyId, data.serviceInterval);

                const incomingDays = data.workingHours.map(hour => hour.dayOfWeek);

                // Deletar horários antigos que não estão mais presentes
                await this.removeOldWorkingHours(prisma, companyId, incomingDays);

                // Upsert dos horários enviados
                await this.upsertCompanyWorkingHours(prisma, companyId, data.workingHours);

                return { success: true };
            });

            return result;
        } catch (error) {
            this.logger.error('Company working hours update failed', error.stack, { companyId });
            throw error;
        }
    }

    private async createOrUpdateCompanyAddress(companyId: number, data: CreateCompanyAddressDTO, prisma: Prisma.TransactionClient = this.prisma) {
        const company = await prisma.company.findUnique({
            where: { id: companyId }
        });

        if (!company) {
            throw new NotFoundException('Empresa não encontrada');
        }

        const companyAddress = await prisma.companyAddress.findFirst({
            where: { companyId }
        });

        if (companyAddress) {
            return prisma.companyAddress.update({
                where: { companyId },
                data: {
                    zipCode: data.zipCode,
                    street: data.street,
                    number: data.number,
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state,
                    country: data.country
                }
            });
        } else {
            return prisma.companyAddress.create({
                data: {
                    companyId,
                    zipCode: data.zipCode,
                    street: data.street,
                    number: data.number,
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state,
                    country: data.country
                }
            });
        }
    }

    private async createInitialCompanyWorkingHours(companyId: number) {
        const prisma = this.transactionService.getPrismaInstance();

        const data: DailyWorkingHoursDto[] = Array.from({ length: 5 }, (_, i) => ({
            dayOfWeek: i + 1, // 1 a 5 (segunda a sexta)
            startTime: '08:00',
            endTime: '17:00'
        }));

        return await prisma.companyWorkingHour.createMany({
            data: data.map(hour => ({
                companyId,
                dayOfWeek: hour.dayOfWeek,
                startTime: hour.startTime,
                endTime: hour.endTime
            })),
        });
    }

    private async updateServiceInterval(
        prisma: Prisma.TransactionClient,
        companyId: number,
        serviceInterval?: number
    ): Promise<void> {
        if (serviceInterval && serviceInterval >= 0) {
            await prisma.company.update({
                where: { id: companyId },
                data: { intervalBetweenAppointments: serviceInterval }
            });

            this.logger.log('Service interval updated', {
                companyId,
                serviceInterval
            });
        }
    }

    private async removeOldWorkingHours(
        prisma: Prisma.TransactionClient,
        companyId: number,
        incomingDays: number[]
    ): Promise<void> {
        const deletedHours = await prisma.companyWorkingHour.deleteMany({
            where: {
                companyId,
                dayOfWeek: { notIn: incomingDays }
            }
        });

        this.logger.log('Old working hours deleted', {
            companyId,
            deletedCount: deletedHours.count
        });
    }

    private async upsertCompanyWorkingHours(
        prisma: Prisma.TransactionClient,
        companyId: number,
        workingHours: DailyWorkingHoursDto[]
    ): Promise<void> {
        for (const hour of workingHours) {
            // Validar DayOfWeek
            validateDayOfWeek(hour.dayOfWeek);

            // Validar formato e range dos horários
            validateTimeRange(hour.startTime, hour.endTime);

            await prisma.companyWorkingHour.upsert({
                where: {
                    companyId_dayOfWeek: {
                        companyId,
                        dayOfWeek: hour.dayOfWeek
                    }
                },
                update: {
                    startTime: hour.startTime,
                    endTime: hour.endTime
                },
                create: {
                    companyId,
                    dayOfWeek: hour.dayOfWeek,
                    startTime: hour.startTime,
                    endTime: hour.endTime
                }
            });
        }

        this.logger.log('Working hours updated successfully', {
            companyId,
            workingHoursCount: workingHours.length
        });
    }

    private async isLinkExists(link: string): Promise<boolean> {
        const company = await this.prisma.company.findUnique({
            where: { link },
        });

        return !!company;
    }

    private async generateUniqueLink(companyName: string): Promise<string> {
        // 1. Transforma o nome da empresa em "slug"
        let baseLink = slugify(companyName, { lower: true, strict: true });

        // 2. Verificar se o link já existe no banco de dados
        // caso o link com o nome nao exista, retorna o link
        const linkExists = await this.isLinkExists(baseLink);
        if (!linkExists) {
            return baseLink;
        }

        // 3. Caso o link já exista, adicionar um contador ao final do link
        let link = baseLink;
        let counter = 1;

        while (await this.isLinkExists(link)) {
            link = `${baseLink}${counter}`;
            counter++;
        }

        return link;
    }
}
