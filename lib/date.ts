import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz';

const timeZone = 'America/Sao_Paulo';

// Para mostrar na tela (ex: 14:00)
export function formatBR(date: Date | string, formatStr: string) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, timeZone, formatStr);
}

// Para o banco de dados (Transforma o "00:00 de Brasília" no horário que o banco entende)
export function brToUtc(dateStr: string, timeStr: string) {
  return zonedTimeToUtc(`${dateStr} ${timeStr}`, timeZone);
}