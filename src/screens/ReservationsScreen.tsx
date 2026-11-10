import { useState } from 'react';
import type { ReservationStatus, ServiceId } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { STATUS } from '../lib/catalog';
import { fechaLarga, monthGrid, monthOf, todayISO } from '../lib/dates';
import { activeFilterCount, emptyFilters, filterReservations, isRangeInverted, type ReservationFilters } from '../lib/search';
import { reservas } from '../lib/format';
import { ReservationItem } from '../components/ReservationItem';
import { StorageBanner } from '../components/StorageBanner';
import { Button, EmptyState, Eyebrow, LinkButton, Segmented } from '../components/ui';

const STATUS_ORDER: ReservationStatus[] = ['pendiente', 'confirmada', 'sentada', 'finalizada', 'cancelada', 'novino'];

const input =
  'w-full min-h-[46px] rounded-lg border-[1.5px] border-linea-2 bg-blanco px-3 py-2.5 text-base font-semibold text-carbon focus:border-monte focus:outline-none focus:ring-[3px] focus:ring-monte/20 aria-[invalid=true]:border-aji';
const labelCls = 'flex min-w-0 flex-col gap-[5px] text-[13px] font-extrabold text-suave';
const chip = (on: boolean) =>
  `min-h-[40px] rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-bold ${on ? 'border-monte bg-monte text-crema' : 'border-linea-2 bg-blanco text-monte'}`;

/** Atajos para el rango de fechas. */
function datePresets(today: string) {
  const days = monthGrid(monthOf(today)).filter((d): d is string => !!d);
  return [
    { id: 'desde-hoy', label: 'Desde hoy', from: today, to: '' },
    { id: 'este-mes', label: 'Este mes', from: days[0], to: days[days.length - 1] },
    { id: 'todas', label: 'Todas las fechas', from: '', to: '' },
  ];
}

/** Pantalla · Listado de reservas con buscador y filtros. Los filtros viven en App para no perderse al abrir una ficha. */
export function ReservationsScreen({ filters, onChange }: { filters: ReservationFilters; onChange: (f: ReservationFilters) => void }) {
  const { state } = useAgenda();
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<ReservationFilters>) => onChange({ ...filters, ...patch });

  const results = filterReservations(state.reservations, filters);
  const inverted = isRangeInverted(filters);
  const nFilters = activeFilterCount(filters);
  const presets = datePresets(today);
  const toggleStatus = (s: ReservationStatus) =>
    set({ statuses: filters.statuses.includes(s) ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s] });
  const clear = () => onChange(emptyFilters());
  const isDefault = !filters.query && nFilters === 0;

  // Agrupar por día para que el listado se lea como la agenda.
  const groups: { date: string; items: typeof results }[] = [];
  for (const x of results) {
    const last = groups[groups.length - 1];
    if (last && last.date === x.date) last.items.push(x);
    else groups.push({ date: x.date, items: [x] });
  }

  const summary = [
    filters.statuses.length ? filters.statuses.map((s) => STATUS[s].name).join(', ') : null,
    filters.service !== 'todos' ? (filters.service === 'almuerzo' ? 'Almuerzo' : 'Cena') : null,
    filters.from || filters.to
      ? presets.find((p) => p.from === filters.from && p.to === filters.to && p.id !== 'todas')?.label ??
        `${filters.from ? 'del ' + filters.from.split('-').reverse().join('/') : ''}${filters.to ? ' al ' + filters.to.split('-').reverse().join('/') : ''}`.trim()
      : null,
  ].filter(Boolean);

  return (
    <>
      <StorageBanner />
      <Eyebrow>Todas las reservas</Eyebrow>
      <h1 className="mt-1 mb-3.5 text-[clamp(34px,10vw,46px)] leading-none text-monte">Reservas</h1>

      <label htmlFor="q" className="sr-only">Buscar por nombre o correo</label>
      <div className="relative">
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-suave" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <input
          id="q"
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Buscar por nombre o correo"
          value={filters.query}
          onChange={(e) => set({ query: e.target.value })}
          className={`${input} pl-11`}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          id="toggle-filtros"
          aria-expanded={open}
          aria-controls="filtros"
          onClick={() => setOpen((o) => !o)}
          className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border-[1.5px] px-3.5 py-1.5 text-sm font-extrabold ${nFilters ? 'border-monte bg-monte text-crema' : 'border-monte bg-transparent text-monte'}`}
        >
          <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          Filtros
          {nFilters > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-maiz px-1 text-[11.5px] leading-none text-carbon tabular-nums">{nFilters}</span>
          )}
        </button>
        {summary.length > 0 && <span className="min-w-0 text-[13px] text-suave">{summary.join(' · ')}</span>}
      </div>

      {open && (
        <div id="filtros" className="mt-3 flex flex-col gap-4 rounded-[10px] border border-linea-2 bg-papel px-4 py-3.5">
          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[13px] font-extrabold text-suave">Estado</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={!filters.statuses.length} onClick={() => set({ statuses: [] })} className={chip(!filters.statuses.length)}>
                Todos
              </button>
              {STATUS_ORDER.map((s) => (
                <button key={s} type="button" data-filtro-estado={s} aria-pressed={filters.statuses.includes(s)} onClick={() => toggleStatus(s)} className={chip(filters.statuses.includes(s))}>
                  {STATUS[s].name}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[13px] font-extrabold text-suave">Servicio</legend>
            <Segmented<ServiceId | 'todos'>
              label="Servicio"
              value={filters.service}
              onChange={(v) => set({ service: v })}
              options={[
                { value: 'todos', label: 'Los dos' },
                { value: 'almuerzo', label: 'Almuerzo' },
                { value: 'cena', label: 'Cena' },
              ]}
            />
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2 p-0 text-[13px] font-extrabold text-suave">Fechas</legend>
            <div className="mb-2.5 flex flex-wrap gap-2">
              {presets.map((p) => {
                const on = filters.from === p.from && filters.to === p.to;
                return (
                  <button key={p.id} type="button" data-preset={p.id} aria-pressed={on} onClick={() => set({ from: p.from, to: p.to })} className={chip(on)}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <label className={labelCls} htmlFor="f-desde">
                Desde
                <input id="f-desde" type="date" className={input} value={filters.from} aria-invalid={inverted} onChange={(e) => set({ from: e.target.value })} />
              </label>
              <label className={labelCls} htmlFor="f-hasta">
                Hasta
                <input id="f-hasta" type="date" className={input} value={filters.to} aria-invalid={inverted} onChange={(e) => set({ to: e.target.value })} />
              </label>
            </div>
            {inverted && <p className="mt-2 mb-0 text-[13px] font-bold text-aji">La fecha «Desde» es posterior a «Hasta». Cambiá una de las dos.</p>}
          </fieldset>

          <div className="flex justify-between gap-2.5">
            <LinkButton onClick={clear}>Limpiar filtros</LinkButton>
            <Button size="sm" variant="solid" onClick={() => setOpen(false)}>
              Ver {reservas(results.length)}
            </Button>
          </div>
        </div>
      )}

      <p className="mt-4 mb-2 text-base text-suave" aria-live="polite">
        <b className="text-monte tabular-nums">{results.length}</b> {results.length === 1 ? 'reserva' : 'reservas'}
      </p>

      {results.length ? (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <section key={g.date}>
              <h2 className={`mb-2 flex items-center gap-2.5 font-sans text-[11px] font-extrabold uppercase tracking-[.16em] after:h-px after:flex-1 after:bg-linea-2 ${g.date === today ? 'text-barro' : 'text-suave'}`}>
                {g.date === today ? `Hoy · ${fechaLarga(g.date)}` : fechaLarga(g.date)}
              </h2>
              <div className="flex flex-col gap-2">
                {g.items.map((x) => (
                  <ReservationItem key={x.id} reservation={x} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : state.reservations.length === 0 ? (
        <EmptyState title="Todavía no hay reservas">Las reservas que cargues van a aparecer acá, ordenadas por fecha.</EmptyState>
      ) : (
        <EmptyState
          title={filters.query ? 'No encontramos nada' : 'No hay reservas con esos filtros'}
          action={!isDefault ? <Button onClick={clear}>Limpiar búsqueda y filtros</Button> : undefined}
        >
          {inverted
            ? 'El rango de fechas está al revés.'
            : filters.query
              ? `Ninguna reserva tiene «${filters.query.trim()}» en el nombre o el correo con estos filtros.`
              : 'Probá con otro estado, otro servicio u otras fechas.'}
        </EmptyState>
      )}
    </>
  );
}
