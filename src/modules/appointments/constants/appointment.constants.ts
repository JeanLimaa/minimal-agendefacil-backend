// ============================================
// CONSTANTES DE AGENDAMENTO - VERSÃO SIMPLIFICADA
// ============================================

// Status possíveis (agora usando String ao invés de Enum)
export const AppointmentStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type AppointmentStatusType = typeof AppointmentStatus[keyof typeof AppointmentStatus];

// Traduções de status
export const STATUS_TRANSLATION: Record<string, string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
};
