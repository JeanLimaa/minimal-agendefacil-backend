import { BadRequestException } from "@nestjs/common";

export function parseTimeToMinutes(time: string | null): number {
    if (!time) throw new BadRequestException('Horário inválido');
    
    // Validar formato HH:mm
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
        throw new BadRequestException(`Horário deve estar no formato HH:mm (00:00 a 23:59). Recebido: ${time}`);
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    // Validação adicional de range
    if (hours < 0 || hours > 23) {
        throw new BadRequestException(`Horas devem estar entre 00 e 23. Recebido: ${hours}`);
    }
    
    if (minutes < 0 || minutes > 59) {
        throw new BadRequestException(`Minutos devem estar entre 00 e 59. Recebido: ${minutes}`);
    }
    
    return hours * 60 + minutes;
}

export function isAfter(startTimeMinutes: number, endTimeMinutes: number): boolean {
    return startTimeMinutes >= endTimeMinutes;
}

export function validateTimeRange(startTime: string, endTime: string): void {
    if (!startTime || !endTime) {
        throw new BadRequestException('Horário de início e fim são obrigatórios');
    }
    
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    
    if (isAfter(startMinutes, endMinutes)) {
        throw new BadRequestException(`Horário de início (${startTime}) deve ser anterior ao horário de término (${endTime})`);
    }
}

export function validateDayOfWeek(dayOfWeek: number): void {
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
        throw new BadRequestException(`DayOfWeek deve ser um número inteiro entre 0 (Domingo) e 6 (Sábado). Recebido: ${dayOfWeek}`);
    }
}

export function isValidTimeFormat(time: string): boolean {
    if (!time) return false;
    const timeRegex = /^([0-1]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
}

export function isTimeWithinRange(time: string, startTime: string, endTime: string): boolean {
    if (!isValidTimeFormat(time) || !isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
        return false;
    }
    
    const timeMinutes = parseTimeToMinutes(time);
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    
    return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}