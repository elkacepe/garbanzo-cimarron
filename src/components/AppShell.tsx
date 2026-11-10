import type { ReactNode } from 'react';
import { useAgenda } from '../state/AgendaContext';
import { navigate } from '../state/router';
import { fechaCorta, todayISO } from '../lib/dates';

export type Tab = 'mes' | 'hoy' | 'nueva' | 'reservas' | 'panel' | null;

export function AppShell({ tab, onNew, month, children }: { tab: Tab; onNew: () => void; month: string; children: ReactNode }) {
  const { toast } = useAgenda();
  return (
    <>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 border-b border-linea-2 bg-crema">
        <div className="gutter mx-auto flex max-w-[640px] items-center justify-between gap-3 py-2.5">
          <div className="flex flex-col leading-none">
            <small className="text-[10px] font-extrabold uppercase tracking-[.22em] text-barro">Comedor</small>
            <b className="mt-[3px] font-display text-[21px] font-normal text-monte">Garbanzo Cimarrón</b>
          </div>
          <span className="text-xs font-bold text-suave">{fechaCorta(todayISO())}</span>
        </div>
      </header>

      <main className="gutter mx-auto max-w-[640px] pt-4 pb-[calc(104px+env(safe-area-inset-bottom,0px))]">{children}</main>

      <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-20 bg-monte pb-[env(safe-area-inset-bottom,0px)]">
        {/* Cinco pestañas iguales; «+ Nueva» al centro, destacada en terracota. Se llama así y no «Reservar» para no confundirse con «Reservas». */}
        <div className="gutter mx-auto grid max-w-[640px] grid-cols-5 gap-1 py-2">
          <NavButton current={tab === 'mes'} onClick={() => navigate('mes-' + month)} label="Mes" icon={<path d="M3 10h18M8 3v4M16 3v4M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />} />
          <NavButton current={tab === 'hoy'} onClick={() => navigate('dia-' + todayISO())} label="Hoy" icon={<><circle cx="12" cy="12" r="8" /><path d="M12 8v4l3 2" /></>} />
          <button
            type="button"
            onClick={onNew}
            aria-current={tab === 'nueva' ? 'page' : undefined}
            aria-label="Nueva reserva"
            className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg bg-barro px-0.5 py-1.5 text-[11px] font-extrabold tracking-[.04em] text-blanco ${tab === 'nueva' ? 'shadow-[inset_0_0_0_2px_var(--color-crema)]' : ''}`}
          >
            <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            Nueva
          </button>
          <NavButton current={tab === 'reservas'} onClick={() => navigate('reservas')} label="Reservas" icon={<><path d="M8 6h12M8 12h12M8 18h12" /><circle cx="4" cy="6" r="1" /><circle cx="4" cy="12" r="1" /><circle cx="4" cy="18" r="1" /></>} />
          <NavButton current={tab === 'panel'} onClick={() => navigate('panel')} label="Panel" icon={<><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} />
        </div>
      </nav>

      <div aria-live="polite" role="status">
        {toast && (
          <div
            key={toast.id}
            className={`fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] left-1/2 z-40 w-max max-w-[min(92vw,480px)] -translate-x-1/2 rounded-[10px] px-4 py-3 text-sm font-bold shadow-[0_6px_20px_rgb(42_42_34/.25)] ${toast.error ? 'bg-aji text-blanco' : 'bg-carbon text-crema'}`}
          >
            {toast.message}
          </div>
        )}
      </div>
    </>
  );
}

function NavButton({ current, onClick, label, icon }: { current: boolean; onClick: () => void; label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 py-1.5 text-[11px] font-bold tracking-[.04em] ${current ? 'bg-crema/10 text-crema' : 'text-crema/70'}`}
    >
      <svg viewBox="0 0 24 24" className="size-[22px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">{icon}</svg>
      {label}
    </button>
  );
}
