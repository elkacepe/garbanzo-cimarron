import type { AgendaState, ProposalId, Reservation, Resource, ServiceId } from '../types';
import { PROPOSALS, SERVICES, STATUS, proposalById } from './catalog';
import { isMonday, toHHMM, toMinutes } from './dates';

export type ServiceState = 'abierto' | 'cerrado' | 'bloqueado';
export type Level = 'verde' | 'amarillo' | 'rojo';

export const blockOf = (st: AgendaState, date: string, svc: ServiceId) =>
  st.blocks.find((b) => b.date === date && b.service === svc);

export function serviceState(st: AgendaState, date: string, svc: ServiceId): ServiceState {
  if (isMonday(date)) return 'cerrado';
  if (blockOf(st, date, svc)) return 'bloqueado';
  return 'abierto';
}

export interface ResourceUsage {
  /** Reservas que ocupan este recurso en el servicio, por hora. */
  list: Reservation[];
  /** Cubiertos que cuenta para la ocupación. */
  used: number;
  /** Cubiertos (o asientos) que quedan. */
  free: number;
}

export interface ServiceUsage {
  capacity: number;
  used: number;
  pct: number;
  count: number;
  byResource: Record<string, ResourceUsage>;
}

/**
 * Ocupación = cubiertos ocupados / capacidad total de los recursos activos.
 * - Recurso completo: si tiene una reserva activa, cuenta su capacidad entera aunque vengan menos.
 * - Mesón (por asiento): cuenta los asientos realmente tomados.
 * Las dos fórmulas no se mezclan.
 */
export function serviceUsage(st: AgendaState, date: string, svc: ServiceId, excludeId?: string): ServiceUsage {
  const capacity = st.resources.filter((r) => r.active).reduce((a, r) => a + r.capacity, 0);
  const occupying = st.reservations.filter(
    (x) => x.date === date && x.service === svc && STATUS[x.status].occupies && x.id !== excludeId,
  );
  const byResource: Record<string, ResourceUsage> = {};
  let used = 0;
  for (const r of st.resources) {
    const list = occupying.filter((x) => x.resourceId === r.id).sort((a, b) => a.time.localeCompare(b.time));
    let u: number;
    let free: number;
    if (r.mode === 'seat') {
      const seats = list.reduce((a, x) => a + x.covers, 0);
      u = Math.min(seats, r.capacity);
      free = Math.max(0, r.capacity - seats);
    } else {
      u = list.length ? r.capacity : 0;
      free = list.length ? 0 : r.capacity;
    }
    byResource[r.id] = { list, used: u, free };
    if (r.active) used += u;
  }
  return { capacity, used, pct: capacity ? (used / capacity) * 100 : 0, count: occupying.length, byResource };
}

/** Verde hasta 49 %, amarillo de 50 % a 84 %, rojo de 85 % a 100 %. */
export const level = (pct: number): Level => (pct < 50 ? 'verde' : pct < 85 ? 'amarillo' : 'rojo');

/** Se muestra redondeado hacia abajo para que coincida con el umbral (49,9 % se ve 49 %). */
export const pctLabel = (pct: number) => `${Math.floor(pct)} %`;

export interface ResourceOption {
  resource: Resource;
  free: number;
  waste: number;
}

/** Recursos activos donde entran `covers` personas en ese servicio. */
export function resourceOptions(st: AgendaState, date: string, svc: ServiceId, covers: number, excludeId?: string) {
  const u = serviceUsage(st, date, svc, excludeId);
  const ok: ResourceOption[] = [];
  let hidden = 0;
  for (const r of st.resources.filter((r) => r.active)) {
    const b = u.byResource[r.id];
    if (r.mode === 'seat') {
      if (b.free >= covers) ok.push({ resource: r, free: b.free, waste: 0 });
      else hidden++;
    } else if (b.free === 0 || covers > r.capacity || (r.minPeople > 0 && covers < r.minPeople)) {
      hidden++;
    } else {
      ok.push({ resource: r, free: b.free, waste: r.capacity - covers });
    }
  }
  // Primero lo que mejor calza; a igual desperdicio, la mesa antes que el mesón.
  ok.sort(
    (a, b) =>
      a.waste - b.waste ||
      Number(a.resource.mode === 'seat') - Number(b.resource.mode === 'seat') ||
      a.resource.capacity - b.resource.capacity,
  );
  return { ok, hidden };
}

/** Horas cada 30 min que permiten terminar la propuesta antes del cierre del servicio. */
export function timeSlots(svc: ServiceId, proposalId: ProposalId | null): string[] {
  const s = SERVICES[svc];
  const dur = proposalById(proposalId)?.minutes ?? 30;
  const start = toMinutes(s.start);
  const last = Math.max(start, toMinutes(s.end) - dur);
  const out: string[] = [];
  for (let m = start; m <= last; m += 30) out.push(toHHMM(m));
  return out;
}

export const proposalsFor = (svc: ServiceId, resourceId: string | null) =>
  PROPOSALS.filter((p) => p.services.includes(svc) && (!p.onlyResource || p.onlyResource === resourceId));

export const defaultProposal = (svc: ServiceId, resourceId: string | null): ProposalId =>
  svc === 'almuerzo' ? 'mediodia' : resourceId === 'r-salon' ? 'festejo' : 'carta';

export const normalizeEmail = (s: string) => s.trim().toLowerCase();

/** Duplicado = misma combinación correo + fecha + servicio entre reservas que ocupan lugar. */
export function findDuplicate(
  st: AgendaState,
  email: string,
  date: string,
  svc: ServiceId,
  excludeId?: string,
): Reservation | undefined {
  const e = normalizeEmail(email);
  return st.reservations.find(
    (x) => x.id !== excludeId && STATUS[x.status].occupies && normalizeEmail(x.email) === e && x.date === date && x.service === svc,
  );
}

/** Cómo se pinta un servicio de un día en el calendario. */
export type DayServiceKind = 'libre' | Level | 'cerrado' | 'bloqueado';
export function dayServiceKind(st: AgendaState, date: string, svc: ServiceId): { kind: DayServiceKind; label: string } {
  const s = serviceState(st, date, svc);
  if (s === 'cerrado') return { kind: 'cerrado', label: 'cerrado' };
  if (s === 'bloqueado') return { kind: 'bloqueado', label: 'bloqueado' };
  const u = serviceUsage(st, date, svc);
  return { kind: u.used === 0 ? 'libre' : level(u.pct), label: `${pctLabel(u.pct)} ocupado` };
}
