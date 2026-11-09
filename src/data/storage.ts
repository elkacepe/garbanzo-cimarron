import type { AgendaState } from '../types';
import { makeSeed, seedResources } from './seed';

/**
 * PUNTO DE CONEXIÓN · base de datos.
 * Hoy todo vive en localStorage bajo esta clave. Para pasar a un servidor, reemplazá
 * `loadAgenda()` y `saveAgenda()` manteniendo el contrato: `saveAgenda` devuelve false
 * si no pudo guardar, y en ese caso la app no cambia nada en pantalla.
 */
export const STORAGE_KEY = 'garbanzo-cimarron.agenda.v1';

declare global {
  interface Window {
    /** Para probar un fallo de guardado desde la consola. */
    __simularFalloGuardado?: boolean;
  }
}

export type LoadResult =
  | { status: 'ok'; state: AgendaState }
  | { status: 'seeded'; state: AgendaState; saved: boolean }
  | { status: 'unavailable'; state: AgendaState }
  | { status: 'corrupt'; state: AgendaState };

function isAgenda(p: unknown): p is AgendaState {
  const o = p as AgendaState;
  return !!o && Array.isArray(o.resources) && Array.isArray(o.reservations) && Array.isArray(o.blocks) && typeof o.seq === 'number';
}

export function saveAgenda(next: AgendaState, storage: Storage | undefined = globalThis.localStorage): boolean {
  if (typeof window !== 'undefined' && window.__simularFalloGuardado) return false;
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carga la semilla solo si no existe la clave propia. Una lista guardada vacía se respeta:
 * no equivale a una primera visita. Si el JSON está roto no se pisa.
 */
export function loadAgenda(storage: Storage | undefined = globalThis.localStorage): LoadResult {
  let raw: string | null;
  try {
    if (!storage) throw new Error('sin storage');
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable', state: makeSeed() };
  }
  if (raw === null) {
    const state = makeSeed();
    return { status: 'seeded', state, saved: saveAgenda(state, storage) };
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isAgenda(parsed)) throw new Error('forma');
    return { status: 'ok', state: parsed };
  } catch {
    return { status: 'corrupt', state: { version: 1, seq: 0, resources: seedResources(), reservations: [], blocks: [] } };
  }
}
