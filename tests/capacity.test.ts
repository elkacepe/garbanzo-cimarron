import { describe, expect, it } from 'vitest';
import { makeSeed } from '../src/data/seed';
import { addDays, monthGrid, nextWeekday } from '../src/lib/dates';
import { findDuplicate, level, resourceOptions, serviceState, serviceUsage, timeSlots } from '../src/lib/capacity';
import { loadAgenda, saveAgenda, STORAGE_KEY } from '../src/data/storage';

const TODAY = '2026-11-09'; // lunes
const seed = () => makeSeed(TODAY);
const S = nextWeekday(TODAY, 6); // sábado 14
const S2 = addDays(S, 7);

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
  removeItem(k: string) { this.data.delete(k); }
  clear() { this.data.clear(); }
  key() { return null; }
  get length() { return this.data.size; }
}

describe('calendario', () => {
  it('arranca en lunes y completa semanas', () => {
    const cells = monthGrid('2026-11');
    expect(cells[6]).toBe('2026-11-01'); // domingo 1 cae en la 7.ª columna
    expect(cells[7]).toBe('2026-11-02'); // lunes 2 abre la segunda fila
    expect(cells.length % 7).toBe(0);
  });
  it('los lunes están cerrados', () => {
    expect(serviceState(seed(), '2026-11-16', 'cena')).toBe('cerrado');
  });
  it('un servicio bloqueado no se ofrece', () => {
    const st = seed();
    expect(serviceState(st, st.blocks[0].date, 'almuerzo')).toBe('bloqueado');
  });
});

describe('ocupación', () => {
  it('capacidad total de 52 cubiertos', () => {
    expect(serviceUsage(seed(), S, 'cena').capacity).toBe(52);
  });
  it('caso del briefing: sábado próximo a la cena en amarillo con el salón libre', () => {
    const u = serviceUsage(seed(), S, 'cena');
    expect(u.used).toBe(29);
    expect(level(u.pct)).toBe('amarillo');
    expect(u.byResource['r-salon'].free).toBe(12);
  });
  it('una mesa ocupa su capacidad completa aunque vengan menos', () => {
    const u = serviceUsage(seed(), S, 'cena');
    expect(u.byResource['r-rom'].used).toBe(4); // reservada para 3
  });
  it('el mesón descuenta asientos reales', () => {
    const u = serviceUsage(seed(), S, 'cena');
    expect(u.byResource['r-meson'].used).toBe(3);
    expect(u.byResource['r-meson'].free).toBe(9);
  });
  it('umbrales de color', () => {
    expect(level(49.9)).toBe('verde');
    expect(level(50)).toBe('amarillo');
    expect(level(84.9)).toBe('amarillo');
    expect(level(85)).toBe('rojo');
  });
  it('cancelar libera el salón y baja de rojo a amarillo', () => {
    const st = seed();
    expect(level(serviceUsage(st, S2, 'cena').pct)).toBe('rojo');
    st.reservations.find((x) => x.resourceId === 'r-salon' && x.date === S2)!.status = 'cancelada';
    const u = serviceUsage(st, S2, 'cena');
    expect(u.byResource['r-salon'].free).toBe(12);
    expect(level(u.pct)).toBe('amarillo');
  });
});

describe('opciones del formulario', () => {
  const ids = (covers: number) => resourceOptions(seed(), S, 'cena', covers).ok.map((o) => o.resource.id);
  it('una mesa con reserva activa no aparece', () => {
    expect(ids(2)).not.toContain('r-v1');
    expect(ids(2)).toContain('r-v2'); // su reserva está cancelada
  });
  it('solo recursos con capacidad suficiente y respetando el mínimo', () => {
    expect(ids(12)).toEqual(['r-salon']);
    expect(ids(4)).toEqual(['r-meson']);
    expect(ids(7)).not.toContain('r-salon');
    expect(ids(8)).toContain('r-salon');
  });
  it('el mesón deja de ofrecerse cuando no alcanzan los asientos', () => {
    expect(ids(9)).toContain('r-meson');
    expect(ids(10)).not.toContain('r-meson');
  });
});

describe('horarios y duplicados', () => {
  it('horas cada 30 min que terminan antes del cierre', () => {
    expect(timeSlots('cena', 'festejo')).toEqual(['20:00', '20:30', '21:00']);
    expect(timeSlots('almuerzo', 'mediodia')).toEqual(['12:30', '13:00', '13:30', '14:00', '14:30']);
  });
  it('detecta duplicados por correo sin espacios y en minúsculas', () => {
    expect(findDuplicate(seed(), '  LUCIA.Ferreyra@example.com ', S, 'cena')?.code).toBe('GC-0001');
    expect(findDuplicate(seed(), 'lucia.ferreyra@example.com', S, 'almuerzo')).toBeUndefined();
  });
});

describe('localStorage', () => {
  it('siembra solo si no existe la clave', () => {
    const mem = new MemoryStorage() as unknown as Storage;
    expect(loadAgenda(mem).status).toBe('seeded');
    expect(loadAgenda(mem).status).toBe('ok');
  });
  it('una lista vacía guardada no vuelve a sembrar', () => {
    const mem = new MemoryStorage() as unknown as Storage;
    const st = seed();
    st.reservations = [];
    saveAgenda(st, mem);
    const r = loadAgenda(mem);
    expect(r.status).toBe('ok');
    expect(r.state.reservations).toHaveLength(0);
  });
  it('si el JSON está roto no lo pisa', () => {
    const mem = new MemoryStorage() as unknown as Storage;
    mem.setItem(STORAGE_KEY, '{roto');
    expect(loadAgenda(mem).status).toBe('corrupt');
    expect(mem.getItem(STORAGE_KEY)).toBe('{roto');
  });
});
