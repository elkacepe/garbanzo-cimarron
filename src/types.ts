/** Los dos servicios del día. */
export type ServiceId = 'almuerzo' | 'cena';

/** «whole»: se reserva entero (mesas y salón). «seat»: cada reserva toma asientos (mesón). */
export type ResourceMode = 'whole' | 'seat';

export interface Resource {
  id: string;
  name: string;
  sector: string;
  capacity: number;
  mode: ResourceMode;
  /** Mínimo de personas para poder reservarlo (0 = sin mínimo). */
  minPeople: number;
  active: boolean;
}

export type ReservationStatus = 'pendiente' | 'confirmada' | 'sentada' | 'finalizada' | 'cancelada' | 'novino';

export type RestrictionId = 'gluten' | 'frutos' | 'soja';

export type ProposalId = 'mediodia' | 'carta' | 'pasos' | 'festejo';

export interface Reservation {
  id: string;
  /** Código visible, p. ej. GC-0012. Nunca cambia. */
  code: string;
  /** Fecha local en formato AAAA-MM-DD. */
  date: string;
  service: ServiceId;
  resourceId: string;
  covers: number;
  /** Hora HH:MM. */
  time: string;
  proposalId: ProposalId;
  name: string;
  email: string;
  restrictions: RestrictionId[];
  notes: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceBlock {
  date: string;
  service: ServiceId;
  reason: string;
}

/** Todo lo que se guarda en localStorage bajo STORAGE_KEY. */
export interface AgendaState {
  version: 1;
  /** Último número de código usado. */
  seq: number;
  resources: Resource[];
  reservations: Reservation[];
  blocks: ServiceBlock[];
}
