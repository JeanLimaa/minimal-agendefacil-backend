import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateClientDto } from './dto/create-client.dto';
import { DatabaseService } from 'src/services/Database.service';
import { Client, Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: DatabaseService,
  ) {}

  async create(createClientDto: CreateClientDto, prisma: Prisma.TransactionClient = this.prisma): Promise<Client> {
    const company = await prisma.company.findUnique({
      where: { id: createClientDto.companyId },
    });
    if (!company) {
      throw new BadRequestException('Empresa não encontrada');
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        phone: createClientDto.phone,
        companyId: createClientDto.companyId,
      },
    });

    if (existingClient) {
      return await prisma.client.update({
        where: { id: existingClient.id },
        data: { 
          name: createClientDto.name, 
          email: createClientDto.email 
        },
      }
      );
    }

    return await prisma.client.create({
      data: {
        name: createClientDto.name,
        phone: createClientDto.phone,
        email: createClientDto.email,
        companyId: createClientDto.companyId,
      },
    });
  }

  async findAll(companyId: number): Promise<Omit<Client, "companyId">[]> {
    return await this.prisma.client.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        companyId: false,
        isBlocked: true,
      },
    });
  }

  public async findOne(id: number, companyId: number): Promise<Client | null> {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    return client;
  }

  public async update(id: number, createClientDto: CreateClientDto): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId: createClientDto.companyId,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    // Verificar se já existe outro cliente com o mesmo telefone
    if (createClientDto.phone !== client.phone) {
      const existingClient = await this.prisma.client.findFirst({
        where: {
          phone: createClientDto.phone,
          companyId: createClientDto.companyId,
          id: { not: id },
        },
      });

      if (existingClient) {
        throw new BadRequestException('Já existe um cliente com este telefone');
      }
    }

    return await this.prisma.client.update({
      where: { id },
      data: {
        name: createClientDto.name,
        phone: createClientDto.phone,
        email: createClientDto.email,
      },
    });
  }

  public async remove(id: number, companyId: number): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    // Verificar se o cliente tem agendamentos
    const hasAppointments = await this.prisma.appointment.findFirst({
      where: { clientId: id },
    });

    if (hasAppointments) {
      throw new BadRequestException('Não é possível excluir um cliente com agendamentos');
    }

    return await this.prisma.client.delete({
      where: { id },
    });
  }

  public async blockClient(id: number, companyId: number): Promise<Client> {
    const client = await this.prisma.client.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!client) {
      throw new BadRequestException('Cliente não encontrado');
    }

    if(client.companyId !== companyId) {
      throw new BadRequestException('Cliente não pertence à empresa informada');
    }

    return await this.prisma.client.update({
      where: { id },
      data: { isBlocked: !client.isBlocked },
    });
  }
}
