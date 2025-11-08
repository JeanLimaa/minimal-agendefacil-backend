import { IsDateString, IsOptional, IsString } from "class-validator";

export class BlockAppointmentDto {
  @IsDateString({}, { message: 'Data de início inválida.' })
  startDate: string;

  @IsDateString({}, { message: 'Data de término inválida.' })
  endDate: string;
  
  @IsOptional()
  @IsString()
  notes?: string;
}
