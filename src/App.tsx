import { useState } from 'react';
import type { ServiceId } from './types';
import { useAgenda } from './state/AgendaContext';
import { navigate, useRoute } from './state/router';
import { monthOf, todayISO } from './lib/dates';
import { AppShell, type Tab } from './components/AppShell';
import { EmptyState, Button } from './components/ui';
import { MonthScreen } from './screens/MonthScreen';
import { DayScreen, type NewReservationPrefill } from './screens/DayScreen';
import { ReservationForm } from './screens/ReservationForm';
import { ReservationDetail } from './screens/ReservationDetail';
import { PanelScreen } from './screens/PanelScreen';

export default function App() {
  const route = useRoute();
  const { state } = useAgenda();
  const [month, setMonth] = useState(monthOf(todayISO()));
  // Último día abierto: se marca en la grilla al volver al mes.
  const [lastDay, setLastDay] = useState<string | undefined>();
  // Servicio elegido por día; si no hay, el último que se miró.
  const [dayTab, setDayTab] = useState<Record<string, ServiceId>>({});
  const [lastService, setLastService] = useState<ServiceId>('almuerzo');
  // Datos con los que arranca una reserva nueva; `formKey` reinicia el formulario.
  const [prefill, setPrefill] = useState<NewReservationPrefill | undefined>();
  const [formKey, setFormKey] = useState(0);

  const startNew = (pre?: NewReservationPrefill) => {
    setPrefill(pre);
    setFormKey((k) => k + 1);
    if (pre) setLastService(pre.service);
    navigate('nueva');
  };

  let tab: Tab = null;
  let screen;
  switch (route.name) {
    case 'mes': {
      const m = route.month ?? month;
      if (m !== month) setMonth(m);
      tab = 'mes';
      screen = <MonthScreen month={m} highlight={lastDay} />;
      break;
    }
    case 'dia': {
      // La pestaña «Mes» y el botón de calendario llevan al mes de este día.
      if (route.date !== lastDay) setLastDay(route.date);
      if (monthOf(route.date) !== month) setMonth(monthOf(route.date));
      tab = route.date === todayISO() ? 'hoy' : 'mes';
      screen = (
        <DayScreen
          date={route.date}
          service={dayTab[route.date] ?? lastService}
          onService={(s) => {
            setDayTab((t) => ({ ...t, [route.date]: s }));
            setLastService(s);
          }}
          onNew={startNew}
        />
      );
      break;
    }
    case 'nueva':
      tab = 'nueva';
      screen = <ReservationForm key={formKey} prefill={prefill} />;
      break;
    case 'editar':
    case 'reserva': {
      const x = state.reservations.find((y) => y.id === route.id);
      if (!x) {
        screen = (
          <div className="mt-6">
            <EmptyState title="No encontramos esa reserva" action={<Button onClick={() => navigate('mes-' + month)}>Ir al mes</Button>}>
              Puede que se haya borrado al restaurar los datos.
            </EmptyState>
          </div>
        );
      } else if (route.name === 'editar') {
        screen = <ReservationForm key={'edit-' + x.id} editing={x} />;
      } else {
        screen = <ReservationDetail key={x.id + x.status} reservation={x} />;
      }
      break;
    }
    case 'panel':
      tab = 'panel';
      screen = <PanelScreen />;
      break;
  }

  return (
    <AppShell tab={tab} month={month} onNew={() => startNew()}>
      {screen}
    </AppShell>
  );
}
