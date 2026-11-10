import type { AgendaState, Reservation, Resource, ResourceMode } from '../types';
import { SERVICES } from './catalog';
import { fechaCorta } from './dates';
import { normalizeText } from './search';

/** Capacidad máxima que se puede cargar en un recurso. */
export const MAX_RESOURCE_CAPACITY = 40;

/** Estados que todavía van a usar la mesa: lo que bloquea editar, desactivar o borrar. */
const UPCOMING = new Set(['pendiente', 'confirmada', 'sentada']);

/** Recursos visibles (no borrados). */
export const liveResources = (st: AgendaState) => st.resources.filter((r) => !r.deletedAt);

/** Reservas de hoy en adelante que todavía van a usar ese recurso. */
export function futureReservations(st: AgendaState, resourceId: string, today: string): Reservation[] {
  return st.reservations
    .filter((x) => x.resourceId === resourceId && x.date >= today && UPCOMING.has(x.status))
    .sort((a, b) => (a.date + a.service + a.time).localeCompare(b.date + b.service + b.time));
}

export interface ResourceDraft {
  name: string;
  sector: string;
  mode: ResourceMode;
  capacity: number;
  minPeople: number;
}

export type ResourceErrors = Partial<Record<'name' | 'sector' | 'capacity' | 'minPeople', string>>;

/** Validación de los campos. El nombre no se puede repetir (sin espacios, minúsculas, sin tildes). */
export function validateResourceFields(st: AgendaState, d: ResourceDraft, editingId?: string): ResourceErrors {
  const e: ResourceErrors = {};
  const name = d.name.trim();
  if (!name) e.name = 'Poné un nombre, por ejemplo «Mesa Ventana 3».';
  else if (liveResources(st).some((r) => r.id !== editingId && normalizeText(r.name) === normalizeText(name)))
    e.name = 'Ya hay un lugar con ese nombre.';
  if (!d.sector.trim()) e.sector = 'Poné un sector, por ejemplo «Salón» o «Patio».';
  if (!Number.isInteger(d.capacity) || d.capacity < 1 || d.capacity > MAX_RESOURCE_CAPACITY)
    e.capacity = `La capacidad va de 1 a ${MAX_RESOURCE_CAPACITY}.`;
  if (d.mode === 'whole' && (!Number.isInteger(d.minPeople) || d.minPeople < 0 || d.minPeople > d.capacity))
    e.minPeople = 'El mínimo no puede ser mayor que la capacidad.';
  return e;
}

export interface Conflict {
  reservation: Reservation;
  reason: string;
}

/**
 * Reservas futuras que dejarían de entrar si el recurso pasa a tener esta configuración.
 * - Mesa entera: una sola reserva por servicio, que no supere la capacidad ni quede bajo el mínimo.
 * - Por asiento: la suma de asientos de cada servicio no puede superar la capacidad.
 */
export function editConflicts(st: AgendaState, resourceId: string, d: ResourceDraft, today: string): Conflict[] {
  const future = futureReservations(st, resourceId, today);
  const groups = new Map<string, Reservation[]>();
  for (const x of future) {
    const k = `${x.date}|${x.service}`;
    groups.set(k, [...(groups.get(k) ?? []), x]);
  }
  const out: Conflict[] = [];
  for (const list of groups.values()) {
    const when = `${fechaCorta(list[0].date)}, ${SERVICES[list[0].service].name.toLowerCase()}`;
    if (d.mode === 'seat') {
      const seats = list.reduce((a, x) => a + x.covers, 0);
      if (seats > d.capacity)
        list.forEach((x) => out.push({ reservation: x, reason: `${when}: ya hay ${seats} asientos tomados y la capacidad nueva es ${d.capacity}.` }));
    } else {
      if (list.length > 1)
        list.forEach((x) => out.push({ reservation: x, reason: `${when}: hay ${list.length} reservas y una mesa entera admite una sola.` }));
      else {
        const x = list[0];
        if (x.covers > d.capacity) out.push({ reservation: x, reason: `${when}: es para ${x.covers} y la capacidad nueva es ${d.capacity}.` });
        else if (d.minPeople > 0 && x.covers < d.minPeople)
          out.push({ reservation: x, reason: `${when}: es para ${x.covers} y el mínimo nuevo es ${d.minPeople}.` });
      }
    }
  }
  return out;
}

/** Id nuevo, legible y sin choques. */
export function newResourceId(st: AgendaState, name: string) {
  const slug = normalizeText(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'lugar';
  let id = `r-${slug}`;
  for (let i = 2; st.resources.some((r) => r.id === id); i++) id = `r-${slug}-${i}`;
  return id;
}

/** Tope de cubiertos por reserva: el recurso activo más grande. */
export const maxCovers = (st: AgendaState) =>
  Math.max(1, ...st.resources.filter((r) => r.active && !r.deletedAt).map((r) => r.capacity));

export const resourceSummary = (r: Resource) =>
  r.mode === 'seat'
    ? `${r.capacity} asientos, por asiento`
    : `${r.capacity} cubiertos, mesa entera${r.minPeople ? `, mínimo ${r.minPeople}` : ''}`;
