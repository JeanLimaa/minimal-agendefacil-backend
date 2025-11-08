import { ArrayNotEmpty, IsArray, IsInt, IsString } from "class-validator";

export class GetAvailableTimesDTO {
    @IsArray({ message: 'Os serviços devem ser um array de números inteiros' })
    @ArrayNotEmpty({ message: 'Os serviços não podem estar vazios' })
    @IsInt({ each: true, message: 'Cada ID de serviço deve ser um número inteiro' })
    servicesId: number[];

    @IsString({ message: 'A data deve ser uma string no formato "yyyy-MM-dd"' })
    date: string;
}