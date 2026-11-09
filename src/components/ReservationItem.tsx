import type { Reservation } from '../types';
import { SERVICES } from '../lib/catalog';
import { DIAS, parseISO } from '../lib/dates';
import { asientos, personas } from '../lib/format';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { StatusPill } from './ui';

export function usePlaceLine() {
  const { state } = useAgenda();
  return (x: Reservation) => {
    const r = state.resources.find((r) => r.id === x.resourceId);
    if (!r) return personas(x.covers);
    return r.mode === 'seat' ? `${r.name} · ${asientos(x.covers)}` : `${r.name} · ${personas(x.covers)}`;
  };
}

/** Fila de lista: fecha, nombre, servicio, lugar y estado. */
export function ReservationItem({ reservation: x }: { reservation: Reservation }) {
  const placeLine = usePlaceLine();
  const d = parseISO(x.date);
  return (
    <button
      type="button"
      data-res={x.id}
      onClick={() => navigate('reserva-' + x.id)}
      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-linea-2 bg-papel px-3.5 py-3 text-left text-monte"
    >
      <span className="min-w-[42px] text-center font-display text-[22px] leading-none tabular-nums">
        {d.getDate()}
        <small className="mt-[3px] block font-sans text-[10px] font-extrabold uppercase tracking-[.12em] text-barro">{DIAS[d.getDay()].slice(0, 3)}</small>
      </span>
      <span className="min-w-0">
        <strong className="block font-extrabold [overflow-wrap:anywhere]">{x.name}</strong>
        <span className="text-[13px] text-suave">
          {SERVICES[x.service].name} {x.time} · {placeLine(x)}
        </span>
      </span>
      <StatusPill status={x.status} />
    </button>
  );
}
