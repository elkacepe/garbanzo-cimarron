import { useEffect, useState } from 'react';
import { isValidISO } from '../lib/dates';

/**
 * Navegación por hash, sin librerías:
 * #mes-AAAA-MM · #dia-AAAA-MM-DD · #nueva · #editar-gc-0001 · #reserva-gc-0001 · #panel
 */
export type Route =
  | { name: 'mes'; month?: string }
  | { name: 'dia'; date: string }
  | { name: 'nueva' }
  | { name: 'editar'; id: string }
  | { name: 'reserva'; id: string }
  | { name: 'panel' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '');
  let m: RegExpMatchArray | null;
  if ((m = h.match(/^mes-(\d{4}-\d{2})$/))) return { name: 'mes', month: m[1] };
  if ((m = h.match(/^dia-(\d{4}-\d{2}-\d{2})$/)) && isValidISO(m[1])) return { name: 'dia', date: m[1] };
  if (h === 'nueva') return { name: 'nueva' };
  if ((m = h.match(/^editar-(gc-\d+)$/))) return { name: 'editar', id: m[1] };
  if ((m = h.match(/^reserva-(gc-\d+)$/))) return { name: 'reserva', id: m[1] };
  if (h === 'panel') return { name: 'panel' };
  return { name: 'mes' };
}

export function navigate(hash: string) {
  if (location.hash === '#' + hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
