import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const timeZone = 'America/Sao_Paulo';

// Transforma qualquer data para o horário de Brasília formatado
export function formatBR(date: Date | string, formatStr: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, timeZone, formatStr);
}

// Garante que a data seja tratada como Brasília antes de qualquer cálculo
export function getZonedDate(date: Date | string) {
  return toZonedTime(date, timeZone);
}