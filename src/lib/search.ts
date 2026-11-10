import type { Reservation, ReservationStatus, ServiceId } from '../types';
import { SERVICE_ORDER } from './catalog';

export interface ReservationFilters {
  /** Texto libre: busca en nombre y correo. */
  query: string;
  /** Estados elegidos; vacío = todos. */
  statuses: ReservationStatus[];
  service: ServiceId | 'todos';
  /** AAAA-MM-DD o '' (sin límite). Ambos extremos incluidos. */
  from: string;
  to: string;
}

export const emptyFilters = (from = ''): ReservationFilters => ({ query: '', statuses: [], service: 'todos', from, to: '' });

/**
 * Normaliza para comparar: sin espacios en los extremos, en minúsculas y sin tildes
 * («Agüero» encuentra «aguero» y al revés).
 */
export const normalizeText = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export const isRangeInverted = (f: ReservationFilters) => !!f.from && !!f.to && f.from > f.to;

/** Cuántos filtros (sin contar el buscador) están cambiados respecto de «sin filtro». */
export const activeFilterCount = (f: ReservationFilters) =>
  (f.statuses.length ? 1 : 0) + (f.service !== 'todos' ? 1 : 0) + (f.from || f.to ? 1 : 0);

/** Aplica buscador y filtros. Orden: fecha, servicio (almuerzo antes que cena) y hora. */
export function filterReservations(list: Reservation[], f: ReservationFilters): Reservation[] {
  if (isRangeInverted(f)) return [];
  const q = normalizeText(f.query);
  return list
    .filter((x) => {
      if (q && !normalizeText(x.name).includes(q) && !normalizeText(x.email).includes(q)) return false;
      if (f.statuses.length && !f.statuses.includes(x.status)) return false;
      if (f.service !== 'todos' && x.service !== f.service) return false;
      if (f.from && x.date < f.from) return false;
      if (f.to && x.date > f.to) return false;
      return true;
    })
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        SERVICE_ORDER.indexOf(a.service) - SERVICE_ORDER.indexOf(b.service) ||
        a.time.localeCompare(b.time),
    );
}
