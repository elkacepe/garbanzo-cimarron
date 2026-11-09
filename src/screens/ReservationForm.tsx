import { useState, type FormEvent, type ReactNode } from 'react';
import type { ProposalId, Reservation, RestrictionId, ServiceId } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { addDays, fechaLarga, isMonday, isValidISO, todayISO } from '../lib/dates';
import { MAX_COVERS, RESTRICTIONS, SERVICE_ORDER, SERVICES, proposalById, serviceWithArticle } from '../lib/catalog';
import { blockOf, defaultProposal, findDuplicate, pctLabel, proposalsFor, resourceOptions, serviceState, serviceUsage, timeSlots } from '../lib/capacity';
import { asientos, personas, pesos } from '../lib/format';
import { codeFor } from '../data/seed';
import { StorageBanner } from '../components/StorageBanner';
import { Banner, Button, Chevron, EmptyState, IconButton, Segmented } from '../components/ui';
import type { NewReservationPrefill } from './DayScreen';

interface Draft {
  date: string;
  service: ServiceId;
  covers: number;
  resourceId: string | null;
  proposalId: ProposalId | null;
  time: string | null;
  name: string;
  email: string;
  restrictions: RestrictionId[];
  notes: string;
  status: 'pendiente' | 'confirmada';
}

const input =
  'w-full min-h-[46px] rounded-lg border-[1.5px] border-linea-2 bg-blanco px-3 py-2.5 text-base font-semibold text-carbon focus:border-monte focus:outline-none focus:ring-[3px] focus:ring-monte/20 aria-[invalid=true]:border-aji';
const labelCls = 'flex flex-col gap-[5px] text-[13px] font-extrabold text-suave';
const fieldset = 'mt-[18px] flex min-w-0 flex-col gap-2.5 border-t border-linea-2 pt-3.5';
const legend = 'mb-2 p-0 font-display text-[21px] text-monte float-left w-full';

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="m-0 text-[13px] font-bold text-aji">{children}</p>;
}

/** Pantalla 3 · Formulario de nueva reserva o edición. */
export function ReservationForm({ editing, prefill }: { editing?: Reservation; prefill?: NewReservationPrefill }) {
  const { state, commit, notify } = useAgenda();
  const T = todayISO();

  const [d, setD] = useState<Draft>(() => {
    if (editing)
      return {
        date: editing.date, service: editing.service, covers: editing.covers, resourceId: editing.resourceId,
        proposalId: editing.proposalId, time: editing.time, name: editing.name, email: editing.email,
        restrictions: [...editing.restrictions], notes: editing.notes,
        status: editing.status === 'confirmada' ? 'confirmada' : 'pendiente',
      };
    let date = prefill?.date ?? T;
    if (!prefill?.date) {
      while (SERVICE_ORDER.every((s) => serviceState(state, date, s) !== 'abierto')) date = addDays(date, 1);
    }
    const r = state.resources.find((r) => r.id === prefill?.resourceId);
    return {
      date, service: prefill?.service ?? 'almuerzo',
      covers: r && r.mode === 'whole' ? r.minPeople || r.capacity : 2,
      resourceId: prefill?.resourceId ?? null, proposalId: null, time: null,
      name: '', email: '', restrictions: [], notes: '', status: 'pendiente',
    };
  });
  const [errors, setErrors] = useState<{ name?: string; email?: string; resource?: string; form?: string }>({});
  const set = (patch: Partial<Draft>) => setD((prev) => ({ ...prev, ...patch }));

  const excl = editing?.id;
  const validDate = isValidISO(d.date);

  // ¿Se puede reservar en esa fecha y servicio?
  let block = '';
  if (!validDate) block = 'Elegí una fecha.';
  else if (!editing && d.date < T) block = 'Esa fecha ya pasó. Elegí hoy o un día que viene.';
  else if (isMonday(d.date)) block = 'Los lunes el comedor está cerrado. No se toman reservas.';
  else if (serviceState(state, d.date, d.service) === 'bloqueado') {
    const b = blockOf(state, d.date, d.service);
    block = `Ese ${SERVICES[d.service].name.toLowerCase()} está bloqueado${b?.reason ? ` (${b.reason})` : ''}. No se toman reservas nuevas.`;
  }

  // Valores efectivos: se descartan solos si dejan de ser válidos.
  const opts = block ? { ok: [], hidden: 0 } : resourceOptions(state, d.date, d.service, d.covers, excl);
  const resourceId = d.resourceId && opts.ok.some((o) => o.resource.id === d.resourceId) ? d.resourceId : null;
  const resource = state.resources.find((r) => r.id === resourceId);
  const props = proposalsFor(d.service, resourceId);
  const fallbackProp = props.find((p) => p.id === defaultProposal(d.service, resourceId))?.id ?? props[0]?.id ?? null;
  const proposalId = d.proposalId && props.some((p) => p.id === d.proposalId) ? d.proposalId : fallbackProp;
  const proposal = proposalById(proposalId);
  const slots = timeSlots(d.service, proposalId);
  const time = d.time && slots.includes(d.time) ? d.time : slots[0];

  const setCovers = (n: number) => set({ covers: Math.max(1, Math.min(MAX_COVERS, Number.isFinite(n) ? n : 1)) });
  const toggleRestriction = (id: RestrictionId) =>
    set({ restrictions: d.restrictions.includes(id) ? d.restrictions.filter((r) => r !== id) : [...d.restrictions, id] });

  function submit(e: FormEvent) {
    e.preventDefault();
    const name = d.name.trim();
    const email = d.email.trim();
    const next: typeof errors = {};
    if (!name) next.name = 'Poné un nombre para la reserva.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = 'Revisá el correo: tiene que ser del tipo nombre@example.com.';
    if (!resourceId) next.resource = 'Elegí dónde se sientan.';
    if (Object.keys(next).length) {
      setErrors({ ...next, form: 'Faltan datos. Revisá lo marcado en rojo.' });
      return;
    }
    if (block) {
      setErrors({ form: 'Ese servicio no acepta reservas.' });
      return;
    }
    const dup = findDuplicate(state, email, d.date, d.service, excl);
    if (dup) {
      setErrors({ form: `Ya hay una reserva activa con ese correo para ese servicio (${dup.code}, ${dup.name}).` });
      return;
    }
    const now = new Date().toISOString();
    const fields = {
      date: d.date, service: d.service, resourceId: resourceId!, covers: d.covers, time: time!, proposalId: proposalId!,
      name, email, restrictions: [...d.restrictions], notes: d.notes.trim(), updatedAt: now,
    };
    let id = editing?.id ?? '';
    let code = editing?.code ?? '';
    const ok = commit(
      (draft) => {
        // Se vuelve a chequear el cupo contra lo guardado, justo antes de escribir.
        const still = resourceOptions(draft, d.date, d.service, d.covers, excl).ok.some((o) => o.resource.id === resourceId);
        if (!still) throw new Error('ocupado');
        if (editing) {
          const x = draft.reservations.find((x) => x.id === editing.id)!;
          Object.assign(x, fields);
          if (x.status === 'pendiente' || x.status === 'confirmada') x.status = d.status;
        } else {
          draft.seq += 1;
          ({ id, code } = codeFor(draft.seq));
          draft.reservations.push({ id, code, status: d.status, createdAt: now, ...fields });
        }
      },
    );
    if (!ok) {
      setErrors({ form: 'No se pudo guardar. No cambió nada: lo que cargaste sigue acá.' });
      return;
    }
    // Recién después de guardar se muestra el éxito.
    notify(editing ? `Cambios guardados · ${code}` : `Reserva guardada · ${code}`);
    navigate('reserva-' + id);
  }

  const back = editing ? `reserva-${editing.id}` : `dia-${d.date}`;

  return (
    <>
      <StorageBanner />
      <div className="mb-1.5 flex items-center gap-3">
        <IconButton label="Volver" onClick={() => navigate(back)}>
          <Chevron dir="l" />
        </IconButton>
        <h1 className="flex-1 text-[32px] leading-[1.05] text-monte">{editing ? 'Editar reserva' : 'Nueva reserva'}</h1>
        {editing && <span className="text-xs font-extrabold tracking-[.12em] text-barro">{editing.code}</span>}
      </div>

      <form id="f" noValidate onSubmit={(e) => { try { submit(e); } catch { e.preventDefault(); setErrors({ form: 'Ese lugar ya no está disponible. Elegí otro.' }); } }}>
        <fieldset className={fieldset}>
          <legend className={legend}>¿Cuándo?</legend>
          <label className={labelCls} htmlFor="f-date">
            Fecha
            <input id="f-date" type="date" className={input} value={d.date} min={editing ? undefined : T} onChange={(e) => set({ date: e.target.value })} />
          </label>
          <div id="f-svc">
            <Segmented
              label="Servicio"
              value={d.service}
              onChange={(s) => set({ service: s, proposalId: null })}
              options={SERVICE_ORDER.map((s) => {
                const stt = validDate ? serviceState(state, d.date, s) : 'abierto';
                const sub = !validDate ? '' : stt === 'cerrado' ? 'cerrado' : stt === 'bloqueado' ? 'bloqueado' : pctLabel(serviceUsage(state, d.date, s, excl).pct);
                return { value: s, label: <>{SERVICES[s].name} <small className="text-xs font-semibold opacity-80 tabular-nums">{sub}</small></> };
              })}
            />
          </div>
          {block && <Banner tone={validDate && isMonday(d.date) ? 'cerrado' : 'bloqueado'} className="mt-1" title={block} />}
        </fieldset>

        {!block && (
          <>
            <fieldset className={fieldset}>
              <legend className={legend}>¿Para cuántos?</legend>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Uno menos" onClick={() => setCovers(d.covers - 1)} className="grid size-[52px] place-items-center rounded-full border-[1.5px] border-monte bg-blanco text-[26px] leading-none text-monte">−</button>
                <input
                  id="f-covers"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={MAX_COVERS}
                  aria-label="Cubiertos"
                  value={d.covers}
                  onChange={(e) => e.target.value !== '' && setCovers(parseInt(e.target.value, 10))}
                  className="w-[78px] border-0 bg-transparent p-0 text-center font-display text-[38px] text-monte tabular-nums"
                />
                <button type="button" aria-label="Uno más" onClick={() => setCovers(d.covers + 1)} className="grid size-[52px] place-items-center rounded-full border-[1.5px] border-monte bg-blanco text-[26px] leading-none text-monte">+</button>
                <span className="font-bold text-suave">{d.covers === 1 ? 'cubierto' : 'cubiertos'}</span>
              </div>
            </fieldset>

            <fieldset className={fieldset}>
              <legend className={legend}>¿Dónde?</legend>
              <div id="f-res" role="radiogroup" aria-label="Lugar" className="flex flex-col gap-2">
                {opts.ok.length ? (
                  <>
                    {opts.ok.map(({ resource: r, free }) => {
                      const sub = r.mode === 'seat' ? `${r.sector} · quedan ${free} de ${r.capacity} asientos` : `${r.sector} · ${r.minPeople ? `hasta ${r.capacity}, mínimo ${r.minPeople}` : `Mesa para ${r.capacity}`}`;
                      const tag =
                        r.mode === 'seat' ? (
                          <span className="whitespace-nowrap rounded-full bg-barro/16 px-2 py-[3px] text-[11.5px] font-extrabold text-[#8E4422]">Toma {asientos(d.covers)}</span>
                        ) : (
                          <span className="whitespace-nowrap rounded-full bg-monte/10 px-2 py-[3px] text-[11.5px] font-extrabold">{d.covers < r.capacity ? 'Ocupa la mesa entera' : 'Justo'}</span>
                        );
                      return (
                        <OptionCard key={r.id} id={r.id} checked={resourceId === r.id} onSelect={() => { set({ resourceId: r.id }); setErrors((e) => ({ ...e, resource: undefined })); }} title={r.name} sub={sub} tag={tag} />
                      );
                    })}
                    {opts.hidden > 0 && (
                      <p className="m-0 mt-0.5 text-[12.5px] text-suave">
                        {opts.hidden === 1 ? '1 lugar no aparece porque ya está tomado o no es' : `${opts.hidden} lugares no aparecen porque ya están tomados o no son`} para {personas(d.covers)}.
                      </p>
                    )}
                  </>
                ) : (
                  <EmptyState title="No queda lugar">
                    Para {personas(d.covers)} en {serviceWithArticle(d.service)} no hay mesa libre. Probá el otro servicio, otro día o menos cubiertos.
                  </EmptyState>
                )}
              </div>
              <ErrorText>{errors.resource}</ErrorText>
            </fieldset>

            <fieldset className={fieldset}>
              <legend className={legend}>Propuesta y hora</legend>
              <div role="radiogroup" aria-label="Propuesta" className="flex flex-col gap-2">
                {props.map((p) => (
                  <OptionCard
                    key={p.id}
                    id={p.id}
                    checked={proposalId === p.id}
                    onSelect={() => set({ proposalId: p.id })}
                    title={p.name}
                    sub={`${p.detail} · ${p.minutes} min`}
                    tag={<span className="whitespace-nowrap rounded-full bg-monte/10 px-2 py-[3px] text-[11.5px] font-extrabold">{p.price ? pesos(p.price) : 'Variable'}</span>}
                  />
                ))}
              </div>
              <div role="group" aria-label="Hora" className="flex flex-wrap gap-1.5">
                {slots.map((t) => (
                  <button
                    key={t}
                    type="button"
                    data-ftime={t}
                    aria-pressed={time === t}
                    onClick={() => set({ time: t })}
                    className={`min-h-[42px] min-w-16 rounded-lg border-[1.5px] px-2.5 py-2 font-extrabold tabular-nums ${time === t ? 'border-monte bg-monte text-crema' : 'border-linea-2 bg-blanco text-monte'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <fieldset className={fieldset}>
          <legend className={legend}>¿A nombre de quién?</legend>
          <label className={labelCls} htmlFor="f-name">
            Nombre
            <input id="f-name" className={input} autoComplete="off" placeholder="Ej.: Flor Agüero" value={d.name} aria-invalid={!!errors.name} onChange={(e) => set({ name: e.target.value })} />
          </label>
          <ErrorText>{errors.name}</ErrorText>
          <label className={labelCls} htmlFor="f-email">
            Correo
            <input id="f-email" type="email" inputMode="email" className={input} autoComplete="off" placeholder="nombre@example.com" value={d.email} aria-invalid={!!errors.email} onChange={(e) => set({ email: e.target.value })} />
          </label>
          <ErrorText>{errors.email}</ErrorText>
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>Restricciones</legend>
          <div className="flex flex-wrap gap-2">
            {RESTRICTIONS.map((r) => {
              const on = d.restrictions.includes(r.id);
              return (
                <button key={r.id} type="button" aria-pressed={on} onClick={() => toggleRestriction(r.id)} className={`min-h-[42px] rounded-full border-[1.5px] px-3.5 py-2 font-bold ${on ? 'border-barro bg-barro text-blanco' : 'border-linea-2 bg-blanco text-monte'}`}>
                  {r.name}
                </button>
              );
            })}
          </div>
          <label className={labelCls} htmlFor="f-notes">
            Notas
            <textarea id="f-notes" className={`${input} min-h-[76px] resize-y`} placeholder="Ej.: traen torta, llegan con cochecito" value={d.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
        </fieldset>

        <fieldset className={fieldset}>
          <legend className={legend}>Estado</legend>
          <Segmented
            label="Estado"
            value={d.status}
            onChange={(s) => set({ status: s })}
            options={[
              { value: 'pendiente', label: 'Pendiente' },
              { value: 'confirmada', label: 'Confirmada' },
            ]}
          />
        </fieldset>

        <div className="mt-[22px] flex flex-col gap-1 rounded-[10px] bg-monte px-4 py-3.5 text-crema">
          {block ? (
            <>
              <b className="font-display text-[22px] font-normal">Sin lugar para reservar</b>
              <span className="text-[13.5px] opacity-85">{block}</span>
            </>
          ) : !resource ? (
            <>
              <b className="font-display text-[22px] font-normal">{personas(d.covers)}</b>
              <span className="text-[13.5px] opacity-85">{fechaLarga(d.date)} · {SERVICES[d.service].name}. Elegí dónde se sientan.</span>
            </>
          ) : (
            <>
              <b className="font-display text-[22px] font-normal">{fechaLarga(d.date)}, {time}</b>
              <span className="text-[13.5px] opacity-85">
                {resource.name} · {resource.mode === 'seat' ? `toma ${asientos(d.covers)}` : d.covers < resource.capacity ? `ocupa la mesa entera (${resource.capacity})` : `mesa para ${resource.capacity}`}
              </span>
              <span className="text-[13.5px] opacity-85">
                {proposal?.name}
                {proposal?.price ? ` · ${pesos(proposal.price)} por persona, unos ${pesos(proposal.price * d.covers)} en total` : ' · precio según carta'}
              </span>
            </>
          )}
        </div>

        <div className="sticky bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-10 mt-3.5 flex flex-col gap-2 bg-gradient-to-b from-crema/0 via-crema via-30% to-crema py-2.5">
          <ErrorText>{errors.form}</ErrorText>
          <Button type="submit" id="f-submit" variant="barro" wide disabled={!!block || !opts.ok.length}>
            {editing ? 'Guardar cambios' : 'Guardar reserva'}
          </Button>
        </div>
      </form>
    </>
  );
}

function OptionCard({ id, checked, onSelect, title, sub, tag }: { id: string; checked: boolean; onSelect: () => void; title: string; sub: string; tag: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-opt={id}
      onClick={onSelect}
      className={`grid w-full grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border-[1.5px] px-3.5 py-[11px] text-left text-monte ${checked ? 'border-monte bg-papel shadow-[0_0_0_1.5px_var(--color-monte)]' : 'border-linea-2 bg-blanco'}`}
    >
      <span className="grid size-[22px] place-items-center rounded-full border-2 border-monte">{checked && <span className="size-2.5 rounded-full bg-barro" />}</span>
      <span className="min-w-0">
        <strong className="block font-extrabold">{title}</strong>
        <small className="block text-[13px] text-suave">{sub}</small>
      </span>
      {tag}
    </button>
  );
}
