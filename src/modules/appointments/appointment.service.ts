import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException, HttpException, Logger } from '@nestjs/common';
import { DatabaseService } from 'src/services/Database.service';
import { Appointment, AppointmentStatus, Role } from '@prisma/client';
import { BlockAppointmentDto } from './dto/block-appointment.dto';
import { parseISO, differenceInMinutes } from 'date-fns';
import { sumByProp } from 'src/common/helpers/sumTotal.helper';
import { CreateClientAppointmentDto, CreateAdminAppointmentDto } from './dto/create-appointment.dto';
import { ClientsService } from '../clients/clients.service';

const statusTranslation = {
  [AppointmentStatus.PENDING]: 'Pendente',
  [AppointmentStatus.CONFIRMED]: 'Confirmado',
  [AppointmentStatus.CANCELLED]: 'Cancelado',
  [AppointmentStatus.COMPLETED]: 'Concluído',
};

type AppointmentType = 'client' | 'admin';

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly clientsService: ClientsService
  ) {}

  public async createAppointment(
    data: CreateAdminAppointmentDto | CreateClientAppointmentDto, 
    type: AppointmentType, 
    role?: Role
  ): Promise<Appointment> {
    try {
      if(type === 'admin' && data instanceof CreateClientAppointmentDto) {
        throw new InternalServerErrorException('Dados inválidos para criação de agendamento administrativo.');
      } else if (type === 'client' && data instanceof CreateAdminAppointmentDto) {
        throw new InternalServerErrorException('Dados inválidos para criação de agendamento via cliente.');
      }

      this.logger.log('Creating new appointment', { 
        companyId: (data as CreateClientAppointmentDto).companyId || 'from admin', 
        serviceIds: data.serviceIds, 
        role 
      });

      return await this.prisma.$transaction(async (prismaTransaction) => {
        let clientId: number;
        let companyId: number;

        if (type === 'admin') {
          const adminData = data as CreateAdminAppointmentDto;
          clientId = adminData.clientId;
          
          // Busca o companyId do cliente
          const client = await prismaTransaction.client.findUnique({
            where: { id: clientId },
            select: { companyId: true },
          });
          
          if (!client) {
            throw new BadRequestException('Cliente não encontrado.');
          }
          
          companyId = client.companyId;
        } else {
          // type === 'client'
          const clientData = data as CreateClientAppointmentDto;
          companyId = clientData.companyId;

          const client = await this.clientsService.create({
            name: clientData.clientName, 
            phone: clientData.clientPhone, 
            email: clientData.clientEmail, 
            companyId
          });
          
          clientId = client.id;
        }

        const appointmentData = await this.prepareAppointmentData(data, type, clientId, companyId, role);

        const appointment = await prismaTransaction.appointment.create({
          data: appointmentData,
        });
    
        // Cria os relacionamentos com os serviços
        await prismaTransaction.appointmentService.createMany({
          data: data.serviceIds.map((serviceId) => ({
            appointmentId: appointment.id,
            serviceId,
          })),
        });
    
        return appointment;
      });
    } catch (error) {
      if(error instanceof InternalServerErrorException || error instanceof BadRequestException) {
        this.logger.error('Error creating appointment', error.stack, { 
          companyId: (data as CreateClientAppointmentDto).companyId, 
          role 
        });
      } else {
        this.logger.warn('Error creating appointment', { 
          companyId: (data as CreateClientAppointmentDto).companyId, 
          role, 
          errorMessage: error.message 
        });
      }
      throw error;
    }
  }

  public async createBlock(dto: BlockAppointmentDto, companyId: number): Promise<Appointment> {
    try {
      this.logger.log('Creating block appointment', { 
        companyId, 
        startDate: dto.startDate, 
        endDate: dto.endDate 
      });
      
      // Verifica se a empresa existe
      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
      });
      
      if (!company) {
        throw new BadRequestException('Empresa não encontrada.');
      }

      // Busca ou cria o cliente especial "Bloqueio"
      let blockClient = await this.prisma.client.findFirst({
        where: { 
          name: 'Bloqueio',
          companyId,
        },
      });

      if (!blockClient) {
        blockClient = await this.prisma.client.create({
          data: {
            name: 'Bloqueio',
            phone: '0000000000',
            email: 'bloqueio@sistema.com',
            companyId,
            isBlocked: true,
          },
        });
      }

      // Busca ou cria o serviço especial "__BLOCK__"
      let blockService = await this.prisma.service.findFirst({
        where: {
          name: '__BLOCK__',
          companyId,
        },
      });

      if (!blockService) {
        blockService = await this.prisma.service.create({
          data: {
            name: '__BLOCK__',
            description: 'Serviço reservado para bloqueio de horários',
            duration: 0,
            price: 0,
            companyId,
            isActive: false, // Não deve aparecer para clientes
          },
        });
      }

      const start = parseISO(dto.startDate);
      const end = parseISO(dto.endDate);
      const duration = differenceInMinutes(end, start);

      if (duration <= 0) {
        throw new BadRequestException('Data de término deve ser posterior à data de início.');
      }

      // Verifica conflitos de horário
      await this.checkForBlockConflicts(start, end, companyId);

      const appointment = await this.prisma.appointment.create({
        data: {
          date: start,
          clientId: blockClient.id,
          companyId: companyId,
          subTotalPrice: 0,
          discount: 0,
          totalPrice: 0,
          duration: duration,
          status: AppointmentStatus.CONFIRMED,
          notes: 'Bloqueio de agenda',
        },
      });

      this.logger.log('Block appointment created successfully', { 
        appointmentId: appointment.id, 
        companyId: companyId, 
        duration 
      });

      return appointment;
    } catch (error) {
      this.logger.error('Error creating block appointment', error.stack, { companyId });
      throw error;
    }
  }

  private async checkForBlockConflicts(startDate: Date, endDate: Date, companyId: number) {
    const conflicting = await this.prisma.appointment.findFirst({
      where: {
        companyId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
        OR: [
          {
            // Appointment que começa durante o intervalo de bloqueio
            date: {
              gte: startDate,
              lt: endDate,
            },
          },
          {
            // Appointment que começa antes mas termina depois do início do bloqueio
            AND: [
              {
                date: {
                  lt: startDate,
                },
              },
              // Verifica se termina após o início do bloqueio usando duration
              // Não podemos fazer isso diretamente no Prisma, então pegamos os conflitos potenciais
            ],
          },
        ],
      },
      select: {
        id: true,
        date: true,
        duration: true,
      },
    });

    if (conflicting) {
      // Verifica manualmente se o appointment termina após o início do bloqueio
      const appointmentEnd = new Date(conflicting.date.getTime() + conflicting.duration * 60000);
      if (appointmentEnd > startDate) {
        throw new BadRequestException('Já existe um agendamento ou bloqueio para este intervalo.');
      }
    }
  }

  public async updateAppointmentStatus(id: number, status: AppointmentStatus) {
    try {
      this.logger.log('Updating appointment status', { appointmentId: id, newStatus: status });

      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        this.logger.warn('Appointment not found for status update', { appointmentId: id });
        throw new BadRequestException('Agendamento não encontrado.');
      }

      const updatedAppointment = await this.prisma.appointment.update({
        where: { id },
        data: { status },
      });

      this.logger.log('Appointment status updated successfully', { 
        appointmentId: id, 
        oldStatus: appointment.status, 
        newStatus: status 
      });

      return updatedAppointment;
    } catch (error) {
      this.logger.error('Error updating appointment status', error.stack, { appointmentId: id, status });
      throw error;
    }
  }

  public async listPendingAppointments() {
    try {
      this.logger.log('Listing pending appointments');

      const appointments = await this.prisma.appointment.findMany({
        where: { 
          status: AppointmentStatus.PENDING,
          // Exclui bloqueios (appointments com cliente especial "Bloqueio")
          client: {
            name: {
              not: 'Bloqueio',
            },
          },
        },
        include: {
          client: true,
          company: true,
        },
      });

      this.logger.log('Pending appointments retrieved successfully', { 
        appointmentCount: appointments.length 
      });

      return appointments;
    } catch (error) {
      this.logger.error('Error listing pending appointments', error.stack);
      throw error;
    }
  }

  public async findAllByCompany(companyId: number) {
    try {
      this.logger.log('Finding all appointments by company', { companyId });

      const appointments = await this.prisma.appointment.findMany({
        where: {
          companyId,
          // Exclui bloqueios (appointments com cliente especial "Bloqueio")
          client: {
            name: {
              not: 'Bloqueio',
            },
          },
        },
        include: {
          client: true,
          appointmentService: {
            include: {
              service: true,
            },
          },
        },
      });

      const formattedAppointments = appointments.map((appointment) => ({
        ...appointment,
        status: statusTranslation[appointment.status],
        clientName: appointment.client.name,
        services: appointment.appointmentService.map((as) => as.service),
      }));

      this.logger.log('Appointments retrieved successfully by company', { 
        companyId, 
        appointmentCount: appointments.length 
      });

      return formattedAppointments;
    } catch (error) {
      this.logger.error('Error finding appointments by company', error.stack, { companyId });
      throw error;
    }
  }

  public async findAppointmentById(id: number) {
    try {
      this.logger.log('Finding appointment by ID', { appointmentId: id });

      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
        include: {
          client: true,
          company: true,
          appointmentService: {
            include: {
              service: true,
            },
          },
        },
      });

      if (appointment) {
        // Verifica se é um bloqueio
        const isBlock = appointment.client.name === 'Bloqueio';
        
        if (!isBlock) {
          this.logger.log('Appointment found successfully', { 
            appointmentId: id, 
            clientId: appointment.clientId, 
            companyId: appointment.companyId 
          });
        } else {
          this.logger.log('Block appointment found', { appointmentId: id });
        }
      } else {
        this.logger.warn('Appointment not found', { appointmentId: id });
      }

      return appointment;
    } catch (error) {
      this.logger.error('Error finding appointment by ID', error.stack, { appointmentId: id });
      throw error;
    }
  }

  public async deleteAppointment(id: number) {
    try {
      this.logger.log('Deleting appointment', { appointmentId: id });

      const result = await this.prisma.appointment.delete({
        where: { id },
      });

      this.logger.log('Appointment deleted successfully', { 
        appointmentId: id, 
        clientId: result.clientId, 
        companyId: result.companyId 
      });

      return result;
    } catch (error) {
      this.logger.error('Error deleting appointment', error.stack, { appointmentId: id });
      throw error;
    }
  }

  public async findBlocksByCompany(companyId: number) {
    try {
      this.logger.log('Finding blocks by company', { companyId });

      const blocks = await this.prisma.appointment.findMany({
        where: {
          companyId,
          client: {
            name: 'Bloqueio',
          },
        },
        include: {
          client: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      this.logger.log('Blocks found successfully', { 
        companyId, 
        blockCount: blocks.length 
      });

      return blocks;
    } catch (error) {
      this.logger.error('Error finding blocks by company', error.stack, { companyId });
      throw error;
    }
  }

  public async deleteBlock(id: number, companyId: number) {
    try {
      this.logger.log('Deleting block', { blockId: id, companyId });

      // Verifica se o bloqueio existe e pertence à empresa
      const block = await this.prisma.appointment.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

      if (!block) {
        this.logger.warn('Block not found', { blockId: id });
        throw new BadRequestException('Bloqueio não encontrado.');
      }

      if (block.client.name !== 'Bloqueio') {
        this.logger.warn('Attempted to delete non-block appointment as block', { appointmentId: id });
        throw new BadRequestException('Este agendamento não é um bloqueio.');
      }

      if (block.companyId !== companyId) {
        this.logger.warn('Unauthorized block deletion attempt', { 
          blockId: id, 
          requestCompanyId: companyId, 
          blockCompanyId: block.companyId 
        });
        throw new UnauthorizedException('Acesso não autorizado.');
      }

      const result = await this.prisma.appointment.delete({
        where: { id },
      });

      this.logger.log('Block deleted successfully', { blockId: id, companyId });

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error('Error deleting block', error.stack, { blockId: id, companyId });
      throw error;
    }
  }

  public async markAsCompleted(id: number, companyId: number) {
    try {
      this.logger.log('Marking appointment as completed', { appointmentId: id, companyId });

      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        this.logger.warn('Appointment not found for completion', { appointmentId: id });
        throw new BadRequestException('Agendamento não encontrado.');
      }

      // Verifica se a solicitação é feita por alguém da empresa
      if (appointment.companyId !== companyId) {
        this.logger.warn('Unauthorized appointment completion attempt', { 
          appointmentId: id, 
          requestCompanyId: companyId, 
          appointmentCompanyId: appointment.companyId 
        });
        throw new UnauthorizedException('Acesso não autorizado. Você não pode marcar este agendamento como atendido, pois não pertence à empresa.');
      }

      if (appointment.status !== AppointmentStatus.PENDING) {
        this.logger.warn('Cannot complete appointment - not pending', { 
          appointmentId: id, 
          currentStatus: appointment.status 
        });
        throw new BadRequestException('Agendamento não pode ser marcado como atendido, pois não está pendente.');
      }

      const result = await this.prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.COMPLETED },
      });

      this.logger.log('Appointment marked as completed successfully', { 
        appointmentId: id, 
        companyId, 
        clientId: appointment.clientId 
      });

      return result;
    } catch (error) {
      this.logger.error('Error marking appointment as completed', error.stack, { appointmentId: id, companyId });
      throw error;
    }
  }

  public async markAsCanceled(id: number, companyId: number) {
    try {
      this.logger.log('Marking appointment as canceled', { appointmentId: id, companyId });

      const appointment = await this.prisma.appointment.findUnique({
        where: { id },
      });

      if (!appointment) {
        this.logger.warn('Appointment not found for cancellation', { appointmentId: id });
        throw new BadRequestException('Agendamento não encontrado.');
      }

      // Verifica se a solicitação é feita por alguém da empresa
      if (appointment.companyId !== companyId) {
        this.logger.warn('Unauthorized appointment cancellation attempt', { 
          appointmentId: id, 
          requestCompanyId: companyId, 
          appointmentCompanyId: appointment.companyId 
        });
        throw new UnauthorizedException('Acesso não autorizado. Você não pode marcar este agendamento como cancelado, pois não pertence à empresa.');
      }

      if (appointment.status !== AppointmentStatus.PENDING) {
        this.logger.warn('Cannot cancel appointment - not pending', { 
          appointmentId: id, 
          currentStatus: appointment.status 
        });
        throw new BadRequestException('Agendamento não pode ser cancelado, pois não está pendente.');
      }

      const result = await this.prisma.appointment.update({
        where: { id },
        data: { status: AppointmentStatus.CANCELLED },
      });

      this.logger.log('Appointment marked as canceled successfully', { 
        appointmentId: id, 
        companyId, 
        clientId: appointment.clientId 
      });

      return result;
    } catch (error) {
      this.logger.error('Error marking appointment as canceled', error.stack, { appointmentId: id, companyId });
      throw error;
    }
  }

  public async updateAppointment(id: number, data: CreateAdminAppointmentDto, role: Role) {
    return await this.prisma.$transaction(async (prismaTransaction) => {
      const appointment = await prismaTransaction.appointment.findUnique({
        where: { id },
      });
  
      if (!appointment) {
        throw new BadRequestException('Agendamento não encontrado.');
      }

      const appointmentData = await this.prepareAppointmentData(data, 'admin', appointment.clientId, appointment.companyId, role);
console.log(appointment.clientId, appointmentData.clientId)
      const updated = await prismaTransaction.appointment.update({
        where: { id },
        data: {
          date: appointmentData.date,
          duration: appointmentData.duration,
          subTotalPrice: appointmentData.subTotalPrice,
          discount: appointmentData.discount,
          totalPrice: appointmentData.totalPrice,
          //status: appointmentData.status,
          clientId: appointmentData.clientId,
        },
      });
  
      // Atualiza os serviços associados
      await prismaTransaction.appointmentService.deleteMany({ where: { appointmentId: id } });
  
      await prismaTransaction.appointmentService.createMany({
        data: data.serviceIds.map((serviceId) => ({
          appointmentId: id,
          serviceId,
        })),
      });
  
      return updated;
    });
  }

  private async prepareAppointmentData(
    data: CreateClientAppointmentDto | CreateAdminAppointmentDto,
    type: AppointmentType,
    clientId: number,
    companyId: number,
    role?: Role,
  ) {
    try {
      // Valida os serviços
      const services = await this.prisma.service.findMany({
        where: { 
          id: { in: data.serviceIds },
          companyId: companyId,
          isActive: true,
        },
      });

      if (services.length === 0) {
        throw new BadRequestException('Nenhum serviço válido encontrado.');
      }

      if (services.length !== data.serviceIds.length) {
        throw new BadRequestException('Alguns serviços não foram encontrados ou não estão ativos.');
      }
      
      const totalDuration = sumByProp(services, 'duration');
      const subTotalPrice = sumByProp(services, 'price');
      console.log(services, subTotalPrice);
      // Calcula desconto baseado no tipo e role
      let discount = 0;
      if (type === 'admin' && role && role !== Role.CLIENT) {
        discount = (data as CreateAdminAppointmentDto).discount || 0;
      }
      
      // Validações do desconto
      if (discount > subTotalPrice) {
        throw new BadRequestException('Desconto não pode ser maior que o valor total.');
      }
      if (discount < 0) {
        throw new BadRequestException('Desconto não pode ser negativo.');
      }

      const totalPrice = subTotalPrice - discount;
      console.log('Total Price:', totalPrice, 'discount', discount);

      return {
        date: data.date,
        clientId: clientId,
        companyId: companyId,
        subTotalPrice,
        discount,
        totalPrice,
        duration: totalDuration,
        status: AppointmentStatus.PENDING,
        notes: discount > 0 ? `Subtotal: ${subTotalPrice}, Desconto: ${discount}` : undefined,
      };
    } catch (error) {
      this.logger.error(
        'Erro ao preparar os dados para agendamento: ' + error
      )
      if(error instanceof HttpException) {
        throw error;
      }
      
      throw new InternalServerErrorException(`Erro ao preparar dados do agendamento ${type}.`);
    }
  }

  public async findAllByClient(clientId: number, companyId: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId, companyId },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado ou não pertence à empresa.');
    }

    const appointments = await this.prisma.appointment.findMany({
      where: { 
        clientId,
        companyId,
      },
      include: {
        company: true,
        appointmentService: {
          include: {
            service: true,
          },
        },
      },
    });

    // Extrai apenas os services e remove duplicatas
    const formatted = appointments.map((appointment) => {
      const { appointmentService, ...rest } = appointment;

      return {
        ...rest,
        services: appointmentService.map((as) => as.service),
      };
    });

    return formatted;
  }
}