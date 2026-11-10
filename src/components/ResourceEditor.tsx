import { useState, type FormEvent } from 'react';
import type { Resource, ResourceMode } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { fechaCorta, todayISO } from '../lib/dates';
import { SERVICES } from '../lib/catalog';
import { personas, reservas } from '../lib/format';
import {
  editConflicts,
  futureReservations,
  liveResources,
  MAX_RESOURCE_CAPACITY,
  newResourceId,
  validateResourceFields,
  type ResourceDraft,
  type ResourceErrors,
} from '../lib/resources';
import { Button, Chevron, IconButton, Segmented, StatusPill } from './ui';
import type { Reservation } from '../types';

const input =
  'w-full min-h-[46px] rounded-lg border-[1.5px] border-linea-2 bg-blanco px-3 py-2.5 text-base font-semibold text-carbon focus:border-monte focus:outline-none focus:ring-[3px] focus:ring-monte/20 aria-[invalid=true]:border-aji';
const labelCls = 'flex min-w-0 flex-col gap-[5px] text-[13px] font-extrabold text-suave';
const card = 'flex flex-col gap-3 rounded-[10px] border border-linea-2 bg-papel px-4 py-3.5';

function Err({ children }: { children?: string }) {
  return children ? <p className="m-0 text-[13px] font-bold text-aji">{children}</p> : null;
}

/** Lista corta de reservas que bloquean un cambio, con acceso a cada ficha. */
export function BlockingReservations({ list, reasons }: { list: Reservation[]; reasons?: Map<string, string> }) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-linea p-0">
      {list.map((x) => (
        <li key={x.id}>
          <button type="button" onClick={() => navigate('reserva-' + x.id)} className="flex w-full items-center justify-between gap-2.5 py-2 text-left text-carbon">
            <span className="min-w-0">
              <b className="block font-extrabold [overflow-wrap:anywhere]">
                {x.code} · {x.name}
              </b>
              <small className="text-[13px] text-suave tabular-nums">
                {reasons?.get(x.id) ?? `${fechaCorta(x.date)}, ${SERVICES[x.service].name.toLowerCase()} ${x.time} · ${personas(x.covers)}`}
              </small>
            </span>
            <StatusPill status={x.status} />
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Alta o edición de un recurso (mesa, mesón o salón), con borrado. */
export function ResourceEditor({ resource, onDone }: { resource?: Resource; onDone: () => void }) {
  const { state, commit } = useAgenda();
  const today = todayISO();
  const [d, setD] = useState<ResourceDraft>(() =>
    resource
      ? { name: resource.name, sector: resource.sector, mode: resource.mode, capacity: resource.capacity, minPeople: resource.minPeople }
      : { name: '', sector: '', mode: 'whole', capacity: 4, minPeople: 0 },
  );
  const [errors, setErrors] = useState<ResourceErrors>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Partial<ResourceDraft>) => setD((p) => ({ ...p, ...patch }));

  const sectors = [...new Set(liveResources(state).map((r) => r.sector))];
  const future = resource ? futureReservations(state, resource.id, today) : [];
  const draft: ResourceDraft = { ...d, minPeople: d.mode === 'seat' ? 0 : d.minPeople };
  // Se recalcula con cada cambio: el aviso aparece mientras se edita, no recién al guardar.
  const conflicts = resource && Number.isInteger(draft.capacity) && draft.capacity > 0 ? editConflicts(state, resource.id, draft, today) : [];
  const pastCount = resource ? state.reservations.filter((x) => x.resourceId === resource.id).length - future.length : 0;

  function save(e: FormEvent) {
    e.preventDefault();
    const errs = validateResourceFields(state, draft, resource?.id);
    setErrors(errs);
    if (Object.keys(errs).length || conflicts.length) return;
    const clean = { ...draft, name: draft.name.trim(), sector: draft.sector.trim() };
    const ok = resource
      ? commit((s) => {
          Object.assign(s.resources.find((r) => r.id === resource.id)!, clean);
        }, `Cambios guardados · ${clean.name}`)
      : commit((s) => {
          s.resources.push({ id: newResourceId(s, clean.name), ...clean, active: true });
        }, `Lugar agregado · ${clean.name}`);
    if (ok) onDone();
  }

  function remove() {
    if (!resource || future.length) return;
    const ok = commit((s) => {
      const r = s.resources.find((y) => y.id === resource.id)!;
      r.active = false;
      r.deletedAt = new Date().toISOString();
    }, `Lugar borrado · ${resource.name}`);
    if (ok) onDone();
  }

  return (
    <>
      <div className="mb-1.5 flex items-center gap-3">
        <IconButton label="Volver al panel" onClick={onDone}>
          <Chevron dir="l" />
        </IconButton>
        <h1 className="min-w-0 flex-1 text-[32px] leading-[1.05] text-monte [overflow-wrap:anywhere]">{resource ? resource.name : 'Nuevo lugar'}</h1>
      </div>
      {resource && (
        <p className="mt-0 mb-3 text-suave">
          {future.length ? `Tiene ${reservas(future.length)} de hoy en adelante.` : 'No tiene reservas de hoy en adelante.'}
        </p>
      )}

      <form id="recurso" noValidate onSubmit={save} className={card}>
        <label className={labelCls} htmlFor="r-name">
          Nombre
          <input id="r-name" className={input} autoComplete="off" placeholder="Ej.: Mesa Ventana 3" value={d.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />
        </label>
        <Err>{errors.name}</Err>

        <label className={labelCls} htmlFor="r-sector">
          Sector
          <input id="r-sector" className={input} autoComplete="off" list="r-sectores" placeholder="Ej.: Patio" value={d.sector} aria-invalid={!!errors.sector} onChange={(e) => set({ sector: e.target.value })} />
          <datalist id="r-sectores">
            {sectors.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <Err>{errors.sector}</Err>

        <div className="flex flex-col gap-[5px]">
          <span className="text-[13px] font-extrabold text-suave">Cómo se reserva</span>
          <Segmented<ResourceMode>
            label="Cómo se reserva"
            value={d.mode}
            onChange={(m) => set({ mode: m })}
            options={[
              { value: 'whole', label: 'Mesa entera' },
              { value: 'seat', label: 'Por asiento' },
            ]}
          />
          <p className="m-0 text-[12.5px] text-suave">
            {d.mode === 'whole'
              ? 'Cada reserva ocupa el lugar completo, aunque vengan menos personas.'
              : 'Cada reserva toma solo los asientos que necesita, como el mesón.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls} htmlFor="r-cap">
            {d.mode === 'seat' ? 'Asientos' : 'Capacidad'}
            <input
              id="r-cap"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_RESOURCE_CAPACITY}
              className={`${input} tabular-nums`}
              value={Number.isNaN(d.capacity) ? '' : d.capacity}
              aria-invalid={!!errors.capacity}
              onChange={(e) => set({ capacity: e.target.value === '' ? NaN : parseInt(e.target.value, 10) })}
            />
          </label>
          {d.mode === 'whole' && (
            <label className={labelCls} htmlFor="r-min">
              Mínimo de personas
              <input
                id="r-min"
                type="number"
                inputMode="numeric"
                min={0}
                className={`${input} tabular-nums`}
                value={Number.isNaN(d.minPeople) ? '' : d.minPeople}
                aria-invalid={!!errors.minPeople}
                onChange={(e) => set({ minPeople: e.target.value === '' ? NaN : parseInt(e.target.value, 10) })}
              />
            </label>
          )}
        </div>
        <Err>{errors.capacity}</Err>
        <Err>{errors.minPeople}</Err>
        {d.mode === 'whole' && <p className="m-0 -mt-1 text-[12.5px] text-suave">0 = sin mínimo.</p>}

        {conflicts.length > 0 && (
          <div role="alert" className="flex flex-col gap-1 rounded-[10px] border-[1.5px] border-aji bg-alerta px-3.5 py-3">
            <strong className="text-aji">No se puede guardar así: {conflicts.length === 1 ? 'una reserva futura deja de entrar' : `${conflicts.length} reservas futuras dejan de entrar`}.</strong>
            <span className="text-[13px] text-carbon">Pasalas a otro lugar o cancelalas desde su ficha, o cambiá la configuración.</span>
            <BlockingReservations list={conflicts.map((c) => c.reservation)} reasons={new Map(conflicts.map((c) => [c.reservation.id, c.reason]))} />
          </div>
        )}

        <Button type="submit" id="r-guardar" variant="solid" disabled={conflicts.length > 0}>
          {resource ? 'Guardar cambios' : 'Agregar lugar'}
        </Button>
      </form>

      {resource && (
        <section className={`${card} mt-4`}>
          <h2 className="text-xl text-monte">Borrar este lugar</h2>
          {future.length ? (
            <>
              <p className="m-0 text-[14px]">
                No se puede borrar mientras tenga reservas de hoy en adelante. Pasalas a otro lugar o cancelalas desde su ficha.
              </p>
              <BlockingReservations list={future} />
              <Button variant="aji" disabled>Borrar</Button>
            </>
          ) : confirmDelete ? (
            <div role="alertdialog" aria-label="Confirmar" className="flex flex-col gap-2.5 rounded-[10px] border-[1.5px] border-aji bg-alerta p-3.5">
              <p className="m-0 font-bold text-carbon">
                ¿Borrar {resource.name}? Deja de ofrecerse y no suma a la capacidad.
                {pastCount > 0 && ` Sus ${reservas(pastCount)} anteriores siguen guardadas con este nombre.`}
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                <Button variant="ajiSolid" id="r-borrar-ok" onClick={remove}>Sí, borrar</Button>
                <Button onClick={() => setConfirmDelete(false)}>No</Button>
              </div>
            </div>
          ) : (
            <>
              <p className="m-0 text-[14px] text-suave">Deja de ofrecerse en el calendario y en el formulario. Las reservas pasadas se conservan.</p>
              <Button variant="aji" id="r-borrar" onClick={() => setConfirmDelete(true)}>Borrar</Button>
            </>
          )}
        </section>
      )}
    </>
  );
}
