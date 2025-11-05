import { IsDateString, IsNumber } from "class-validator";

export class BlockAppointmentDto {
  @IsDateString({}, { message: 'Data de início inválida.' })
  startDate: string;

  @IsDateString({}, { message: 'Data de término inválida.' })
  endDate: string;  

  @IsNumber({}, { message: 'Empresa não informada.' })
  companyId: number;
}
