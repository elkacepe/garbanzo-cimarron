import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AgendaState } from '../types';
import { loadAgenda, saveAgenda } from '../data/storage';

export type StorageIssue = 'none' | 'unavailable' | 'corrupt';

interface Toast {
  id: number;
  message: string;
  error: boolean;
}

interface AgendaContextValue {
  state: AgendaState;
  storageIssue: StorageIssue;
  /**
   * Aplica `mutate` sobre una copia, la guarda y recién entonces la muestra.
   * Si no se pudo guardar, devuelve false y el estado en pantalla queda igual.
   */
  commit: (mutate: (draft: AgendaState) => void, okMessage?: string) => boolean;
  /** Reemplaza todo el estado (restaurar datos de prueba). */
  replace: (next: AgendaState, okMessage?: string) => boolean;
  toast: Toast | null;
  notify: (message: string, error?: boolean) => void;
}

const AgendaContext = createContext<AgendaContextValue | null>(null);

const SAVE_ERROR = 'No se pudo guardar. Lo que cargaste sigue acá: revisá el espacio del navegador y probá de nuevo.';

export function AgendaProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => loadAgenda());
  const [state, setState] = useState<AgendaState>(initial.state);
  const [storageIssue, setStorageIssue] = useState<StorageIssue>(
    initial.status === 'unavailable' || (initial.status === 'seeded' && !initial.saved)
      ? 'unavailable'
      : initial.status === 'corrupt'
        ? 'corrupt'
        : 'none',
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const notify = useCallback((message: string, error = false) => {
    window.clearTimeout(timer.current);
    setToast({ id: Date.now(), message, error });
    timer.current = window.setTimeout(() => setToast(null), error ? 6500 : 3200);
  }, []);

  const persistAndShow = useCallback(
    (next: AgendaState, okMessage?: string) => {
      if (!saveAgenda(next)) {
        notify(SAVE_ERROR, true);
        return false;
      }
      stateRef.current = next;
      setState(next);
      if (okMessage) notify(okMessage);
      return true;
    },
    [notify],
  );

  const commit = useCallback(
    (mutate: (draft: AgendaState) => void, okMessage?: string) => {
      const next = structuredClone(stateRef.current);
      mutate(next);
      return persistAndShow(next, okMessage);
    },
    [persistAndShow],
  );

  const replace = useCallback(
    (next: AgendaState, okMessage?: string) => {
      const ok = persistAndShow(next, okMessage);
      if (ok) setStorageIssue('none');
      return ok;
    },
    [persistAndShow],
  );

  const value = useMemo(
    () => ({ state, storageIssue, commit, replace, toast, notify }),
    [state, storageIssue, commit, replace, toast, notify],
  );
  return <AgendaContext.Provider value={value}>{children}</AgendaContext.Provider>;
}

export function useAgenda() {
  const ctx = useContext(AgendaContext);
  if (!ctx) throw new Error('useAgenda fuera de AgendaProvider');
  return ctx;
}
