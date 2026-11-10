import type { Reservation, Resource, ServiceId } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { addDays, DIAS, isMonday, MESES, monthOf, parseISO, todayISO } from '../lib/dates';
import { RESTRICTIONS, SERVICE_ORDER, SERVICES, STATUS, serviceWithArticle } from '../lib/catalog';
import { blockOf, dayServiceKind, level, pctLabel, serviceState, serviceUsage, type ResourceUsage } from '../lib/capacity';
import { asientos, personas, reservas } from '../lib/format';
import { ReservationItem } from '../components/ReservationItem';
import { StorageBanner } from '../components/StorageBanner';
import { Banner, Button, CalendarIcon, Chevron, Dot, Eyebrow, IconButton, LevelPill, StatusPill } from '../components/ui';

export interface NewReservationPrefill {
  date: string;
  service: ServiceId;
  resourceId?: string;
}

/** Pantalla 2 · Día: los dos servicios, cada recurso y sus reservas. */
export function DayScreen({
  date,
  service,
  onService,
  onNew,
}: {
  date: string;
  service: ServiceId;
  onService: (s: ServiceId) => void;
  onNew: (pre: NewReservationPrefill) => void;
}) {
  const { state } = useAgenda();
  const T = todayISO();
  const d = parseISO(date);

  // Mismo criterio que el mes: fecha a la izquierda; flechas y botón del mes juntos a la derecha.
  const head = (
    <div className="flex items-center gap-2.5">
      <div className="min-w-0 flex-1">
        <Eyebrow>{date === T ? `Hoy · ${DIAS[d.getDay()]}` : DIAS[d.getDay()]}</Eyebrow>
        <h1 className="mt-1 text-[clamp(34px,10vw,46px)] leading-none text-monte">
          <span className="tabular-nums">{d.getDate()}</span>
          <span className="ml-1.5 align-[.45em] font-sans text-[.5em] font-extrabold tracking-[.06em] text-barro">
            {MESES[d.getMonth()]}
          </span>
        </h1>
      </div>
      <div className="flex flex-none gap-2">
        <IconButton label="Día anterior" onClick={() => navigate('dia-' + addDays(date, -1))}>
          <Chevron dir="l" />
        </IconButton>
        <IconButton label="Día siguiente" onClick={() => navigate('dia-' + addDays(date, 1))}>
          <Chevron dir="r" />
        </IconButton>
        {/* Vuelve a la grilla del mes de este día, con la casilla marcada. */}
        <IconButton label={`Ver ${MESES[d.getMonth()]} completo`} data-ver-mes onClick={() => navigate('mes-' + monthOf(date))}>
          <CalendarIcon />
        </IconButton>
      </div>
    </div>
  );

  if (isMonday(date)) {
    return (
      <>
        <StorageBanner />
        {head}
        <Banner tone="cerrado" className="mt-5" title="Los lunes el comedor está cerrado.">
          No se toman reservas. Probá el martes.
        </Banner>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button onClick={() => navigate('dia-' + addDays(date, 1))}>Ir al martes</Button>
          <Button onClick={() => navigate('mes-' + monthOf(date))}>Ver el mes</Button>
        </div>
      </>
    );
  }

  return (
    <>
      <StorageBanner />
      {head}
      <div role="tablist" aria-label="Servicio" className="mt-[18px] grid grid-cols-2 overflow-hidden rounded-[10px] border-[1.5px] border-monte">
        {SERVICE_ORDER.map((s, i) => {
          const u = serviceUsage(state, date, s);
          const blocked = serviceState(state, date, s) === 'bloqueado';
          const selected = s === service;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              data-svc={s}
              aria-selected={selected}
              onClick={() => onService(s)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2.5 ${i ? 'border-l-[1.5px] border-monte' : ''} ${selected ? 'bg-monte text-crema' : 'bg-papel text-monte'}`}
            >
              <span className="flex items-center gap-[7px] text-[15px] font-extrabold">
                <Dot kind={dayServiceKind(state, date, s).kind} className="size-[11px]" />
                {SERVICES[s].name}
              </span>
              <span className="text-xs tabular-nums opacity-80">{blocked ? 'Bloqueado' : `${pctLabel(u.pct)} · ${u.used}/${u.capacity}`}</span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel">
        <ServicePanel date={date} service={service} onNew={onNew} />
      </div>
    </>
  );
}

function ServicePanel({ date, service, onNew }: { date: string; service: ServiceId; onNew: (pre: NewReservationPrefill) => void }) {
  const { state } = useAgenda();
  const S = SERVICES[service];
  const stt = serviceState(state, date, service);
  const u = serviceUsage(state, date, service);
  const lv = level(u.pct);
  const past = date < todayISO();
  const canBook = stt === 'abierto' && !past;
  const sectors = [...new Set(state.resources.map((r) => r.sector))];
  const others = state.reservations.filter((x) => x.date === date && x.service === service && !STATUS[x.status].occupies);
  const barColor = lv === 'verde' ? 'bg-libre' : lv === 'amarillo' ? 'bg-maiz' : 'bg-aji';

  return (
    <>
      <div className="mt-4 mb-1.5 flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2.5">
          <span className="font-display text-[30px] leading-none tabular-nums">{pctLabel(u.pct)}</span>
          {stt === 'bloqueado' ? (
            <LevelPill level="bloqueado">Bloqueado</LevelPill>
          ) : (
            <LevelPill level={lv}>{lv === 'verde' ? 'Hay lugar' : lv === 'amarillo' ? 'Se va llenando' : 'Casi lleno'}</LevelPill>
          )}
        </div>
        {/* Barra con marcas en 50 % y 85 %, los umbrales de color */}
        <div className="relative h-2.5 overflow-hidden rounded-full bg-monte/12" aria-hidden="true">
          <i className={`block h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, u.pct)}%` }} />
          <span className="absolute inset-y-0 left-1/2 w-0.5 bg-crema" />
          <span className="absolute inset-y-0 left-[85%] w-0.5 bg-crema" />
        </div>
        <div className="flex flex-wrap justify-between gap-2.5 text-[13px] text-suave tabular-nums">
          <span>
            {u.used} de {u.capacity} cubiertos · {S.start} a {S.end}
          </span>
          <span>{reservas(u.count)}</span>
        </div>
      </div>

      {stt === 'bloqueado' && (
        <Banner tone="bloqueado" title={`Servicio bloqueado${blockOf(state, date, service)?.reason ? ': ' + blockOf(state, date, service)!.reason : ''}.`}>
          No se toman reservas nuevas. Las que ya estaban siguen abajo.
        </Banner>
      )}
      {stt !== 'bloqueado' && past && <Banner tone="info">Este día ya pasó. Podés revisar y cambiar estados, pero no cargar reservas nuevas.</Banner>}
      {canBook && (
        <div className="mt-2">
          <Button variant="barro" wide onClick={() => onNew({ date, service })}>
            Reservar para {serviceWithArticle(service)}
          </Button>
        </div>
      )}

      {sectors.map((sec) => {
        const rs = state.resources.filter((r) => r.sector === sec && (r.active || u.byResource[r.id].list.length));
        if (!rs.length) return null;
        return (
          <section key={sec}>
            <div className="mt-[18px] mb-2 flex items-center gap-2.5 text-[11px] font-extrabold uppercase tracking-[.16em] text-suave after:h-px after:flex-1 after:bg-linea-2">{sec}</div>
            <div className="flex flex-col gap-2">
              {rs.map((r) => (
                <ResourceCard key={r.id} resource={r} usage={u.byResource[r.id]} canBook={canBook} onBook={() => onNew({ date, service, resourceId: r.id })} />
              ))}
            </div>
          </section>
        );
      })}

      {!state.resources.some((r) => r.active) && <Banner tone="info" title="Sin mesas activas">Activá mesas desde el panel para poder reservar.</Banner>}

      {others.length > 0 && (
        <details className="mt-4 border-t border-linea-2 pt-2.5">
          <summary className="cursor-pointer text-[13.5px] font-extrabold text-suave">Canceladas y no vinieron ({others.length})</summary>
          <div className="mt-2.5 flex flex-col gap-2">
            {others.map((x) => (
              <ReservationItem key={x.id} reservation={x} />
            ))}
          </div>
        </details>
      )}
      {!u.count && stt === 'abierto' && (
        <p className="mt-[18px] text-center text-suave">Todavía no hay reservas para {serviceWithArticle(service)}. Queda todo libre.</p>
      )}
    </>
  );
}

function ResourceCard({ resource: r, usage: b, canBook, onBook }: { resource: Resource; usage: ResourceUsage; canBook: boolean; onBook: () => void }) {
  const capLabel = r.mode === 'seat' ? `${r.capacity} asientos` : r.minPeople ? `Hasta ${r.capacity} · mín. ${r.minPeople}` : `Mesa para ${r.capacity}`;
  const top = (
    <div className="flex items-baseline justify-between gap-2.5 px-3.5 pt-[11px]">
      <strong className="text-[15px] font-extrabold">{r.name}</strong>
      <span className="whitespace-nowrap text-[12.5px] text-suave">
        {capLabel}
        {r.deletedAt ? ' · eliminado' : !r.active && ' · fuera de servicio'}
      </span>
    </div>
  );
  const base = `overflow-hidden rounded-[10px] border bg-papel ${r.active ? '' : 'opacity-70'}`;

  if (r.mode === 'seat') {
    return (
      <div className={`${base} border-linea-2`}>
        {top}
        <div className="grid grid-cols-12 gap-[3px] px-3.5 pt-2 pb-0.5" aria-hidden="true">
          {Array.from({ length: r.capacity }, (_, i) => (
            <i key={i} className={`h-3 rounded-[3px] ${i < b.used ? 'bg-barro' : 'bg-monte/12'}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 pt-1 pb-3 text-[13px] tabular-nums">
          <span>
            <b>{b.free ? `Quedan ${asientos(b.free)}` : 'Mesón completo'}</b> de {r.capacity}
          </span>
          {canBook && b.free > 0 && r.active && (
            <Button size="sm" data-new-res={r.id} onClick={onBook}>
              Sumar gente
            </Button>
          )}
        </div>
        {b.list.length > 0 && (
          <div className="divide-y divide-dashed divide-linea border-t border-dashed border-linea-2">
            {b.list.map((x) => (
              <GuestRow key={x.id} reservation={x} resource={r} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (b.list.length) {
    const x = b.list[0];
    return (
      <div className={`${base} border-monte ${x.status === 'pendiente' ? 'shadow-[inset_4px_0_0_var(--color-maiz)]' : 'shadow-[inset_4px_0_0_var(--color-monte)]'}`}>
        {top}
        <GuestRow reservation={x} resource={r} />
      </div>
    );
  }

  if (!canBook || !r.active) {
    return (
      <div className={`${base} border-linea-2`}>
        {top}
        <div className="px-3.5 pt-1.5 pb-3 text-suave">{r.active ? 'Libre' : 'No se ofrece'}</div>
      </div>
    );
  }

  return (
    <div className={`${base} border-linea-2`}>
      {top}
      <button type="button" data-new-res={r.id} onClick={onBook} className="flex w-full items-center justify-between gap-2.5 px-3.5 pt-1.5 pb-3 text-left font-extrabold text-libre">
        <span>Queda libre</span>
        <span aria-hidden="true" className="grid size-[30px] flex-none place-items-center rounded-full bg-libre text-xl leading-none text-blanco">
          +
        </span>
      </button>
    </div>
  );
}

function GuestRow({ reservation: x, resource: r }: { reservation: Reservation; resource: Resource }) {
  const covers = r.mode === 'whole' && x.covers < r.capacity ? `${x.covers} de ${r.capacity}` : personas(x.covers);
  const rest = x.restrictions.length ? ' · ' + x.restrictions.map((id) => RESTRICTIONS.find((z) => z.id === id)?.name.toLowerCase()).join(', ') : '';
  return (
    <button
      type="button"
      data-res={x.id}
      onClick={() => navigate('reserva-' + x.id)}
      className="flex w-full items-center justify-between gap-2.5 px-3.5 pt-1.5 pb-3 text-left text-monte"
    >
      <span className="min-w-0">
        <b className="block font-extrabold [overflow-wrap:anywhere]">{x.name}</b>
        <small className="text-[13px] text-suave tabular-nums">
          {x.time} · {covers}
          {rest}
        </small>
      </span>
      <StatusPill status={x.status} />
    </button>
  );
}
