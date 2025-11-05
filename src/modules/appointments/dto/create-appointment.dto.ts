import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEmail, IsArray } from 'class-validator';
import { IsDateTime } from 'src/common/decorators/ClassValidator.decorator';

class CreateAppointmentBaseDto {
    @IsDateTime({message: "Data do agendamento inválida. Precisa ser DateTime."})
    date: string;
    
    @IsNotEmpty({message: "ID do serviço não informado."})
    @IsArray({message: "Os ID's do serviço precisam estar contidos em um array."})
    @IsNumber({}, { each: true, message: "Cada ID de serviço deve ser um número." })
    serviceIds: number[];
}

export class CreateClientAppointmentDto extends CreateAppointmentBaseDto {
    // Informações do cliente para agendamento via web
    @IsString()
    @IsNotEmpty({message: "Nome do cliente é obrigatório."})
    clientName: string;

    @IsEmail({}, {message: "Email inválido."})
    @IsOptional()
    clientEmail?: string;

    @IsString()
    @IsNotEmpty({message: "Telefone do cliente é obrigatório."})
    clientPhone: string;

    @IsNumber()
    @IsNotEmpty({message: "ID da empresa não informado."})
    companyId: number;
}

export class CreateAdminAppointmentDto extends CreateAppointmentBaseDto {
    @IsNumber()
    @IsNotEmpty({message: "Cliente não informado."})
    clientId: number;

    @IsNumber()
    @IsOptional()
    discount?: number;
}