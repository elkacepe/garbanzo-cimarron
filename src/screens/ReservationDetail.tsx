import { useState } from 'react';
import type { Reservation, ReservationStatus } from '../types';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { fechaLarga } from '../lib/dates';
import { SERVICES, proposalById, restrictionName, serviceWithArticle } from '../lib/catalog';
import { asientos, personas, pesos } from '../lib/format';
import { StorageBanner } from '../components/StorageBanner';
import { Banner, Button, Chevron, Eyebrow, IconButton, LinkButton, StatusPill } from '../components/ui';

const MESSAGES: Record<ReservationStatus, string> = {
  confirmada: 'Reserva confirmada',
  pendiente: 'Volvió a pendiente',
  sentada: 'Mesa sentada',
  finalizada: 'Mesa finalizada',
  cancelada: 'Reserva cancelada · queda libre',
  novino: 'Marcada «No vino» · queda libre',
};

/** Pantalla 4 · Ficha de la reserva y cambios de estado. */
export function ReservationDetail({ reservation: x }: { reservation: Reservation }) {
  const { state, commit } = useAgenda();
  const [confirming, setConfirming] = useState<'cancelada' | 'novino' | null>(null);
  const r = state.resources.find((r) => r.id === x.resourceId);
  const p = proposalById(x.proposalId);
  const st = x.status;

  const setStatus = (to: ReservationStatus) => {
    setConfirming(null);
    commit((draft) => {
      const target = draft.reservations.find((y) => y.id === x.id);
      if (target) {
        target.status = to;
        target.updatedAt = new Date().toISOString();
      }
    }, MESSAGES[to]);
  };

  const where = r ? (r.mode === 'seat' ? `${r.name} · ${asientos(x.covers)}` : `${r.name} · Mesa para ${r.capacity}`) : 'Lugar eliminado';
  const freed = r ? (r.mode === 'seat' ? `Los ${asientos(x.covers)} del mesón vuelven a quedar libres enseguida.` : `${r.name} vuelve a quedar libre enseguida.`) : '';

  let actions;
  if (confirming) {
    actions = (
      <div role="alertdialog" aria-label="Confirmar" className="flex flex-col gap-2.5 rounded-[10px] border-[1.5px] border-aji bg-alerta p-3.5">
        <p className="m-0 font-bold text-carbon">
          ¿Seguro que querés {confirming === 'cancelada' ? 'cancelar' : 'marcar «No vino» en'} la reserva de {x.name}? {freed}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="ajiSolid" data-confirm-ok onClick={() => setStatus(confirming)}>
            Sí, {confirming === 'cancelada' ? 'cancelar' : 'no vino'}
          </Button>
          <Button onClick={() => setConfirming(null)}>No, volver</Button>
        </div>
      </div>
    );
  } else if (st === 'pendiente' || st === 'confirmada') {
    actions = (
      <>
        {st === 'pendiente' ? (
          <Button variant="solid" wide onClick={() => setStatus('confirmada')}>Confirmar reserva</Button>
        ) : (
          <Button variant="solid" wide onClick={() => setStatus('sentada')}>Llegó: sentar</Button>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <Button onClick={() => navigate('editar-' + x.id)}>Editar</Button>
          {st === 'pendiente' ? (
            <Button onClick={() => setStatus('sentada')}>Llegó: sentar</Button>
          ) : (
            <Button onClick={() => setStatus('pendiente')}>Volver a pendiente</Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="aji" data-status-to="cancelada" onClick={() => setConfirming('cancelada')}>Cancelar</Button>
          <Button variant="aji" data-status-to="novino" onClick={() => setConfirming('novino')}>No vino</Button>
        </div>
      </>
    );
  } else if (st === 'sentada') {
    actions = <Button variant="solid" wide onClick={() => setStatus('finalizada')}>Finalizar mesa</Button>;
  } else {
    actions = (
      <Banner tone="info" className="m-0">
        {st === 'finalizada' ? 'La mesa ya se cerró.' : st === 'cancelada' ? 'Reserva cancelada: el lugar ya quedó libre.' : 'Marcada como «No vino»: el lugar ya quedó libre.'}
      </Banner>
    );
  }

  const fact = 'min-w-0 border-b border-linea px-4 py-3';
  const dt = 'text-[11px] font-extrabold uppercase tracking-[.12em] text-suave';
  const dd = 'mt-[3px] ml-0 font-bold [overflow-wrap:anywhere]';

  return (
    <>
      <StorageBanner />
      <div className="mb-1.5 flex items-center gap-3">
        <IconButton label="Volver al día" onClick={() => navigate('dia-' + x.date)}>
          <Chevron dir="l" />
        </IconButton>
        <Eyebrow className="flex-1">{fechaLarga(x.date)}</Eyebrow>
      </div>

      <article className="mt-3 overflow-hidden rounded-[10px] border-[1.5px] border-monte bg-papel">
        <div className="flex flex-col gap-2 border-b border-linea-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-extrabold tracking-[.12em] text-barro">{x.code}</span>
            <StatusPill status={st} />
          </div>
          <h1 className="text-[30px] leading-[1.05] text-monte [overflow-wrap:anywhere]">{x.name}</h1>
        </div>
        <dl className="m-0 grid grid-cols-2">
          <div className={`${fact} border-r`}><dt className={dt}>Servicio</dt><dd className={`${dd} tabular-nums`}>{SERVICES[x.service].name} · {x.time}</dd></div>
          <div className={fact}><dt className={dt}>Cubiertos</dt><dd className={`${dd} tabular-nums`}>{personas(x.covers)}</dd></div>
          <div className={`${fact} col-span-2`}>
            <dt className={dt}>Lugar</dt>
            <dd className={dd}>
              {where}
              {r && r.mode === 'whole' && x.covers < r.capacity && <span className="text-suave"> (ocupa la mesa entera)</span>}
            </dd>
          </div>
          <div className={`${fact} col-span-2`}>
            <dt className={dt}>Propuesta</dt>
            <dd className={dd}>{p ? `${p.name} · ${p.minutes} min · ${p.price ? `${pesos(p.price)} por persona` : 'precio variable'}` : '—'}</dd>
          </div>
          <div className={`${fact} border-r`}><dt className={dt}>Restricciones</dt><dd className={dd}>{x.restrictions.length ? x.restrictions.map(restrictionName).join(', ') : 'Ninguna'}</dd></div>
          <div className={fact}><dt className={dt}>Correo</dt><dd className={dd}>{x.email}</dd></div>
          {x.notes && <div className={`${fact} col-span-2 border-b-0`}><dt className={dt}>Notas</dt><dd className={dd}>{x.notes}</dd></div>}
        </dl>
      </article>

      <div className="mt-[18px] flex flex-col gap-2.5">{actions}</div>
      <div className="mt-4">
        <LinkButton onClick={() => navigate('dia-' + x.date)}>Ver {serviceWithArticle(x.service)} de ese día</LinkButton>
      </div>
    </>
  );
}
