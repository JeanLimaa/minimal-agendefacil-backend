import { IsEmail, IsNotEmpty, IsOptional, IsPhoneNumber, IsString } from "class-validator";
export class CreateClientDto {
    @IsPhoneNumber("BR", { message: "Número de telefone inválido" })
    phone: string;

    @IsString({ message: "Nome inválido" })
    name: string;

    @IsOptional()
    @IsEmail({}, { message: "Email inválido" })
    email?: string;

    //@IsNotEmpty({ message: "Empresa não informada." })
    companyId: number;
}