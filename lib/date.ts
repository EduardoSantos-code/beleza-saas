import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const timeZone = 'America/Sao_Paulo';

// Para mostrar na tela (ex: 14:00)
export function formatBR(date: Date | string, formatStr: string) {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, timeZone, formatStr);
}

// Para o banco de dados (Ajusta para Brasília)
export function brToUtc(dateStr: string, timeStr: string) {
  // Na versão 3, usamos fromZonedTime
  return fromZonedTime(`${dateStr} ${timeStr}`, timeZone);
}