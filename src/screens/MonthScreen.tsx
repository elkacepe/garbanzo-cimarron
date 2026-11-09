import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { cap, fechaLarga, isMonday, MESES, monthGrid, monthOf, parseISO, shiftMonth, todayISO } from '../lib/dates';
import { dayServiceKind } from '../lib/capacity';
import { ReservationItem } from '../components/ReservationItem';
import { StorageBanner } from '../components/StorageBanner';
import { Chevron, Dot, EmptyState, IconButton, LinkButton, SectionTitle } from '../components/ui';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/** Pantalla 1 · Calendario mensual. Cada día: punto izquierdo almuerzo, derecho cena. */
/** `highlight`: último día abierto; su casilla queda marcada al volver al mes. */
export function MonthScreen({ month, highlight }: { month: string; highlight?: string }) {
  const { state } = useAgenda();
  const T = todayISO();
  const [y, m] = month.split('-').map(Number);
  const cells = monthGrid(month);

  const inMonth = state.reservations.filter((x) => x.date.startsWith(month));
  const activas = inMonth.filter((x) => x.status === 'pendiente' || x.status === 'confirmada');
  const cubiertos = activas.reduce((a, x) => a + x.covers, 0);
  const pendientes = state.reservations
    .filter((x) => x.status === 'pendiente' && x.date >= T)
    .sort((a, b) => (a.date + a.service + a.time).localeCompare(b.date + b.service + b.time));

  return (
    <>
      <StorageBanner />
      {/* Mes y año a la izquierda; las dos flechas juntas a la derecha, al alcance del pulgar. */}
      <div className="mb-1.5 flex items-center gap-2.5">
        <h1 className="min-w-0 flex-1 text-[clamp(34px,10vw,46px)] leading-none text-monte">
          {cap(MESES[m - 1])}
          <span className="ml-1.5 align-[.45em] font-sans text-[.5em] font-extrabold tracking-[.06em] text-barro tabular-nums">{y}</span>
        </h1>
        <div className="flex flex-none gap-2">
          <IconButton label="Mes anterior" onClick={() => navigate('mes-' + shiftMonth(month, -1))}>
            <Chevron dir="l" />
          </IconButton>
          <IconButton label="Mes siguiente" onClick={() => navigate('mes-' + shiftMonth(month, 1))}>
            <Chevron dir="r" />
          </IconButton>
        </div>
      </div>
      <p className="mt-0 mb-3.5 flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 text-base text-suave">
        <span><b className="text-monte tabular-nums">{activas.length}</b> reservas activas</span>
        <span><b className="text-monte tabular-nums">{cubiertos}</b> cubiertos</span>
        {month !== monthOf(T) && <LinkButton onClick={() => navigate('mes-' + monthOf(T))}>Volver al mes en curso</LinkButton>}
      </p>

      <div className="overflow-hidden rounded-[10px] border-[1.5px] border-monte bg-papel">
        <div className="grid grid-cols-7 bg-monte" aria-hidden="true">
          {WEEKDAYS.map((d, i) => (
            <span key={d} className={`py-[7px] text-center text-[11px] font-extrabold uppercase tracking-[.1em] ${i === 0 ? 'text-crema/55' : 'text-crema'}`}>
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            const edge = (i + 1) % 7 === 0 ? '' : 'border-r';
            if (!date) return <span key={'p' + i} aria-hidden="true" className={`rayado-relleno min-h-[60px] border-b border-linea sm:min-h-[78px] ${edge}`} />;
            const mon = isMonday(date);
            const a = dayServiceKind(state, date, 'almuerzo');
            const c = dayServiceKind(state, date, 'cena');
            const allBlocked = a.kind === 'bloqueado' && c.kind === 'bloqueado';
            const past = date < T;
            const label = mon ? `${fechaLarga(date)}. Cerrado.` : `${fechaLarga(date)}. Almuerzo ${a.label}. Cena ${c.label}.`;
            return (
              <button
                key={date}
                type="button"
                data-date={date}
                aria-current={date === highlight ? 'date' : undefined}
                aria-label={label}
                onClick={() => navigate('dia-' + date)}
                className={`flex min-h-[60px] min-w-0 flex-col items-center justify-between gap-1.5 border-b border-linea px-0.5 pt-1.5 pb-[9px] sm:min-h-[78px] ${edge}
                  ${mon ? 'bg-lunes text-monte/50' : allBlocked ? 'rayado-suave' : 'hover:bg-barro/[.07]'}
                  ${date === highlight ? 'shadow-[inset_0_0_0_2px_var(--color-barro)]' : ''}
                  ${past && !mon ? 'text-monte/45' : ''}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full text-[15px] font-extrabold leading-none tabular-nums sm:text-[17px] ${date === T ? 'bg-barro text-blanco' : ''}`}
                >
                  {parseISO(date).getDate()}
                </span>
                <span className={`flex gap-[5px] ${past ? 'opacity-50' : ''}`}>
                  <Dot kind={a.kind} />
                  <Dot kind={c.kind} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-3.5 gap-y-2 text-[12.5px] text-suave">
        <div className="col-span-full flex items-center gap-2">
          <span className="flex gap-[5px]" aria-hidden="true">
            <i className="inline-block size-[11px] rounded-full bg-monte/35" />
            <i className="inline-block size-[11px] rounded-full bg-monte/35" />
          </span>
          Almuerzo / Cena
        </div>
        <Legend kind="verde" text="Hasta 49 %" />
        <Legend kind="amarillo" text="De 50 a 84 %" />
        <Legend kind="rojo" text="De 85 a 100 %" />
        <Legend kind="libre" text="Sin reservas" />
        <Legend kind="cerrado" text="Cerrado" />
        <Legend kind="bloqueado" text="Bloqueado" />
      </div>

      <SectionTitle title="Falta confirmar" count={pendientes.length} countLabel={`${pendientes.length} ${pendientes.length === 1 ? 'reserva pendiente' : 'reservas pendientes'}`} />
      {pendientes.length ? (
        <div className="flex flex-col gap-2">
          {pendientes.slice(0, 8).map((x) => (
            <ReservationItem key={x.id} reservation={x} />
          ))}
        </div>
      ) : (
        <EmptyState title="Todo confirmado">No hay reservas esperando confirmación. Las nuevas en «Pendiente» van a aparecer acá.</EmptyState>
      )}
    </>
  );
}

function Legend({ kind, text }: { kind: Parameters<typeof Dot>[0]['kind']; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <Dot kind={kind} className="size-[11px]" />
      {text}
    </div>
  );
}
