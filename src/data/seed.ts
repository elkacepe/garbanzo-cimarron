import type { AgendaState, ProposalId, Reservation, ReservationStatus, Resource, RestrictionId, ServiceId } from '../types';
import { addDays, nextWeekday, pad, todayISO } from '../lib/dates';

/** 9 recursos, 52 cubiertos por servicio. */
export function seedResources(): Resource[] {
  return [
    { id: 'r-v1', name: 'Mesa Ventana 1', sector: 'Vereda', capacity: 2, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-v2', name: 'Mesa Ventana 2', sector: 'Vereda', capacity: 2, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-jaz', name: 'Mesa Jazmín', sector: 'Salón', capacity: 4, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-rom', name: 'Mesa Romero', sector: 'Salón', capacity: 4, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-alb', name: 'Mesa Albahaca', sector: 'Salón', capacity: 4, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-meson', name: 'Mesón Compartido', sector: 'Salón', capacity: 12, mode: 'seat', minPeople: 0, active: true },
    { id: 'r-p1', name: 'Mesa Parra 1', sector: 'Patio', capacity: 6, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-p2', name: 'Mesa Parra 2', sector: 'Patio', capacity: 6, mode: 'whole', minPeople: 0, active: true },
    { id: 'r-salon', name: 'Salón del Fondo', sector: 'Privado', capacity: 12, mode: 'whole', minPeople: 8, active: true },
  ];
}

type Row = [string, ServiceId, string, number, string, ProposalId, string, string, RestrictionId[], ReservationStatus, string];

export const codeFor = (n: number) => ({ id: `gc-${pad(n, 4)}`, code: `GC-${pad(n, 4)}` });

/**
 * Datos sintéticos. Las fechas se calculan desde `today` para que el caso del briefing
 * siempre quede en el futuro cercano. S = sábado próximo.
 */
export function makeSeed(today: string = todayISO()): AgendaState {
  const S = nextWeekday(today, 6);
  const W = nextWeekday(today, 3);
  const S2 = addDays(S, 7);
  const Sprev = addDays(S, -7);
  const rows: Row[] = [
    // S, cena: 55 % (amarillo) con el Salón del Fondo libre → caso del briefing
    [S, 'cena', 'r-v1', 2, '21:00', 'carta', 'Lucía y Tomás Ferreyra', 'lucia.ferreyra@example.com', ['gluten'], 'confirmada', 'Pareja. Celíaca: avisar a cocina.'],
    [S, 'cena', 'r-meson', 3, '21:30', 'carta', 'Caro, Meli y Juli', 'carolina.paez@example.com', [], 'confirmada', 'Tres amigas, prefieren la punta del mesón.'],
    [S, 'cena', 'r-jaz', 4, '20:30', 'pasos', 'Martín Quiroga', 'martin.quiroga@example.com', [], 'confirmada', ''],
    [S, 'cena', 'r-rom', 3, '21:00', 'carta', 'Sofía Bustos', 'sofia.bustos@example.com', ['soja'], 'pendiente', 'Llamar el viernes para confirmar.'],
    [S, 'cena', 'r-alb', 4, '22:00', 'carta', 'Nico Funes', 'nico.funes@example.com', [], 'confirmada', ''],
    [S, 'cena', 'r-p1', 5, '20:00', 'carta', 'Familia Ledesma', 'familia.ledesma@example.com', [], 'confirmada', 'Traen un cochecito.'],
    [S, 'cena', 'r-p2', 6, '21:30', 'pasos', 'Agustina Vera', 'agustina.vera@example.com', [], 'pendiente', ''],
    [S, 'cena', 'r-v2', 2, '20:30', 'carta', 'Pedro Arias', 'pedro.arias@example.com', [], 'cancelada', 'Canceló por teléfono.'],
    [S, 'almuerzo', 'r-v2', 2, '13:00', 'mediodia', 'Ramiro Ortiz', 'ramiro.ortiz@example.com', [], 'confirmada', ''],
    [S, 'almuerzo', 'r-meson', 4, '13:30', 'mediodia', 'Equipo de la librería', 'libreria.equipo@example.com', [], 'confirmada', ''],
    // S + 7, cena: cumpleaños de 12 en el Salón del Fondo, 88 % (rojo)
    [S2, 'cena', 'r-salon', 12, '20:30', 'festejo', 'Cumple de Flor Agüero', 'flor.aguero@example.com', ['frutos'], 'confirmada', 'Traen torta propia. Una persona sin frutos secos.'],
    [S2, 'cena', 'r-p1', 6, '20:00', 'carta', 'Familia Godoy', 'familia.godoy@example.com', [], 'confirmada', ''],
    [S2, 'cena', 'r-p2', 5, '21:00', 'pasos', 'Gabriel Ruiz', 'gabriel.ruiz@example.com', [], 'pendiente', ''],
    [S2, 'cena', 'r-jaz', 4, '21:00', 'carta', 'Inés Molina', 'ines.molina@example.com', [], 'confirmada', ''],
    [S2, 'cena', 'r-rom', 4, '21:30', 'carta', 'Diego Sosa', 'diego.sosa@example.com', [], 'confirmada', ''],
    [S2, 'cena', 'r-alb', 3, '20:30', 'pasos', 'Paula Ríos', 'paula.rios@example.com', ['gluten'], 'confirmada', ''],
    [S2, 'cena', 'r-v1', 2, '21:00', 'pasos', 'Ana y Leo', 'ana.leo@example.com', [], 'confirmada', ''],
    [S2, 'cena', 'r-v2', 2, '22:00', 'carta', 'Marcos Herrera', 'marcos.herrera@example.com', [], 'pendiente', ''],
    [S2, 'cena', 'r-meson', 6, '21:00', 'carta', 'Brenda Ochoa', 'brenda.ochoa@example.com', [], 'confirmada', 'Grupo de la facu.'],
    // Miércoles próximo al mediodía
    [W, 'almuerzo', 'r-jaz', 4, '13:00', 'mediodia', 'Estudio Nogal', 'estudio.nogal@example.com', [], 'confirmada', ''],
    [W, 'almuerzo', 'r-meson', 1, '12:30', 'mediodia', 'Julieta Carranza', 'julieta.carranza@example.com', ['soja'], 'confirmada', ''],
    // Semana pasada
    [Sprev, 'almuerzo', 'r-rom', 3, '13:00', 'mediodia', 'Laura Benítez', 'laura.benitez@example.com', [], 'finalizada', ''],
    [Sprev, 'almuerzo', 'r-v1', 2, '13:30', 'carta', 'Hernán Paz', 'hernan.paz@example.com', [], 'novino', 'No avisó.'],
  ];
  const now = new Date().toISOString();
  const reservations: Reservation[] = rows.map((r, i) => ({
    ...codeFor(i + 1),
    date: r[0], service: r[1], resourceId: r[2], covers: r[3], time: r[4], proposalId: r[5],
    name: r[6], email: r[7], restrictions: r[8], status: r[9], notes: r[10],
    createdAt: now, updatedAt: now,
  }));
  return {
    version: 1,
    seq: rows.length,
    resources: seedResources(),
    reservations,
    blocks: [{ date: addDays(S, 3), service: 'almuerzo', reason: 'Fumigación del local' }],
  };
}
