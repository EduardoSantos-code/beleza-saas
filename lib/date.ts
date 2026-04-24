import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';

const timeZone = 'America/Sao_Paulo';

export function formatBR(date: Date | string, formatStr: string) {
  if (!date) return '-';
  // parseISO garante que a string do banco (UTC) seja lida corretamente
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatInTimeZone(d, timeZone, formatStr);
}