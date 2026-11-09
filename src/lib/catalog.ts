import type { ProposalId, ReservationStatus, RestrictionId, ServiceId } from '../types';

export interface Service {
  id: ServiceId;
  name: string;
  start: string;
  end: string;
}

export const SERVICES: Record<ServiceId, Service> = {
  almuerzo: { id: 'almuerzo', name: 'Almuerzo', start: '12:30', end: '15:30' },
  cena: { id: 'cena', name: 'Cena', start: '20:00', end: '23:30' },
};

export const SERVICE_ORDER: ServiceId[] = ['almuerzo', 'cena'];

/** «la cena» / «el almuerzo», para armar frases. */
export const serviceWithArticle = (s: ServiceId) => (s === 'cena' ? 'la cena' : 'el almuerzo');

export interface Proposal {
  id: ProposalId;
  name: string;
  detail: string;
  /** Duración estimada en minutos. */
  minutes: number;
  /** Precio por persona en pesos; null = variable. */
  price: number | null;
  services: ServiceId[];
  /** Si existe, solo se ofrece con ese recurso. */
  onlyResource?: string;
}

export const PROPOSALS: Proposal[] = [
  { id: 'mediodia', name: 'Menú del mediodía', detail: 'Entrada, principal y bebida', minutes: 60, price: 18000, services: ['almuerzo'] },
  { id: 'carta', name: 'Carta libre', detail: 'Precio según lo que pidan', minutes: 90, price: null, services: ['almuerzo', 'cena'] },
  { id: 'pasos', name: 'Pasos de estación', detail: '5 pasos', minutes: 120, price: 38000, services: ['cena'] },
  { id: 'festejo', name: 'Mesa de festejo', detail: 'Para el Salón del Fondo', minutes: 150, price: 45000, services: ['cena'], onlyResource: 'r-salon' },
];

export const proposalById = (id: string | null | undefined) => PROPOSALS.find((p) => p.id === id);

export const RESTRICTIONS: { id: RestrictionId; name: string }[] = [
  { id: 'gluten', name: 'Sin gluten' },
  { id: 'frutos', name: 'Sin frutos secos' },
  { id: 'soja', name: 'Sin soja' },
];

export const restrictionName = (id: RestrictionId) => RESTRICTIONS.find((r) => r.id === id)?.name ?? id;

/**
 * Estados de la reserva. «occupies» indica si ocupa el recurso todo el servicio.
 * Decisión: Sentada y Finalizada también ocupan (la mesa no se revende en el mismo servicio).
 */
export const STATUS: Record<ReservationStatus, { name: string; occupies: boolean }> = {
  pendiente: { name: 'Pendiente', occupies: true },
  confirmada: { name: 'Confirmada', occupies: true },
  sentada: { name: 'Sentada', occupies: true },
  finalizada: { name: 'Finalizada', occupies: true },
  cancelada: { name: 'Cancelada', occupies: false },
  novino: { name: 'No vino', occupies: false },
};

export const MAX_COVERS = 12;
