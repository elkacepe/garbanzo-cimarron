import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { ReservationStatus } from '../types';
import { STATUS } from '../lib/catalog';
import type { Level } from '../lib/capacity';

/* ---------- Botones ---------- */

type Variant = 'outline' | 'solid' | 'barro' | 'aji' | 'ajiSolid';
const VARIANTS: Record<Variant, string> = {
  outline: 'border-monte text-monte bg-transparent',
  solid: 'border-monte bg-monte text-crema',
  barro: 'border-barro bg-barro text-blanco',
  aji: 'border-aji text-aji bg-transparent',
  ajiSolid: 'border-aji bg-aji text-blanco',
};

export function Button({
  variant = 'outline',
  size = 'md',
  wide,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'sm'; wide?: boolean }) {
  const sz = size === 'sm' ? 'min-h-9 px-3.5 py-1.5 text-[13px]' : 'min-h-11 px-[18px] py-2.5 text-sm';
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] font-extrabold disabled:cursor-not-allowed disabled:opacity-45 ${sz} ${VARIANTS[variant]} ${wide ? 'w-full' : ''} ${className}`}
      {...rest}
    />
  );
}

export function IconButton({ label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-11 flex-none place-items-center rounded-full border-[1.5px] border-linea-2 bg-papel text-monte"
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="font-extrabold text-barro underline underline-offset-[3px]" {...props} />
  );
}

/* ---------- Íconos ---------- */

export function Chevron({ dir }: { dir: 'l' | 'r' }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'l' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

/* ---------- Puntos de ocupación ---------- */

export type DotKind = 'libre' | Level | 'cerrado' | 'bloqueado';
const DOTS: Record<DotKind, string> = {
  libre: 'shadow-[inset_0_0_0_2px_var(--color-libre)]',
  verde: 'bg-libre',
  amarillo: 'bg-maiz',
  rojo: 'bg-aji',
  cerrado: 'bg-cerrado',
  bloqueado: 'rayado',
};
export function Dot({ kind, className = 'size-[11px] sm:size-[13px]' }: { kind: DotKind; className?: string }) {
  return <i aria-hidden="true" className={`inline-block flex-none rounded-full ${className} ${DOTS[kind]}`} />;
}

/* ---------- Pills ---------- */

const STATUS_PILL: Record<ReservationStatus, string> = {
  pendiente: 'bg-maiz text-carbon',
  confirmada: 'bg-monte text-crema',
  sentada: 'bg-barro text-blanco',
  finalizada: 'shadow-[inset_0_0_0_1.5px_var(--color-monte)] text-monte',
  cancelada: 'shadow-[inset_0_0_0_1.5px_var(--color-suave)] text-suave line-through',
  novino: 'shadow-[inset_0_0_0_1.5px_var(--color-aji)] text-aji',
};
const PILL = 'inline-flex items-center whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11.5px] font-extrabold leading-[1.4] tracking-[.03em]';

export function StatusPill({ status }: { status: ReservationStatus }) {
  return <span className={`${PILL} ${STATUS_PILL[status]}`}>{STATUS[status].name}</span>;
}

const LEVEL_PILL: Record<Level | 'bloqueado', string> = {
  verde: 'bg-libre text-blanco',
  amarillo: 'bg-maiz text-carbon',
  rojo: 'bg-aji text-blanco',
  bloqueado: 'bg-carbon text-crema',
};
export function LevelPill({ level, children }: { level: Level | 'bloqueado'; children: ReactNode }) {
  return <span className={`${PILL} ${LEVEL_PILL[level]}`}>{children}</span>;
}

/* ---------- Avisos y vacíos ---------- */

type BannerTone = 'bloqueado' | 'cerrado' | 'error' | 'info';
const BANNERS: Record<BannerTone, string> = {
  bloqueado: 'rayado-suave border-[1.5px] border-carbon text-carbon',
  cerrado: 'bg-lunes border-[1.5px] border-dashed border-linea-2',
  error: 'bg-alerta border-[1.5px] border-aji text-aji',
  info: 'bg-papel border border-linea-2',
};
export function Banner({ tone, title, children, className = 'my-3' }: { tone: BannerTone; title?: ReactNode; children?: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-[10px] px-4 py-3.5 ${BANNERS[tone]} ${className}`}>
      {title && <strong className="font-extrabold">{title}</strong>}
      {children && <span>{children}</span>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-linea-2 px-4 py-7 text-center">
      <h3 className="text-2xl text-monte">{title}</h3>
      <p className="m-0 max-w-[34ch] text-suave">{children}</p>
      {action}
    </div>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`m-0 text-[11px] font-extrabold uppercase tracking-[.16em] text-barro ${className}`}>{children}</p>;
}

/**
 * Título de sección. `count` muestra un contador pegado al título, con el mismo
 * estilo que la etiqueta «Pendiente» (amarillo, bold, 11,5 px). `aside` va a la derecha.
 */
export function SectionTitle({ title, aside, count, countLabel }: { title: string; aside?: ReactNode; count?: number; countLabel?: string }) {
  return (
    <div className="mt-7 mb-2.5 flex items-baseline justify-between gap-2">
      <div className="flex items-center gap-2">
        <h2 className="text-2xl text-monte">{title}</h2>
        {count !== undefined && count > 0 && (
          <span
            aria-label={countLabel}
            className="grid h-[22px] min-w-[22px] place-items-center rounded-full bg-maiz px-1.5 text-[11.5px] font-extrabold leading-none text-carbon tabular-nums"
          >
            {count}
          </span>
        )}
      </div>
      {aside && <span className="text-suave tabular-nums">{aside}</span>}
    </div>
  );
}

/** Segmentado tipo píldora. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="grid auto-cols-fr grid-flow-col overflow-hidden rounded-full border-[1.5px] border-monte">
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex min-h-[46px] items-center justify-center gap-1.5 px-1.5 py-2 text-sm font-extrabold ${i ? 'border-l-[1.5px] border-monte' : ''} ${value === o.value ? 'bg-monte text-crema' : 'bg-blanco text-monte'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
