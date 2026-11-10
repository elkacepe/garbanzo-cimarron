import { useState, type FormEvent } from 'react';
import type { ServiceId } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { fechaLarga, isMonday, isValidISO, todayISO } from '../lib/dates';
import { SERVICE_ORDER, SERVICES, STATUS } from '../lib/catalog';
import { reservas } from '../lib/format';
import { STORAGE_KEY } from '../data/storage';
import { makeSeed } from '../data/seed';
import { StorageBanner } from '../components/StorageBanner';
import { Button, Eyebrow, SectionTitle } from '../components/ui';
import { BlockingReservations, ResourceEditor } from '../components/ResourceEditor';
import { futureReservations, liveResources, resourceSummary } from '../lib/resources';

/**
 * PUNTO DE CONEXIÓN · acceso.
 * Clave compartida del panel, validada en el navegador. No hay cuentas, alta de usuarios
 * ni recuperación de acceso. No es seguridad real: cualquiera puede leerla en el código.
 */
export const PANEL_CLAVE = 'garbanzo2026';
const PANEL_SESSION_KEY = 'garbanzo-cimarron.panel';

const readSession = () => {
  try {
    return sessionStorage.getItem(PANEL_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const card = 'flex flex-col gap-3 rounded-[10px] border border-linea-2 bg-papel px-4 py-3.5';
const input =
  'w-full min-h-[46px] rounded-lg border-[1.5px] border-linea-2 bg-blanco px-3 py-2.5 text-base font-semibold text-carbon focus:border-monte focus:outline-none focus:ring-[3px] focus:ring-monte/20 aria-[invalid=true]:border-aji';
const labelCls = 'flex flex-col gap-[5px] text-[13px] font-extrabold text-suave';

/** Pantalla 5 · Panel del encargado. */
export function PanelScreen() {
  const [open, setOpen] = useState(readSession);
  if (!open) return <Lock onOpen={() => setOpen(true)} />;
  return (
    <Panel
      onClose={() => {
        try {
          sessionStorage.removeItem(PANEL_SESSION_KEY);
        } catch {
          /* sin sessionStorage */
        }
        setOpen(false);
      }}
    />
  );
}

function Lock({ onOpen }: { onOpen: () => void }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (key.trim() === PANEL_CLAVE) {
      try {
        sessionStorage.setItem(PANEL_SESSION_KEY, '1');
      } catch {
        /* queda abierto solo en memoria */
      }
      onOpen();
    } else setError('Esa clave no es. Probá de nuevo.');
  };
  return (
    <>
      <StorageBanner />
      <Eyebrow>Encargado</Eyebrow>
      <h1 className="mt-1 mb-2 text-4xl text-monte">Panel</h1>
      <p className="mt-0 mb-4 text-suave">Mesas activas, bloqueos de servicio y datos de prueba. Pedí la clave del local.</p>
      <form id="lock" noValidate onSubmit={submit} className={card}>
        <label className={labelCls} htmlFor="p-key">
          Clave del panel
          <input id="p-key" type="password" autoComplete="off" className={input} value={key} aria-invalid={!!error} onChange={(e) => setKey(e.target.value)} />
        </label>
        {error && <p className="m-0 text-[13px] font-bold text-aji">{error}</p>}
        <Button type="submit" variant="solid">Entrar</Button>
      </form>
    </>
  );
}

function Panel({ onClose }: { onClose: () => void }) {
  const { state, commit, replace } = useAgenda();
  const T = todayISO();
  const [confirm, setConfirm] = useState<'vaciar' | 'restaurar' | null>(null);
  const [blkDate, setBlkDate] = useState('');
  const [blkSvc, setBlkSvc] = useState<ServiceId | 'ambos'>('almuerzo');
  const [blkReason, setBlkReason] = useState('');
  const [blkError, setBlkError] = useState('');
  // Recurso en edición: id, 'nuevo' o null (vista del panel).
  const [editing, setEditing] = useState<string | null>(null);
  // Recurso que no se pudo desactivar porque tiene reservas futuras.
  const [blockedToggle, setBlockedToggle] = useState<string | null>(null);

  const resources = liveResources(state);
  const capTotal = resources.filter((r) => r.active).reduce((a, r) => a + r.capacity, 0);

  const openEditor = (id: string) => {
    setBlockedToggle(null);
    setEditing(id);
    window.scrollTo(0, 0);
  };
  if (editing) {
    const r = resources.find((y) => y.id === editing);
    const done = () => {
      setEditing(null);
      window.scrollTo(0, 0);
    };
    if (editing !== 'nuevo' && !r) {
      done();
      return null;
    }
    return <ResourceEditor key={editing} resource={r} onDone={done} />;
  }
  const blocks = state.blocks.filter((b) => b.date >= T).sort((a, b) => (a.date + a.service).localeCompare(b.date + b.service));

  const addBlock = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidISO(blkDate)) return setBlkError('Elegí una fecha.');
    if (blkDate < T) return setBlkError('Esa fecha ya pasó.');
    if (isMonday(blkDate)) return setBlkError('Los lunes ya está cerrado: no hace falta bloquearlo.');
    const svcs = blkSvc === 'ambos' ? SERVICE_ORDER : [blkSvc];
    const nuevos = svcs.filter((s) => !state.blocks.some((b) => b.date === blkDate && b.service === s));
    if (!nuevos.length) return setBlkError('Ese servicio ya estaba bloqueado.');
    const activos = state.reservations.filter((x) => x.date === blkDate && nuevos.includes(x.service) && STATUS[x.status].occupies).length;
    const ok = commit(
      (d) => nuevos.forEach((s) => d.blocks.push({ date: blkDate, service: s, reason: blkReason.trim() })),
      activos ? `Bloqueado. Ojo: ya había ${reservas(activos)}, siguen en pie.` : 'Servicio bloqueado',
    );
    if (ok) {
      setBlkError('');
      setBlkReason('');
    }
  };

  return (
    <>
      <StorageBanner />
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <Eyebrow>Encargado</Eyebrow>
          <h1 className="mt-1 text-4xl text-monte">Panel</h1>
        </div>
        <Button size="sm" onClick={onClose}>Cerrar panel</Button>
      </div>

      <SectionTitle title="Mesas y lugares" aside={`${capTotal} cubiertos por servicio`} />
      <div className={card}>
        <div className="divide-y divide-linea">
          {resources.map((r) => {
            const blocked = blockedToggle === r.id ? futureReservations(state, r.id, T) : [];
            return (
              <div key={r.id} className="py-2">
                <div className="flex items-center justify-between gap-2.5">
                  <button type="button" data-editar={r.id} onClick={() => openEditor(r.id)} className="min-w-0 flex-1 text-left" aria-label={`Editar ${r.name}`}>
                    <strong className="block font-extrabold">{r.name}</strong>
                    <small className="text-[12.5px] text-suave">
                      {r.sector} · {resourceSummary(r)}
                      {!r.active && ' · fuera de servicio'}
                    </small>
                  </button>
                  <Button size="sm" aria-hidden="true" tabIndex={-1} onClick={() => openEditor(r.id)}>Editar</Button>
                  <label className="relative h-[30px] w-[50px] flex-none">
                    <input
                      type="checkbox"
                      data-toggle={r.id}
                      aria-label={`${r.name} activa`}
                      checked={r.active}
                      onChange={(e) => {
                        const on = e.target.checked;
                        // Sacar de servicio una mesa con reservas futuras las dejaría sin lugar.
                        if (!on && futureReservations(state, r.id, T).length) {
                          setBlockedToggle(r.id);
                          return;
                        }
                        setBlockedToggle(null);
                        commit((d) => {
                          d.resources.find((y) => y.id === r.id)!.active = on;
                        }, `${r.name}: ${on ? 'activa' : 'fuera de servicio'}`);
                      }}
                      className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
                    />
                    <span className="pointer-events-none absolute inset-0 rounded-full bg-cerrado transition-colors peer-checked:bg-libre peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-barro after:absolute after:top-[3px] after:left-[3px] after:size-6 after:rounded-full after:bg-blanco after:shadow-[0_1px_2px_rgb(0_0_0/.2)] after:transition-transform peer-checked:after:translate-x-5" />
                  </label>
                </div>
                {blocked.length > 0 && (
                  <div role="alert" className="mt-2 rounded-[10px] border-[1.5px] border-aji bg-alerta px-3.5 py-3">
                    <strong className="block text-aji">No se puede sacar de servicio: tiene {reservas(blocked.length)} de hoy en adelante.</strong>
                    <span className="text-[13px] text-carbon">Pasalas a otro lugar o cancelalas desde su ficha.</span>
                    <BlockingReservations list={blocked} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <Button variant="barro" id="r-nuevo" onClick={() => openEditor('nuevo')}>Agregar mesa o lugar</Button>
      </div>
      <p className="mt-2 mb-0 text-[13px] text-suave">
        Tocá un lugar para editarlo o borrarlo. Si tiene reservas de hoy en adelante, no se puede borrar, sacar de servicio ni achicar por debajo de lo reservado.
      </p>

      <SectionTitle title="Bloquear un servicio" />
      <form id="blk" noValidate onSubmit={addBlock} className={card}>
        <div className="grid grid-cols-2 gap-2.5">
          <label className={labelCls} htmlFor="b-date">
            Fecha
            <input id="b-date" type="date" min={T} className={input} value={blkDate} onChange={(e) => setBlkDate(e.target.value)} />
          </label>
          <label className={labelCls} htmlFor="b-svc">
            Servicio
            <select id="b-svc" className={input} value={blkSvc} onChange={(e) => setBlkSvc(e.target.value as ServiceId | 'ambos')}>
              <option value="almuerzo">Almuerzo</option>
              <option value="cena">Cena</option>
              <option value="ambos">Los dos</option>
            </select>
          </label>
        </div>
        <label className={labelCls} htmlFor="b-reason">
          Motivo
          <input id="b-reason" className={input} placeholder="Ej.: evento privado, fumigación" value={blkReason} onChange={(e) => setBlkReason(e.target.value)} />
        </label>
        {blkError && <p className="m-0 text-[13px] font-bold text-aji">{blkError}</p>}
        <Button type="submit" variant="solid">Bloquear</Button>
      </form>
      <div className={`${card} mt-2.5`}>
        {blocks.length ? (
          <div className="divide-y divide-linea">
            {blocks.map((b) => (
              <div key={b.date + b.service} className="flex items-center justify-between gap-2.5 py-2">
                <div>
                  <strong className="tabular-nums">{fechaLarga(b.date)}</strong>
                  <br />
                  <small className="text-suave">
                    {SERVICES[b.service].name}
                    {b.reason && ` · ${b.reason}`}
                  </small>
                </div>
                <Button
                  size="sm"
                  onClick={() => commit((d) => { d.blocks = d.blocks.filter((y) => !(y.date === b.date && y.service === b.service)); }, 'Servicio desbloqueado')}
                >
                  Quitar
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-suave">No hay servicios bloqueados de acá en adelante.</p>
        )}
      </div>

      <SectionTitle title="Datos" />
      <div className={card}>
        <p className="m-0">
          Todo se guarda en este navegador, en la clave <code className="rounded bg-monte/8 px-1.5 py-px font-extrabold">{STORAGE_KEY}</code>. Hay {reservas(state.reservations.length)} guardadas.
        </p>
        {confirm === 'vaciar' ? (
          <ConfirmBox text="Se borran todas las reservas. Las mesas y los bloqueos quedan. ¿Seguimos?" yes="Sí, borrar" onYes={() => { setConfirm(null); commit((d) => { d.reservations = []; }, 'Reservas borradas'); }} onNo={() => setConfirm(null)} />
        ) : (
          <Button variant="aji" id="p-vaciar" onClick={() => setConfirm('vaciar')}>Borrar todas las reservas</Button>
        )}
        {confirm === 'restaurar' ? (
          <ConfirmBox
            text="Se reemplazan las reservas, mesas y bloqueos de esta agenda por los datos de prueba. No toca nada fuera de esta app. ¿Seguimos?"
            yes="Sí, restaurar"
            onYes={() => { setConfirm(null); replace(makeSeed(), 'Datos de prueba restaurados'); }}
            onNo={() => setConfirm(null)}
          />
        ) : (
          <Button id="p-restore" onClick={() => setConfirm('restaurar')}>Restaurar datos de prueba</Button>
        )}
      </div>

      <SectionTitle title="Probar el caso de Valentina" />
      <div className={card}>
        <ol className="m-0 flex list-decimal flex-col gap-1.5 pl-5 text-sm">
          <li>En el mes, el sábado próximo tiene la cena en amarillo.</li>
          <li>Entrá al día, pestaña Cena: el Salón del Fondo dice «Queda libre».</li>
          <li>Tocalo, poné 12 cubiertos, dejala en «Pendiente» y guardá.</li>
          <li>El sábado siguiente hay un cumpleaños de 12 confirmado. Cancelalo y el salón vuelve a quedar libre, sin recargar.</li>
        </ol>
      </div>
    </>
  );
}

function ConfirmBox({ text, yes, onYes, onNo }: { text: string; yes: string; onYes: () => void; onNo: () => void }) {
  return (
    <div role="alertdialog" aria-label="Confirmar" className="flex flex-col gap-2.5 rounded-[10px] border-[1.5px] border-aji bg-alerta p-3.5">
      <p className="m-0 font-bold text-carbon">{text}</p>
      <div className="grid grid-cols-2 gap-2.5">
        <Button variant="ajiSolid" data-confirm-ok onClick={onYes}>{yes}</Button>
        <Button onClick={onNo}>No</Button>
      </div>
    </div>
  );
}
