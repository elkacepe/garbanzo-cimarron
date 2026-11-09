import { useAgenda } from '../state/AgendaContext';
import { Banner } from './ui';

/** Aviso cuando el navegador no deja guardar o los datos guardados están rotos. */
export function StorageBanner() {
  const { storageIssue } = useAgenda();
  if (storageIssue === 'corrupt')
    return (
      <Banner tone="error" title="No pudimos leer los datos guardados.">
        No se borró nada. Desde el panel podés restaurar los datos de prueba.
      </Banner>
    );
  if (storageIssue === 'unavailable')
    return (
      <Banner tone="error" title="Este navegador no deja guardar.">
        Podés mirar la agenda, pero los cambios no se van a guardar.
      </Banner>
    );
  return null;
}
