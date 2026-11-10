import { describe, expect, it } from 'vitest';
import { makeSeed } from '../src/data/seed';
import { addDays, nextWeekday } from '../src/lib/dates';
import { emptyFilters, filterReservations } from '../src/lib/search';
import { editConflicts, futureReservations, maxCovers, newResourceId, validateResourceFields } from '../src/lib/resources';

const TODAY = '2026-11-09'; // lunes
const seed = () => makeSeed(TODAY);
const S = nextWeekday(TODAY, 6);
const S2 = addDays(S, 7);
const codes = (f: Partial<ReturnType<typeof emptyFilters>>) =>
  filterReservations(seed().reservations, { ...emptyFilters(), ...f }).map((x) => x.code);

describe('buscador y filtros del listado', () => {
  it('sin filtros devuelve todo, ordenado por fecha, servicio y hora', () => {
    const r = filterReservations(seed().reservations, emptyFilters());
    expect(r).toHaveLength(23);
    expect(r[0].date <= r[22].date).toBe(true);
  });
  it('busca por nombre sin tildes, mayúsculas ni espacios', () => {
    expect(codes({ query: '  AGUERO ' })).toEqual(['GC-0011']);
  });
  it('busca por correo', () => {
    expect(codes({ query: 'carolina.paez@' })).toEqual(['GC-0002']);
  });
  it('filtra por varios estados a la vez', () => {
    expect(codes({ statuses: ['cancelada', 'novino'] }).sort()).toEqual(['GC-0008', 'GC-0023']);
  });
  it('filtra por servicio', () => {
    const r = filterReservations(seed().reservations, { ...emptyFilters(), service: 'almuerzo' });
    expect(r.every((x) => x.service === 'almuerzo')).toBe(true);
    expect(r).toHaveLength(6);
  });
  it('filtra por rango de fechas, con los dos extremos incluidos', () => {
    const r = filterReservations(seed().reservations, { ...emptyFilters(), from: S, to: S });
    expect(r).toHaveLength(10);
  });
  it('un rango invertido no devuelve nada', () => {
    expect(codes({ from: S2, to: S })).toEqual([]);
  });
  it('combina buscador y filtros', () => {
    expect(codes({ query: 'example.com', statuses: ['pendiente'], service: 'cena', from: S2 })).toEqual(['GC-0013', 'GC-0018']);
  });
});

describe('gestión de recursos', () => {
  const base = { name: 'Mesa Nueva', sector: 'Patio', mode: 'whole' as const, capacity: 4, minPeople: 0 };
  it('valida nombre repetido sin tildes ni mayúsculas', () => {
    expect(validateResourceFields(seed(), { ...base, name: ' mesa jazmin ' }).name).toBeTruthy();
    expect(validateResourceFields(seed(), { ...base, name: 'Mesa Jazmín' }, 'r-jaz').name).toBeUndefined();
  });
  it('valida capacidad y mínimo', () => {
    expect(validateResourceFields(seed(), { ...base, capacity: 0 }).capacity).toBeTruthy();
    expect(validateResourceFields(seed(), { ...base, capacity: 41 }).capacity).toBeTruthy();
    expect(validateResourceFields(seed(), { ...base, minPeople: 5 }).minPeople).toBeTruthy();
  });
  it('reservas futuras: ignora pasadas y canceladas', () => {
    expect(futureReservations(seed(), 'r-v1', TODAY).map((x) => x.code)).toEqual(['GC-0001', 'GC-0017']);
    expect(futureReservations(seed(), 'r-v2', TODAY).map((x) => x.code)).toEqual(['GC-0009', 'GC-0018']);
  });
  it('bajar la capacidad de una mesa choca con reservas que ya no entran', () => {
    const c = editConflicts(seed(), 'r-p1', { ...base, capacity: 5 }, TODAY);
    expect(c.map((x) => x.reservation.code)).toEqual(['GC-0012']);
  });
  it('subir el mínimo del salón choca con reservas más chicas', () => {
    const st = seed();
    expect(editConflicts(st, 'r-salon', { ...base, capacity: 12, minPeople: 8 }, TODAY)).toHaveLength(0);
    st.reservations.find((x) => x.code === 'GC-0011')!.covers = 9;
    expect(editConflicts(st, 'r-salon', { ...base, capacity: 12, minPeople: 10 }, TODAY)).toHaveLength(1);
  });
  it('el mesón no puede bajar de los asientos ya tomados', () => {
    expect(editConflicts(seed(), 'r-meson', { ...base, mode: 'seat', capacity: 6 }, TODAY)).toHaveLength(0);
    expect(editConflicts(seed(), 'r-meson', { ...base, mode: 'seat', capacity: 5 }, TODAY)).toHaveLength(1);
  });
  it('pasar el mesón a mesa entera choca si hay varias reservas en un servicio', () => {
    const st = seed();
    st.reservations.push({ ...st.reservations[1], id: 'gc-9999', code: 'GC-9999', email: 'otra@example.com' });
    const c = editConflicts(st, 'r-meson', { ...base, mode: 'whole', capacity: 12 }, TODAY);
    expect(c.some((x) => x.reason.includes('una sola'))).toBe(true);
  });
  it('id nuevo legible y sin choques', () => {
    const st = seed();
    expect(newResourceId(st, 'Mesa Jazmín')).toBe('r-mesa-jazmin');
    st.resources.push({ ...st.resources[0], id: 'r-mesa-jazmin' });
    expect(newResourceId(st, 'Mesa Jazmín')).toBe('r-mesa-jazmin-2');
  });
  it('el tope de cubiertos sigue al recurso activo más grande', () => {
    const st = seed();
    expect(maxCovers(st)).toBe(12);
    st.resources.push({ id: 'r-x', name: 'Galería', sector: 'Patio', capacity: 20, mode: 'whole', minPeople: 0, active: true });
    expect(maxCovers(st)).toBe(20);
  });
});
