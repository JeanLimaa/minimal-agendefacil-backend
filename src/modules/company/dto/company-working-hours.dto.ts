import { Type } from "class-transformer";
import { IsInt, IsNumber, IsString, ValidateNested, Matches, Min, Max } from "class-validator";

export class DailyWorkingHoursDto {
    @IsInt({message: "O dia da semana deve ser um número inteiro entre 0 (Domingo) e 6 (Sábado)."})
    @Min(0, {message: "O dia da semana deve ser no mínimo 0 (Domingo)."})
    @Max(6, {message: "O dia da semana deve ser no máximo 6 (Sábado)."})
    dayOfWeek: number;

    @IsString({message: "O horário de início deve ser uma string."})
    @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
        message: 'O horário de início deve estar no formato HH:mm (00:00 a 23:59)',
    })
    startTime: string;

    @IsString({message: "O horário de término deve ser uma string."})
    @Matches(/^([0-1]\d|2[0-3]):([0-5]\d)$/, {
        message: 'O horário de término deve estar no formato HH:mm (00:00 a 23:59)',
    })
    endTime: string;
}

export class CompanyWorkingHoursDto {
    @IsNumber({}, {message: "O intervalo de tempo entre os atendimentos deve ser um número inteiro."})
    serviceInterval: number; // em minutos

    @ValidateNested({ each: true, message: "Horários de funcionamento inválidos." })
    @Type(() => DailyWorkingHoursDto)
    workingHours: DailyWorkingHoursDto[];
}